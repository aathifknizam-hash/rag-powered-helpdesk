"""
Test sentence-transformers model loading with Django
"""
import os
import sys
import django

# Add backend to path
sys.path.insert(0, '/Users/user/Desktop/faith/final_project_faith/ssd/backend')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

print("Django setup complete\n")

# Now test torch and sentence-transformers
print("=" * 60)
print("TORCH DIAGNOSTIC")
print("=" * 60)

import torch
print(f"✓ Torch version: {torch.__version__}")
print(f"✓ Torch file: {torch.__file__}")
print(f"✓ Has _utils: {hasattr(torch, '_utils')}")

# Check if any conflicting modules
print("\nChecking for import conflicts...")
sys_modules = [m for m in sys.modules if 'torch' in m.lower()]
print(f"✓ Loaded torch modules: {len(sys_modules)}")

print("\n" + "=" * 60)
print("SENTENCE-TRANSFORMERS DIAGNOSTIC")
print("=" * 60)

try:
    from sentence_transformers import SentenceTransformer
    print("✓ SentenceTransformer imported successfully")
    
    print("\nLoading model: BAAI/bge-base-en-v1.5")
    print("(This may take 30-60 seconds on first load...)")
    
    model = SentenceTransformer("BAAI/bge-base-en-v1.5")
    print(f"✓ Model loaded successfully: {model}")
    
    # Test encoding
    sentences = ["This is a test sentence"]
    embeddings = model.encode(sentences)
    print(f"✓ Encoding works: embedding shape = {embeddings.shape}")
    
except Exception as e:
    print(f"✗ Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
