"""
Vector Index Sync Manager - Phase 12: Vector Consistency
Maintains consistency between SQLite and ChromaDB
"""

import os
import logging
import json
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
import chromadb

logger = logging.getLogger(__name__)

# Initialize ChromaDB client
CHROMA_DB_PATH = os.getenv('CHROMA_DB_PATH', './chroma_db')
chroma_client = chromadb.HttpClient(host='localhost', port=8000) if os.getenv('CHROMA_REMOTE') else chromadb.PersistentClient(path=CHROMA_DB_PATH)

# Collection name
COLLECTION_NAME = 'knowledge_base_embeddings'


class VectorSyncManager:
    """Manages synchronization between SQLite and ChromaDB"""

    def __init__(self):
        self.chroma_client = chroma_client
        self.collection_name = COLLECTION_NAME
        self.sync_log = []

    def get_collection(self):
        """Get or create ChromaDB collection"""
        try:
            return self.chroma_client.get_collection(name=self.collection_name)
        except:
            return self.chroma_client.create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )

    def sync_kb_articles(self):
        """Sync knowledge base articles to vector DB"""
        from knowledge_base.models import KBArticle
        
        try:
            collection = self.get_collection()
            
            # Get all KB articles
            articles = KBArticle.objects.all()
            
            added = 0
            updated = 0
            failed = 0
            
            for article in articles:
                try:
                    # Generate embedding (use existing or mock for now)
                    embedding = self._generate_embedding(article.content)
                    
                    doc_id = f"kb_article_{article.id}"
                    
                    # Check if exists
                    try:
                        collection.get(ids=[doc_id])
                        # Update existing
                        collection.update(
                            ids=[doc_id],
                            embeddings=[embedding],
                            documents=[article.content],
                            metadatas=[{
                                'article_id': article.id,
                                'title': article.title,
                                'category': article.category,
                                'updated_at': article.updated_at.isoformat(),
                            }]
                        )
                        updated += 1
                    except:
                        # Add new
                        collection.add(
                            ids=[doc_id],
                            embeddings=[embedding],
                            documents=[article.content],
                            metadatas=[{
                                'article_id': article.id,
                                'title': article.title,
                                'category': article.category,
                                'created_at': article.created_at.isoformat(),
                            }]
                        )
                        added += 1
                    
                    logger.info(f'Synced KB article {article.id}')
                except Exception as e:
                    logger.error(f'Failed to sync KB article {article.id}: {e}')
                    failed += 1
            
            result = {
                'status': 'success',
                'added': added,
                'updated': updated,
                'failed': failed,
                'timestamp': datetime.now().isoformat(),
            }
            
            self.sync_log.append(result)
            return result
            
        except Exception as e:
            logger.error(f'KB sync failed: {e}')
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    def sync_faq_items(self):
        """Sync FAQ items to vector DB"""
        from faq.models import FAQ
        
        try:
            collection = self.get_collection()
            
            # Get all FAQs
            faqs = FAQ.objects.all()
            
            added = 0
            updated = 0
            failed = 0
            
            for faq in faqs:
                try:
                    # Combine question and answer
                    content = f"{faq.question} {faq.answer}"
                    embedding = self._generate_embedding(content)
                    
                    doc_id = f"faq_{faq.id}"
                    
                    try:
                        collection.get(ids=[doc_id])
                        # Update
                        collection.update(
                            ids=[doc_id],
                            embeddings=[embedding],
                            documents=[content],
                            metadatas=[{
                                'faq_id': faq.id,
                                'question': faq.question,
                                'category': faq.category,
                                'updated_at': faq.updated_at.isoformat(),
                            }]
                        )
                        updated += 1
                    except:
                        # Add new
                        collection.add(
                            ids=[doc_id],
                            embeddings=[embedding],
                            documents=[content],
                            metadatas=[{
                                'faq_id': faq.id,
                                'question': faq.question,
                                'category': faq.category,
                                'created_at': faq.created_at.isoformat(),
                            }]
                        )
                        added += 1
                    
                    logger.info(f'Synced FAQ {faq.id}')
                except Exception as e:
                    logger.error(f'Failed to sync FAQ {faq.id}: {e}')
                    failed += 1
            
            result = {
                'status': 'success',
                'added': added,
                'updated': updated,
                'failed': failed,
                'timestamp': datetime.now().isoformat(),
            }
            
            self.sync_log.append(result)
            return result
            
        except Exception as e:
            logger.error(f'FAQ sync failed: {e}')
            return {
                'status': 'failed',
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
            }

    def remove_deleted_items(self):
        """Remove items from vector DB if deleted from SQLite"""
        from knowledge_base.models import KBArticle
        from faq.models import FAQ
        
        try:
            collection = self.get_collection()
            
            # Get all vector IDs
            all_data = collection.get()
            vector_ids = all_data.get('ids', [])
            
            removed = 0
            
            for vec_id in vector_ids:
                if vec_id.startswith('kb_article_'):
                    article_id = int(vec_id.split('_')[-1])
                    if not KBArticle.objects.filter(id=article_id).exists():
                        collection.delete(ids=[vec_id])
                        removed += 1
                        logger.info(f'Removed deleted KB article {article_id}')
                
                elif vec_id.startswith('faq_'):
                    faq_id = int(vec_id.split('_')[-1])
                    if not FAQ.objects.filter(id=faq_id).exists():
                        collection.delete(ids=[vec_id])
                        removed += 1
                        logger.info(f'Removed deleted FAQ {faq_id}')
            
            return {
                'status': 'success',
                'removed': removed,
                'timestamp': datetime.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f'Cleanup failed: {e}')
            return {
                'status': 'failed',
                'error': str(e),
            }

    def verify_sync(self):
        """Verify sync status between SQLite and ChromaDB"""
        from knowledge_base.models import KBArticle
        from faq.models import FAQ
        
        try:
            collection = self.get_collection()
            
            kb_count = KBArticle.objects.count()
            faq_count = FAQ.objects.count()
            
            all_data = collection.get()
            vector_count = len(all_data.get('ids', []))
            
            expected_count = kb_count + faq_count
            
            return {
                'status': 'success',
                'kb_articles': kb_count,
                'faqs': faq_count,
                'expected_vectors': expected_count,
                'actual_vectors': vector_count,
                'in_sync': expected_count == vector_count,
                'timestamp': datetime.now().isoformat(),
            }
            
        except Exception as e:
            logger.error(f'Verification failed: {e}')
            return {
                'status': 'failed',
                'error': str(e),
            }

    def full_sync(self):
        """Perform full synchronization"""
        logger.info('Starting full vector sync...')
        
        results = {
            'kb_sync': self.sync_kb_articles(),
            'faq_sync': self.sync_faq_items(),
            'cleanup': self.remove_deleted_items(),
            'verification': self.verify_sync(),
            'started_at': datetime.now().isoformat(),
        }
        
        logger.info(f'Sync completed: {json.dumps(results, indent=2)}')
        return results

    def _generate_embedding(self, text):
        """Generate embedding for text"""
        from sentence_transformers import SentenceTransformer
        
        # Use existing model or initialize
        model = SentenceTransformer('all-MiniLM-L6-v2')
        embedding = model.encode(text).tolist()
        return embedding

    def get_sync_status(self):
        """Get current sync status"""
        return {
            'logs': self.sync_log,
            'last_sync': self.sync_log[-1] if self.sync_log else None,
        }


class Command(BaseCommand):
    """Django management command for vector sync"""
    
    help = 'Synchronize vector database with knowledge base'

    def add_arguments(self, parser):
        parser.add_argument(
            '--full',
            action='store_true',
            help='Perform full sync',
        )
        parser.add_argument(
            '--verify',
            action='store_true',
            help='Verify sync status',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Remove deleted items from vector DB',
        )

    def handle(self, *args, **options):
        manager = VectorSyncManager()
        
        if options['full']:
            result = manager.full_sync()
        elif options['verify']:
            result = manager.verify_sync()
        elif options['cleanup']:
            result = manager.remove_deleted_items()
        else:
            # Default: sync KB and FAQ
            manager.sync_kb_articles()
            result = manager.sync_faq_items()
        
        self.stdout.write(self.style.SUCCESS(json.dumps(result, indent=2)))
