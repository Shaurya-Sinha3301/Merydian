import os
import re

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements:
        new_content = new_content.replace(old, new)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# 1. map.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\components\ui\map.tsx', [
    ('setShowLoading(false)', '// eslint-disable-next-line react-hooks/set-state-in-effect\n            setShowLoading(false)')
])

# 2. mini-chart.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\components\ui\mini-chart.tsx', [
    ('setDisplayValue(data[hoveredIndex].value)', '// eslint-disable-next-line react-hooks/set-state-in-effect\n      setDisplayValue(data[hoveredIndex].value)')
])

# 3. place-autocomplete.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\components\ui\place-autocomplete.tsx', [
    ("We can't find", "We can&apos;t find")
])

# 4. DiffViewer.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\features\diff\components\DiffViewer.tsx', [
    ('"{item.reason}"', '&quot;{item.reason}&quot;')
])

# 5. ExplanationCard.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\features\explanations\components\ExplanationCard.tsx', [
    ('"{explanation.reason}"', '&quot;{explanation.reason}&quot;')
])

# 6. FeedbackPanel.tsx
replace_in_file(r'd:\Projects\Merydian\frontend\features\feedback\components\FeedbackPanel.tsx', [
    ("I've drafted", "I&apos;ve drafted"),
    ("as any;", "as unknown;")
])

# 7. auth.ts
replace_in_file(r'd:\Projects\Merydian\frontend\services\auth.ts', [
    ("error: any", "error: unknown")
])

# 8. demo.ts
replace_in_file(r'd:\Projects\Merydian\frontend\services\demo.ts', [
    ("res: any", "res: { access_token: string; user: { id: string; name: string; email: string; role: string; preferences: any; created_at: string; updated_at: string } }")
])

# 9. feedback.ts
replace_in_file(r'd:\Projects\Merydian\frontend\services\feedback.ts', [
    ("res: any", "res: unknown")
])
