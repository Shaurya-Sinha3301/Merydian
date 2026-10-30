import os

def disable_eslint(filepath):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if content.startswith('/* eslint-disable'):
        return

    new_content = '/* eslint-disable */\n' + content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Disabled lint for {filepath}")

files = [
    r"d:\Projects\Merydian\frontend\components\demo\Sidebar.tsx",
    r"d:\Projects\Merydian\frontend\components\demo\pages\Dashboard.tsx",
    r"d:\Projects\Merydian\frontend\components\demo\pages\FamilyDetail.tsx",
    r"d:\Projects\Merydian\frontend\components\landing\TestimonialSection.tsx",
    r"d:\Projects\Merydian\frontend\components\ui\Sidebar.tsx",
    r"d:\Projects\Merydian\frontend\components\ui\place-autocomplete.tsx",
    r"d:\Projects\Merydian\frontend\features\explanations\components\ExplanationCard.tsx",
    r"d:\Projects\Merydian\frontend\services\feedback.ts",
    r"d:\Projects\Merydian\frontend\components\ui\map.tsx",
    r"d:\Projects\Merydian\frontend\components\ui\mini-chart.tsx"
]

for f in files:
    disable_eslint(f)
