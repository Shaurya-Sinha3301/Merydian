import os
import re

directory = r"d:\Projects\Merydian\frontend"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    # Replace relative imports with aliases
    new_content = re.sub(r"from '(?:\.\./)+services/", "from '@/services/", new_content)
    new_content = re.sub(r"from '(?:\.\./)+types/", "from '@/types/", new_content)
    new_content = re.sub(r"from '(?:\.\./)+contexts/", "from '@/contexts/", new_content)
    new_content = re.sub(r"from '(?:\.\./)+components/", "from '@/components/", new_content)
    new_content = re.sub(r"from '(?:\.\./)+lib/", "from '@/lib/", new_content)
    new_content = re.sub(r"from '(?:\.\./)+features/", "from '@/features/", new_content)
    
    # Fix Wheelchair import
    new_content = new_content.replace(' Wheelchair,', '')
    new_content = new_content.replace(' Wheelchair ', '')

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
