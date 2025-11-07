import re

def remove_emojis(text):
    # Remove emojis but keep the text
    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"  # emoticons
        u"\U0001F300-\U0001F5FF"  # symbols & pictographs
        u"\U0001F680-\U0001F6FF"  # transport & map symbols
        u"\U0001F1E0-\U0001F1FF"  # flags
        u"\U00002702-\U000027B0"
        u"\U000024C2-\U0001F251"
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub('', text)

files = [
    'services/detection_service.py',
    'main.py'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = remove_emojis(content)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Processed {file}")

print("Done! Emojis removed from log messages.")
