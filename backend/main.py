"""Main FastAPI application for real-time detection service."""
import asyncio
import time
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from logger import setup_logger
from services.detection_service import detection_service
from services.websocket_manager import connection_manager
from services.privacy_filter import privacy_filter_service
from services.crowd_intelligence import crowd_intelligence_service, FeedbackType

logger = setup_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting detection service...")
    logger.info(f"Environment: {settings.env}")
    logger.info(f"Model: {settings.model_path_absolute}")
    
    try:
        await detection_service.initialize()
        logger.info("Detection service initialized successfully")
        logger.info(f"Privacy features: Face blur={settings.enable_face_blur}, Plate blur={settings.enable_plate_blur}")
        logger.info(f"Encryption enabled: {settings.encrypt_metadata}")
    except Exception as e:
        logger.error(f"Failed to initialize: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    await connection_manager.cleanup()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Spottr Detection API",
    description="Real-time road hazard detection using YOLOv8",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Spottr Detection API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        health = await detection_service.health_check()
        
        if health['status'] == 'healthy':
            return JSONResponse(
                status_code=200,
                content={
                    "status": "healthy",
                    "device": health['device'],
                    "connections": len(connection_manager.active_connections)
                }
            )
        else:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "reason": health.get('reason', 'Unknown error')
                }
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy",
                "reason": str(e)
            }
        )


@app.get("/model/info")
async def model_info():
    """Get model information."""
    try:
        info = detection_service.get_model_info()
        return info
    except Exception as e:
        logger.error(f"Failed to get model info: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/connections/stats")
async def connection_stats():
    """Get WebSocket connection statistics."""
    return connection_manager.get_stats()


# ==================== Crowd Intelligence API ====================

@app.post("/hazards")
async def report_hazard(
    class_name: str,
    confidence: float,
    latitude: float,
    longitude: float,
    bbox: List[float],
    user_id: Optional[str] = None
):
    """
    Report a new hazard detection.
    
    Args:
        class_name: Type of hazard
        confidence: AI confidence score
        latitude: Hazard latitude
        longitude: Hazard longitude
        bbox: Bounding box [x1, y1, x2, y2]
        user_id: Optional user identifier
    """
    try:
        import uuid
        hazard_id = f"hazard_{uuid.uuid4().hex[:12]}"
        
        hazard = await crowd_intelligence_service.add_hazard(
            hazard_id=hazard_id,
            class_name=class_name,
            confidence=confidence,
            location=(latitude, longitude),
            bbox=bbox,
            user_id=user_id
        )
        
        return {
            "success": True,
            "hazard": hazard.to_dict(),
            "message": "Hazard reported successfully"
        }
    except Exception as e:
        logger.error(f"Failed to report hazard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hazards/nearby")
async def get_nearby_hazards(
    latitude: float,
    longitude: float,
    radius: float = 500.0,
    include_resolved: bool = False
):
    """
    Get hazards near a location.
    
    Args:
        latitude: Search center latitude
        longitude: Search center longitude
        radius: Search radius in meters (default 500m)
        include_resolved: Include resolved hazards
    """
    try:
        hazards = await crowd_intelligence_service.get_hazards_nearby(
            location=(latitude, longitude),
            radius_meters=radius,
            include_resolved=include_resolved
        )
        
        return {
            "success": True,
            "count": len(hazards),
            "hazards": [h.to_dict() for h in hazards]
        }
    except Exception as e:
        logger.error(f"Failed to get nearby hazards: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hazards/{hazard_id}")
async def get_hazard_details(hazard_id: str):
    """Get detailed information about a specific hazard."""
    try:
        hazard = await crowd_intelligence_service.get_hazard(hazard_id)
        
        if not hazard:
            raise HTTPException(status_code=404, detail="Hazard not found")
        
        return {
            "success": True,
            "hazard": hazard.to_dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get hazard details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hazards/{hazard_id}/feedback")
async def submit_hazard_feedback(
    hazard_id: str,
    user_id: str,
    feedback_type: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    confidence: float = 1.0,
    comment: Optional[str] = None
):
    """
    Submit user feedback for a hazard.
    
    Args:
        hazard_id: ID of hazard to provide feedback on
        user_id: User providing feedback
        feedback_type: Type of feedback (confirm, deny, update, resolve)
        latitude: User's current latitude
        longitude: User's current longitude
        confidence: User's confidence in feedback (0-1)
        comment: Optional comment
    """
    try:
        # Validate feedback type
        try:
            feedback_enum = FeedbackType[feedback_type.upper()]
        except KeyError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid feedback type. Must be one of: {[f.value for f in FeedbackType]}"
            )
        
        # Get user location if provided
        user_location = None
        if latitude is not None and longitude is not None:
            user_location = (latitude, longitude)
        
        hazard = await crowd_intelligence_service.submit_feedback(
            hazard_id=hazard_id,
            user_id=user_id,
            feedback_type=feedback_enum,
            user_location=user_location,
            confidence=confidence,
            comment=comment
        )
        
        if not hazard:
            raise HTTPException(
                status_code=404,
                detail="Hazard not found or user too far away"
            )
        
        return {
            "success": True,
            "hazard": hazard.to_dict(),
            "message": f"Feedback ({feedback_type}) submitted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/crowd/stats")
async def get_crowd_stats():
    """Get crowd intelligence statistics."""
    try:
        stats = crowd_intelligence_service.get_stats()
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Failed to get crowd stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/users/{user_id}/contribution")
async def get_user_contribution(user_id: str):
    """Get user's contribution statistics."""
    try:
        contribution = crowd_intelligence_service.get_user_contribution(user_id)
        return {
            "success": True,
            "contribution": contribution
        }
    except Exception as e:
        logger.error(f"Failed to get user contribution: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/detect/{client_id}")
async def websocket_detect(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time detection.
    
    Expected message format from client:
    {
        "type": "frame",
        "data": "base64_encoded_image",
        "frame_id": "optional_frame_identifier",
        "timestamp": 1234567890.123
    }
    
    Response format:
    {
        "type": "detection",
        "frame_id": "frame_identifier",
        "detections": [
            {
                "class_id": 0,
                "class_name": "Pothole",
                "confidence": 0.95,
                "bbox": [x1, y1, x2, y2],
                "timestamp": 1234567890.123
            }
        ],
        "detection_count": 1,
        "processing_time_ms": 45.2,
        "annotated_image": "base64_encoded_annotated_image"
    }
    """
    # Connect client
    connected = await connection_manager.connect(websocket, client_id)
    
    if not connected:
        await websocket.close(
            code=1008,
            reason="Connection limit reached"
        )
        return
    
    # Send welcome message
    await connection_manager.send_json(client_id, {
        "type": "connected",
        "client_id": client_id,
        "message": "Connected to detection service",
        "model_info": detection_service.get_model_info()
    })
    
    try:
        while True:
            # Receive message from client
            logger.info(f"⏳ Waiting for message from {client_id}...")
            data = await websocket.receive_json()
            
            message_type = data.get('type')
            logger.info(f" Received message type: '{message_type}' from {client_id}")
            
            if message_type == 'frame':
                # Process frame
                logger.info(f" Processing frame message...")
                await process_frame(client_id, data)
                
            elif message_type == 'ping':
                # Respond to ping
                logger.info(f" Ping from {client_id}, sending pong...")
                await connection_manager.send_json(client_id, {
                    "type": "pong",
                    "timestamp": time.time()
                })
                
            elif message_type == 'disconnect':
                # Client requested disconnect
                logger.info(f" Client {client_id} requested disconnect")
                break
                
            else:
                # Unknown message type
                logger.warning(f" Unknown message type '{message_type}' from {client_id}")
                await connection_manager.send_json(client_id, {
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        logger.info(f" Client disconnected: {client_id}")
    
    except Exception as e:
        logger.error(f" WebSocket error for {client_id}: {str(e)}")
        import traceback
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        await connection_manager.send_json(client_id, {
            "type": "error",
            "message": str(e)
        })
    
    finally:
        await connection_manager.disconnect(client_id)


async def process_frame(client_id: str, data: dict):
    """
    Process a frame received from WebSocket client.
    
    Args:
        client_id: Client identifier
        data: Frame data dictionary
    """
    try:
        start_time = time.time()
        
        logger.info(f"\n{'='*60}")
        logger.info(f" RECEIVED FRAME FROM CLIENT: {client_id}")
        logger.info(f"{'='*60}")
        
        # Extract frame data
        frame_data = data.get('data')
        frame_id = data.get('frame_id', f"frame_{int(time.time() * 1000)}")
        include_annotated = data.get('include_annotated', False)
        
        # Extract GPS location if provided
        location = data.get('location', {})
        latitude = location.get('latitude')
        longitude = location.get('longitude')
        altitude = location.get('altitude')
        accuracy = location.get('accuracy')
        
        logger.info(f" Frame metadata:")
        logger.info(f"   Frame ID: {frame_id}")
        logger.info(f"   Timestamp: {data.get('timestamp', 'N/A')}")
        logger.info(f"   Include annotated: {include_annotated}")
        logger.info(f"   Data present: {frame_data is not None}")
        if latitude is not None and longitude is not None:
            logger.info(f"   📍 GPS Location: ({latitude:.6f}, {longitude:.6f})")
            if accuracy is not None:
                logger.info(f"      Accuracy: ±{accuracy:.2f}m")
        
        if not frame_data:
            logger.error(f" No frame data provided!")
            await connection_manager.send_json(client_id, {
                "type": "error",
                "message": "No frame data provided"
            })
            return
        
        logger.info(f"   Data length: {len(frame_data)} chars")
        
        # Perform detection with privacy filters, encryption, and GPS location
        logger.info(f"\n Starting detection pipeline with privacy filters...")
        detections, annotated_base64, encrypted_metadata = await detection_service.detect_from_base64(
            frame_data,
            frame_id=frame_id,
            apply_privacy_filters=True,
            encrypt_metadata=True,
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            accuracy=accuracy
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Update metadata
        connection_manager.increment_counter(client_id, 'frames_processed')
        connection_manager.increment_counter(client_id, 'detections_sent')
        
        # Send response with encrypted metadata
        logger.info(f"\n Sending response to client...")
        response = {
            "type": "detection",
            "frame_id": frame_id,
            "detections": [det.to_dict() for det in detections],
            "detection_count": len(detections),
            "processing_time_ms": round(processing_time, 2),
            "timestamp": time.time(),
            "encrypted_metadata": encrypted_metadata,  # Encrypted detection data
            "privacy_protected": True  # Flag indicating privacy filters were applied
        }
        
        # Include annotated image if requested (already privacy-filtered)
        if include_annotated and annotated_base64:
            response["annotated_image"] = annotated_base64
            logger.info(f"    Annotated image included (privacy-filtered)")
        
        logger.info(f"   Response type: {response['type']}")
        logger.info(f"   Detections: {response['detection_count']}")
        logger.info(f"   Processing time: {response['processing_time_ms']}ms")
        
        await connection_manager.send_json(client_id, response)
        
        logger.info(f" Response sent successfully!")
        logger.info(f"{'='*60}\n")
        
        # Log performance metrics
        if len(detections) > 0:
            logger.info(
                f" SUMMARY: Client {client_id}: {len(detections)} detections "
                f"in {processing_time:.2f}ms"
            )
        else:
            logger.info(
                f" SUMMARY: Client {client_id}: No detections "
                f"in {processing_time:.2f}ms"
            )
        
    except Exception as e:
        logger.error(f"\n FRAME PROCESSING ERROR ")
        logger.error(f"Client: {client_id}")
        logger.error(f"Error: {str(e)}")
        logger.error(f"Type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        await connection_manager.send_json(client_id, {
            "type": "error",
            "message": f"Processing error: {str(e)}"
        })


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,  # Disabled reload for Windows compatibility
        log_level=settings.log_level.lower()
    )
