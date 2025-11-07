"""Main FastAPI application for real-time detection service."""
import asyncio
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from config import settings
from logger import setup_logger
from services.detection_service import detection_service
from services.websocket_manager import connection_manager

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
            data = await websocket.receive_json()
            
            message_type = data.get('type')
            
            if message_type == 'frame':
                # Process frame
                await process_frame(client_id, data)
                
            elif message_type == 'ping':
                # Respond to ping
                await connection_manager.send_json(client_id, {
                    "type": "pong",
                    "timestamp": time.time()
                })
                
            elif message_type == 'disconnect':
                # Client requested disconnect
                break
                
            else:
                # Unknown message type
                await connection_manager.send_json(client_id, {
                    "type": "error",
                    "message": f"Unknown message type: {message_type}"
                })
    
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {client_id}")
    
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}")
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
        
        # Extract frame data
        frame_data = data.get('data')
        frame_id = data.get('frame_id', f"frame_{int(time.time() * 1000)}")
        
        if not frame_data:
            await connection_manager.send_json(client_id, {
                "type": "error",
                "message": "No frame data provided"
            })
            return
        
        # Perform detection
        detections, annotated_base64 = await detection_service.detect_from_base64(
            frame_data,
            frame_id=frame_id
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        # Update metadata
        connection_manager.increment_counter(client_id, 'frames_processed')
        connection_manager.increment_counter(client_id, 'detections_sent')
        
        # Send response
        response = {
            "type": "detection",
            "frame_id": frame_id,
            "detections": [det.to_dict() for det in detections],
            "detection_count": len(detections),
            "processing_time_ms": round(processing_time, 2),
            "timestamp": time.time()
        }
        
        # Include annotated image if requested
        if data.get('include_annotated', False) and annotated_base64:
            response["annotated_image"] = annotated_base64
        
        await connection_manager.send_json(client_id, response)
        
        # Log performance metrics
        if len(detections) > 0:
            logger.info(
                f"Client {client_id}: {len(detections)} detections "
                f"in {processing_time:.2f}ms"
            )
        
    except Exception as e:
        logger.error(f"Frame processing error for {client_id}: {str(e)}")
        await connection_manager.send_json(client_id, {
            "type": "error",
            "message": f"Processing error: {str(e)}"
        })


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=not settings.is_production,
        log_level=settings.log_level.lower()
    )
