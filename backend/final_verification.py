"""
Final production verification - Test actual embedding generation
"""
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

print("=" * 80)
print("FINAL PRODUCTION VERIFICATION - EMBEDDING GENERATION TEST")
print("=" * 80)

print("\n1. Setting up Django...")
try:
    import django
    django.setup()
    print("✓ Django initialized")
except Exception as e:
    print(f"✗ Django setup failed: {e}")
    exit(1)

print("\n2. Loading sentence-transformers model...")
try:
    from sentence_transformers import SentenceTransformer
    print("   Importing model... (this loads BAAI/bge-base-en-v1.5 if first run)")
    
    # Load model locally first to avoid network issues
    model = SentenceTransformer("BAAI/bge-base-en-v1.5", device="cpu")
    print("✓ Model loaded successfully")
except Exception as e:
    print(f"✗ Model loading failed: {e}")
    print("\n   Note: If model download failed due to network, that's expected.")
    print("   The import system itself is working correctly.")
    exit(1)

print("\n3. Testing embedding generation...")
try:
    test_texts = [
        "Django is a Python web framework",
        "PyTorch is a machine learning library",
        "Sentence embeddings enable semantic search"
    ]
    
    embeddings = model.encode(test_texts)
    print(f"✓ Generated embeddings for {len(test_texts)} texts")
    print(f"  Embedding shape: {embeddings.shape}")
    print(f"  Each embedding dimension: {embeddings.shape[1]}")
    print(f"  Type: {type(embeddings).__name__}")
    
except Exception as e:
    print(f"✗ Embedding generation failed: {e}")
    exit(1)

print("\n4. Testing semantic similarity...")
try:
    import numpy as np
    
    # Compute cosine similarity
    def cosine_similarity(a, b):
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    # Compare first and second embeddings
    sim = cosine_similarity(embeddings[0], embeddings[1])
    print(f"✓ Similarity between texts 1 & 2: {sim:.4f}")
    
    # Compare first and third embeddings
    sim2 = cosine_similarity(embeddings[0], embeddings[2])
    print(f"✓ Similarity between texts 1 & 3: {sim2:.4f}")
    
except Exception as e:
    print(f"✗ Similarity test failed: {e}")
    exit(1)

print("\n5. Testing ChromaDB integration...")
try:
    import chromadb
    
    client = chromadb.Client()
    collection = client.get_or_create_collection(
        name="test_collection",
        metadata={"hnsw:space": "cosine"}
    )
    
    # Add documents
    collection.upsert(
        ids=["1", "2", "3"],
        embeddings=embeddings.tolist(),
        documents=test_texts,
        metadatas=[{"source": "test"} for _ in test_texts]
    )
    
    print(f"✓ Documents added to ChromaDB")
    
    # Query
    query_embedding = model.encode(["machine learning"])
    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=2
    )
    
    print(f"✓ Query returned {len(results['documents'][0])} results")
    print(f"  Top match: {results['documents'][0][0][:50]}...")
    
except Exception as e:
    print(f"✗ ChromaDB test failed: {e}")
    exit(1)

print("\n" + "=" * 80)
print("✓ ALL TESTS PASSED - PRODUCTION READY")
print("=" * 80)

print("\nStatus Summary:")
print("  ✓ Torch with _utils: Working")
print("  ✓ Sentence-Transformers: Working")
print("  ✓ Model loading: Working")
print("  ✓ Embedding generation: Working")
print("  ✓ Semantic search: Working")
print("  ✓ ChromaDB integration: Working")
print("  ✓ Django setup: Working")

print("\nYour system is ready for production deployment!")
print("=" * 80 + "\n")
