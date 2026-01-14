
import sys
import io
import contextlib

# Import optimizer
sys.path.insert(0, 'ml_or')
from itinerary_optimizer import ItineraryOptimizer

# Capture stdout
f = io.StringIO()
with contextlib.redirect_stdout(f):
    try:
        opt = ItineraryOptimizer(family_prefs_file='ml_or/data/family_preferences_divergence_test.json')
        result = opt.optimize_multi_family_single_day(['FAM_001', 'FAM_002'], 0, 5, 60, 0.05)
    except Exception as e:
        print(f"ERROR: {e}")

output = f.getvalue()

print("\n--- DEBUG OUTPUT FILTERED ---")
for line in output.split('\n'):
    if "DEBUG:" in line or "Constraint" in line:
        print(line)

print("\n--- RESULTS ---")
# Print simple results if available
# ... (simplified printing)
