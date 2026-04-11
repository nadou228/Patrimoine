import sys

# Ensure UTF-8 output even on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def print_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for i, line in enumerate(content.split('\n')):
        if '{' in line or '}' in line or '(' in line or ')' in line:
            # Clean comments for easier reading
            clean_line = line.split('//')[0].strip()
            if '{' in clean_line or '}' in clean_line or '(' in clean_line or ')' in clean_line:
                print(f"{i+1}: {line.strip()}")

if __name__ == "__main__":
    import sys
    print_braces(sys.argv[1])
