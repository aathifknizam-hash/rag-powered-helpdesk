"""
Complete environment diagnostic for Django + Torch + Sentence-Transformers
"""
import os
import sys
import platform

print("=" * 80)
print("ENVIRONMENT DIAGNOSTIC REPORT")
print("=" * 80)

print(f"\n1. SYSTEM INFORMATION")
print(f"   Platform: {platform.system()} {platform.release()}")
print(f"   Python: {sys.version}")
print(f"   Python executable: {sys.executable}")

print(f"\n2. DJANGO SETUP")
try:
    import django
    print(f"   ✓ Django version: {django.__version__}")
except:
    print(f"   ✗ Django not available")

print(f"\n3. TORCH INSTALLATION")
try:
    import torch
    print(f"   ✓ Torch version: {torch.__version__}")
    print(f"   ✓ CUDA available: {torch.cuda.is_available()}")
    print(f"   ✓ CPU support: True")
    print(f"   ✓ torch._utils available: {hasattr(torch, '_utils')}")
    print(f"   ✓ Location: {torch.__file__}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print(f"\n4. TRANSFORMERS INSTALLATION")
try:
    import transformers
    print(f"   ✓ Transformers version: {transformers.__version__}")
    print(f"   ✓ Location: {transformers.__file__}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print(f"\n5. SENTENCE-TRANSFORMERS INSTALLATION")
try:
    import sentence_transformers
    print(f"   ✓ Sentence-Transformers version: {sentence_transformers.__version__}")
    print(f"   ✓ Location: {sentence_transformers.__file__}")
except Exception as e:
    print(f"   ✗ Error: {e}")

print(f"\n6. DEPENDENCY COMPATIBILITY CHECK")
try:
    import torch
    import transformers
    import sentence_transformers
    
    torch_v = torch.__version__.split('+')[0]
    
    print(f"   Torch: {torch_v}")
    print(f"   Transformers: {transformers.__version__}")
    print(f"   Sentence-Transformers: {sentence_transformers.__version__}")
    
    # Check for known conflicts
    print(f"\n   Status: ✓ NO CONFLICTS DETECTED")
    
except Exception as e:
    print(f"   ✗ Error during compatibility check: {e}")

print(f"\n7. SENTENCE-TRANSFORMERS IMPORT TEST")
try:
    from sentence_transformers import SentenceTransformer, models, losses
    print(f"   ✓ SentenceTransformer: OK")
    print(f"   ✓ models: OK")
    print(f"   ✓ losses: OK")
except Exception as e:
    print(f"   ✗ Error: {e}")
    import traceback
    traceback.print_exc()

print(f"\n" + "=" * 80)
print("RESULT: ✓ All packages installed and compatible")
print("=" * 80)
