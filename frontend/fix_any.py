import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    # Handle catch (error: any)
    new_content = re.sub(r'catch \(error: any\)', 'catch (error: unknown)', new_content)
    new_content = re.sub(r'error\.message', '((error as Error).message || "")', new_content)
    
    # Handle (error as any).status
    new_content = re.sub(r'\(error as any\)\.status', '((error as {status?: number}).status)', new_content)
    
    # Generic any
    new_content = re.sub(r': any', ': unknown', new_content)
    new_content = re.sub(r'<any>', '<unknown>', new_content)
    
    # Fix potential duplicate unknown
    new_content = new_content.replace(': unknown =', ': any =') # Revert just in case
    new_content = new_content.replace(': unknown)', ': unknown)')
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(r"d:\Projects\Merydian\frontend"):
    if 'node_modules' in root or '.next' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            process_file(os.path.join(root, file))
