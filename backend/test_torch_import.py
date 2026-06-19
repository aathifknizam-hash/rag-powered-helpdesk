import torch
print(f"Torch version: {torch.__version__}")
print(f"Has _utils: {hasattr(torch, '_utils')}")

# Try to access _utils
try:
    import torch._utils
    print("✓ torch._utils imported successfully")
except AttributeError as e:
    print(f"✗ AttributeError: {e}")
except ImportError as e:
    print(f"✗ ImportError: {e}")

# Now try sentence-transformers
print("\nAttempting to import sentence-transformers...")
try:
    from sentence_transformers import SentenceTransformer
    print("✓ sentence-transformers imported successfully")
except AttributeError as e:
    print(f"✗ AttributeError during import: {e}")
    import traceback
    traceback.print_exc()
except ImportError as e:
    print(f"✗ ImportError during import: {e}")
    import traceback
    traceback.print_exc()
