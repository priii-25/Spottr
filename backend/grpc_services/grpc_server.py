"""gRPC server implementation for detection service."""
import grpc
from concurrent import futures
import asyncio
from typing import Iterator
import time

# Generated from protobuf (will be generated via: python -m grpc_tools.protoc)
# import detection_pb2
# import detection_pb2_grpc

from config import settings
from logger import setup_logger
from services.detection_service import detection_service

logger = setup_logger(__name__)


class DetectionServicer:
    """gRPC servicer implementation for detection service."""
    
    def __init__(self):
        self.detection_service = detection_service
    
    async def DetectImage(self, request, context):
        """
        Handle single image detection request.
        
        Note: Actual implementation requires generated protobuf code.
        This is a template showing the structure.
        """
        try:
            # Extract request data
            image_bytes = request.image_data
            frame_id = request.frame_id
            
            # Perform detection
            start_time = time.time()
            detections, annotated_bytes = await self.detection_service.detect_from_bytes(
                image_bytes,
                frame_id=frame_id
            )
            processing_time = (time.time() - start_time) * 1000
            
            # Build response (pseudo-code, requires actual protobuf classes)
            response = {
                'detections': [det.to_dict() for det in detections],
                'annotated_image': annotated_bytes,
                'frame_id': frame_id,
                'detection_count': len(detections),
                'processing_time_ms': processing_time
            }
            
            logger.info(f"gRPC DetectImage: {len(detections)} detections in {processing_time:.2f}ms")
            
            return response
            
        except Exception as e:
            logger.error(f"gRPC DetectImage error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return None
    
    async def DetectStream(self, request_iterator, context):
        """
        Handle streaming detection requests.
        
        Note: Actual implementation requires generated protobuf code.
        """
        try:
            async for request in request_iterator:
                image_bytes = request.image_data
                frame_id = request.frame_id
                
                # Perform detection
                start_time = time.time()
                detections, annotated_bytes = await self.detection_service.detect_from_bytes(
                    image_bytes,
                    frame_id=frame_id
                )
                processing_time = (time.time() - start_time) * 1000
                
                # Yield response
                response = {
                    'detections': [det.to_dict() for det in detections],
                    'annotated_image': annotated_bytes,
                    'frame_id': frame_id,
                    'detection_count': len(detections),
                    'processing_time_ms': processing_time
                }
                
                yield response
                
        except Exception as e:
            logger.error(f"gRPC DetectStream error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
    
    async def HealthCheck(self, request, context):
        """Health check endpoint."""
        try:
            health = await self.detection_service.health_check()
            
            response = {
                'healthy': health['status'] == 'healthy',
                'message': health.get('reason', 'OK'),
                'device': settings.device
            }
            
            return response
            
        except Exception as e:
            logger.error(f"gRPC HealthCheck error: {str(e)}")
            return {
                'healthy': False,
                'message': str(e),
                'device': settings.device
            }
    
    async def GetModelInfo(self, request, context):
        """Get model information."""
        try:
            model_info = self.detection_service.get_model_info()
            
            response = {
                'model_type': model_info['model_type'],
                'model_path': model_info['model_path'],
                'classes': model_info['classes'],
                'confidence_threshold': model_info['confidence_threshold'],
                'iou_threshold': model_info['iou_threshold']
            }
            
            return response
            
        except Exception as e:
            logger.error(f"gRPC GetModelInfo error: {str(e)}")
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return None


async def serve_grpc():
    """Start gRPC server."""
    server = grpc.aio.server(
        futures.ThreadPoolExecutor(max_workers=settings.grpc_max_workers)
    )
    
    # Add servicer (requires generated protobuf code)
    # detection_pb2_grpc.add_DetectionServiceServicer_to_server(
    #     DetectionServicer(),
    #     server
    # )
    
    server.add_insecure_port(f'[::]:{settings.grpc_port}')
    await server.start()
    
    logger.info(f"gRPC server started on port {settings.grpc_port}")
    
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        await server.stop(grace=5)
        logger.info("gRPC server stopped")


# To generate protobuf code, run:
# python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. detection.proto
