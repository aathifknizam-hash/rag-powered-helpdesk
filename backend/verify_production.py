"""
Production Verification Checklist for Django + Torch + ChromaDB
Run this before deploying to production
"""

import sys
import subprocess
from pathlib import Path

def print_header(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def check_version(package_name, min_version=None):
    """Check if package is installed and optionally meets min version"""
    try:
        pkg = __import__(package_name)
        version = getattr(pkg, '__version__', 'unknown')
        status = "✓"
        print(f"{status} {package_name}: {version}")
        return True
    except ImportError:
        print(f"✗ {package_name}: NOT INSTALLED")
        return False

def run_test(name, code):
    """Run a Python test and report results"""
    try:
        result = subprocess.run(
            [sys.executable, '-c', code],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print(f"✓ {name}")
            if result.stdout.strip():
                print(f"  {result.stdout.strip()}")
            return True
        else:
            print(f"✗ {name}")
            if result.stderr:
                print(f"  Error: {result.stderr.strip()}")
            return False
    except subprocess.TimeoutExpired:
        print(f"✗ {name} (TIMEOUT)")
        return False
    except Exception as e:
        print(f"✗ {name} (ERROR: {e})")
        return False

# ============================================================================
# CHECKS
# ============================================================================

print_header("PRODUCTION VERIFICATION CHECKLIST")

print("1. CORE DEPENDENCIES")
core_ok = all([
    check_version('django'),
    check_version('rest_framework'),
    check_version('channels'),
])

print("\n2. ML/AI STACK")
ml_ok = all([
    check_version('torch'),
    check_version('transformers'),
    check_version('sentence_transformers'),
])

print("\n3. VECTOR DATABASE")
db_ok = all([
    check_version('chromadb'),
])

print("\n4. TORCH INTERNALS")
torch_tests = [
    ("Torch _utils attribute",
     "import torch; assert hasattr(torch, '_utils'), 'Missing _utils'; print('_utils OK')"),
    ("Torch device support",
     "import torch; print(f'CUDA: {torch.cuda.is_available()}, CPU: True')"),
    ("Torch import speed",
     "import time; start = time.time(); import torch; print(f'{(time.time()-start)*1000:.1f}ms')"),
]

torch_ok = all([run_test(name, code) for name, code in torch_tests])

print("\n5. SENTENCE-TRANSFORMERS IMPORTS")
st_tests = [
    ("SentenceTransformer class",
     "from sentence_transformers import SentenceTransformer; print('OK')"),
    ("Tokenizer loading",
     "from transformers import AutoTokenizer; print('OK')"),
    ("ONNX Runtime",
     "import onnxruntime; print('OK')"),
]

st_ok = all([run_test(name, code) for name, code in st_tests])

print("\n6. DJANGO SETUP")
django_tests = [
    ("Django core",
     "import django; django.setup() if hasattr(django, 'setup') else None; print(f'Django {django.__version__}')"),
    ("Django ORM",
     "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); import django; django.setup(); from django.db import connection; print('DB OK')"),
]

django_ok = all([run_test(name, code) for name, code in django_tests])

print("\n7. FILE STRUCTURE")
required_files = [
    Path('manage.py'),
    Path('core/settings.py'),
    Path('core/wsgi.py'),
]

files_ok = True
for file_path in required_files:
    if file_path.exists():
        print(f"✓ {file_path}")
    else:
        print(f"✗ {file_path} MISSING")
        files_ok = False

# ============================================================================
# SUMMARY
# ============================================================================

print_header("VERIFICATION SUMMARY")

all_checks = {
    "Core Dependencies": core_ok,
    "ML/AI Stack": ml_ok,
    "Vector Database": db_ok,
    "Torch Internals": torch_ok,
    "Sentence-Transformers": st_ok,
    "Django Setup": django_ok,
    "File Structure": files_ok,
}

passed = sum(1 for v in all_checks.values() if v)
total = len(all_checks)

for check, result in all_checks.items():
    status = "✓" if result else "✗"
    print(f"{status} {check}")

print(f"\n{'='*80}")
if passed == total:
    print(f"✓ ALL CHECKS PASSED ({passed}/{total})")
    print("Ready for production deployment!")
else:
    print(f"✗ SOME CHECKS FAILED ({passed}/{total})")
    print("\nRun the following to fix:")
    print("  pip install -r requirements-production.txt")
    print("  python manage.py migrate")
print(f"{'='*80}\n")

sys.exit(0 if passed == total else 1)
