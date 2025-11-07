"""WebSocket connection manager for real-time detection streams."""
import asyncio
import json
from typing import Dict, Set, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

from config import settings
from logger import setup_logger

logger = setup_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections and message broadcasting."""
    
    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict] = {}
        self._lock = asyncio.Lock()
        
    async def connect(
        self,
        websocket: WebSocket,
        client_id: str
    ) -> bool:
        """
        Connect a new WebSocket client.
        
        Args:
            websocket: WebSocket connection
            client_id: Unique client identifier
            
        Returns:
            True if connected successfully, False if limit reached
        """
        async with self._lock:
            # Check connection limit
            if len(self.active_connections) >= settings.ws_max_connections:
                logger.warning(
                    f"Connection limit reached. Rejecting client: {client_id}"
                )
                return False
            
            await websocket.accept()
            self.active_connections[client_id] = websocket
            self.connection_metadata[client_id] = {
                'connected_at': datetime.now().isoformat(),
                'frames_processed': 0,
                'detections_sent': 0
            }
            
            logger.info(
                f"Client connected: {client_id} "
                f"(Total: {len(self.active_connections)})"
            )
            
            return True
    
    async def disconnect(self, client_id: str) -> None:
        """
        Disconnect a WebSocket client.
        
        Args:
            client_id: Client identifier to disconnect
        """
        async with self._lock:
            if client_id in self.active_connections:
                websocket = self.active_connections.pop(client_id)
                metadata = self.connection_metadata.pop(client_id, {})
                
                try:
                    await websocket.close()
                except Exception:
                    pass
                
                logger.info(
                    f"Client disconnected: {client_id} "
                    f"(Processed: {metadata.get('frames_processed', 0)} frames, "
                    f"Total: {len(self.active_connections)})"
                )
    
    async def send_json(
        self,
        client_id: str,
        message: Dict
    ) -> bool:
        """
        Send JSON message to a specific client.
        
        Args:
            client_id: Target client identifier
            message: Dictionary to send as JSON
            
        Returns:
            True if sent successfully, False otherwise
        """
        if client_id not in self.active_connections:
            return False
        
        try:
            websocket = self.active_connections[client_id]
            await websocket.send_json(message)
            return True
            
        except Exception as e:
            logger.error(f"Error sending to {client_id}: {str(e)}")
            await self.disconnect(client_id)
            return False
    
    async def send_text(
        self,
        client_id: str,
        message: str
    ) -> bool:
        """
        Send text message to a specific client.
        
        Args:
            client_id: Target client identifier
            message: Text message to send
            
        Returns:
            True if sent successfully, False otherwise
        """
        if client_id not in self.active_connections:
            return False
        
        try:
            websocket = self.active_connections[client_id]
            await websocket.send_text(message)
            return True
            
        except Exception as e:
            logger.error(f"Error sending to {client_id}: {str(e)}")
            await self.disconnect(client_id)
            return False
    
    async def broadcast_json(self, message: Dict) -> int:
        """
        Broadcast JSON message to all connected clients.
        
        Args:
            message: Dictionary to broadcast
            
        Returns:
            Number of clients message was sent to
        """
        sent_count = 0
        disconnected = []
        
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Broadcast error to {client_id}: {str(e)}")
                disconnected.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected:
            await self.disconnect(client_id)
        
        return sent_count
    
    def update_metadata(
        self,
        client_id: str,
        key: str,
        value
    ) -> None:
        """
        Update client metadata.
        
        Args:
            client_id: Client identifier
            key: Metadata key
            value: New value
        """
        if client_id in self.connection_metadata:
            self.connection_metadata[client_id][key] = value
    
    def increment_counter(
        self,
        client_id: str,
        counter: str
    ) -> None:
        """
        Increment a counter in client metadata.
        
        Args:
            client_id: Client identifier
            counter: Counter name
        """
        if client_id in self.connection_metadata:
            current = self.connection_metadata[client_id].get(counter, 0)
            self.connection_metadata[client_id][counter] = current + 1
    
    def get_stats(self) -> Dict:
        """Get connection statistics."""
        return {
            'active_connections': len(self.active_connections),
            'max_connections': settings.ws_max_connections,
            'clients': list(self.active_connections.keys()),
            'metadata': self.connection_metadata
        }
    
    async def cleanup(self) -> None:
        """Clean up all connections."""
        client_ids = list(self.active_connections.keys())
        for client_id in client_ids:
            await self.disconnect(client_id)
        
        logger.info("All connections cleaned up")


# Global connection manager instance
connection_manager = ConnectionManager()
