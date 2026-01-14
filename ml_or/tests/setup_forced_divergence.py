"""Test must-visit conflicts to force divergence"""

import json

# Update family preferences to force divergence
with open('ml_or/data/family_preferences.json', 'r') as f:
    families = json.load(f)

# FAM_001: Must visit LOC_008 (religious), never visit LOC_011 (nightlife)
families[0]['must_visit_locations'] = ['LOC_008']
families[0]['never_visit_locations'] = ['LOC_011']

# FAM_002: Must visit LOC_011 (nightlife), never visit LOC_008 (religious)
families[1]['must_visit_locations'] = ['LOC_011']
families[1]['never_visit_locations'] = ['LOC_008']

# Save temporarily
with open('ml_or/data/family_preferences_test.json', 'w') as f:
    json.dump(families, f, indent=2)

print("Created test family preferences with must-visit conflicts:")
print("FAM_001: must_visit=[LOC_008], never_visit=[LOC_011]")
print("FAM_002: must_visit=[LOC_011], never_visit=[LOC_008]")
print("\nThis should FORCE divergence!")
