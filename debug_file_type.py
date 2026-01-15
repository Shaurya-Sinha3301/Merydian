
import json
import os

path = "ml_or/data/locations.json"
print(f"Checking: {os.path.abspath(path)}")

with open(path, 'r') as f:
    content = f.read()
    print(f"First 10 chars: {content[:10]}")
    try:
        data = json.loads(content)
        print(f"Type: {type(data)}")
        if isinstance(data, dict):
            print(f"Keys: {list(data.keys())[:5]}")
    except Exception as e:
        print(f"JSON Error: {e}")
