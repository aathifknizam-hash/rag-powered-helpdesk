"""
Django Management Command: sync_vectors
Synchronizes ChromaDB with SQLite knowledge base
"""

from django.core.management.base import BaseCommand
import json
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Synchronize ChromaDB vector database with SQLite knowledge base'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Perform complete synchronization',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Verify sync status',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Remove deleted items from vector database',
        )

    def handle(self, *args, **options):
        from knowledge_base.sync_manager import VectorSyncManager
        
        manager = VectorSyncManager()
        
        try:
            if options['full']:
                self.stdout.write('Starting full synchronization...')
                result = manager.full_sync()
            elif options['verify']:
                self.stdout.write('Verifying sync status...')
                result = manager.verify_sync()
            elif options['cleanup']:
                self.stdout.write('Cleaning up deleted items...')
                result = manager.remove_deleted_items()
            else:
                self.stdout.write('Syncing knowledge base and FAQs...')
                kb_result = manager.sync_kb_articles()
                faq_result = manager.sync_faq_items()
                result = {
                    'kb_sync': kb_result,
                    'faq_sync': faq_result,
                }
            
            # Pretty print result
            result_json = json.dumps(result, indent=2)
            
            if result.get('status') == 'failed' or (isinstance(result, dict) and any(
                v.get('status') == 'failed' if isinstance(v, dict) else False 
                for v in result.values()
            )):
                self.stdout.write(self.style.ERROR(result_json))
            else:
                self.stdout.write(self.style.SUCCESS(result_json))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Sync failed: {str(e)}'))
            logger.exception('Vector sync command failed')
