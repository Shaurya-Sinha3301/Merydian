
import sys

def analyze():
    log_file = "debug_log.txt"
    keywords = ["Safdarjung", "LOC_010", "History after Day 1", "OPTIMIZING DAY 2", "CONSTRAINT", "SKELETON", "DEBUG_DAY2", "CRITICAL DEBUG"]
    
    encodings = ['utf-16', 'utf-8', 'cp1252']
    
    content = ""
    for enc in encodings:
        try:
            with open(log_file, 'r', encoding=enc) as f:
                content = f.read()
            print(f"Successfully read with encoding: {enc}")
            break
        except Exception:
            continue
            
    if not content:
        print("Failed to read log file with standard encodings.")
        return

    print("--- LOG ANALYSIS START ---")
    lines = content.split('\n')
    day2_started = False
    
    for line in lines:
        if "DEBUG:" in line:
            print(f"DEBUG_MATCH: {line.strip()}")
            
        if "OPTIMIZING DAY 2" in line:
            day2_started = True
            print("\n>>> STARTING DAY 2 LOGS")
        
        if "OPTIMIZING DAY 3" in line:
             print("\n>>> END OF DAY 2 LOGS")
             break
             
        if day2_started or "History after Day 1" in line:
            # Print if relevant
            if any(k in line for k in keywords):
                print(f"MATCH: {line.strip()}")

if __name__ == "__main__":
    analyze()
