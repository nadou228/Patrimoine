import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    lines = content.split('\n')
    mapping = {')': '(', '}': '{', ']': '['}
    
    for i, line in enumerate(lines):
        for char in line:
            if char in '({[':
                stack.append((char, i + 1))
            elif char in ')}]':
                if not stack:
                    print(f"Extra closing '{char}' at line {i + 1}")
                    return
                top_char, top_line = stack.pop()
                if top_char != mapping[char]:
                    print(f"Mismatch: Opening '{top_char}' at line {top_line} with closing '{char}' at line {i + 1}")
                    return
    
    if stack:
        for char, line in stack:
            print(f"Unclosed '{char}' from line {line}")
    else:
        print("All brackets and braces are balanced")

if __name__ == "__main__":
    check_braces(sys.argv[1])
