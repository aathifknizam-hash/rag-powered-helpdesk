"""
Vector Sync API Endpoints - Phase 12
REST endpoints for vector database synchronization
"""

from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status, viewsets
from knowledge_base.sync_manager import VectorSyncManager
import logging

logger = logging.getLogger(__name__)


class VectorSyncViewSet(viewsets.ViewSet):
    """API endpoints for vector synchronization"""
    
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['post'])
    def sync_now(self, request):
        """Trigger manual vector sync"""
        try:
            manager = VectorSyncManager()
            result = manager.full_sync()
            return Response(result)
        except Exception as e:
            logger.error(f'Vector sync failed: {e}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def sync_kb(self, request):
        """Sync knowledge base articles only"""
        try:
            manager = VectorSyncManager()
            result = manager.sync_kb_articles()
            return Response(result)
        except Exception as e:
            logger.error(f'KB sync failed: {e}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def sync_faq(self, request):
        """Sync FAQ items only"""
        try:
            manager = VectorSyncManager()
            result = manager.sync_faq_items()
            return Response(result)
        except Exception as e:
            logger.error(f'FAQ sync failed: {e}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def cleanup(self, request):
        """Remove deleted items from vector DB"""
        try:
            manager = VectorSyncManager()
            result = manager.remove_deleted_items()
            return Response(result)
        except Exception as e:
            logger.error(f'Cleanup failed: {e}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get vector sync status"""
        try:
            manager = VectorSyncManager()
            result = manager.verify_sync()
            return Response(result)
        except Exception as e:
            logger.error(f'Status check failed: {e}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@api_view(['POST'])
@permission_classes([IsAdminUser])
def trigger_vector_sync(request):
    """Manual trigger for vector sync"""
    try:
        sync_type = request.data.get('type', 'full')  # full, kb, faq, cleanup
        manager = VectorSyncManager()
        
        if sync_type == 'kb':
            result = manager.sync_kb_articles()
        elif sync_type == 'faq':
            result = manager.sync_faq_items()
        elif sync_type == 'cleanup':
            result = manager.remove_deleted_items()
        else:
            result = manager.full_sync()
        
        return Response(result)
    except Exception as e:
        logger.error(f'Vector sync error: {e}')
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_vector_sync_status(request):
    """Get current vector sync status"""
    try:
        manager = VectorSyncManager()
        status_info = manager.verify_sync()
        return Response(status_info)
    except Exception as e:
        logger.error(f'Status check failed: {e}')
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
