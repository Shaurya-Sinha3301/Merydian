
import os

def analyze():
    log_file = "debug_infeasible.txt"
    # UTF-16 LE is standard for PowerShell redirection on Windows
    encodings = ['utf-16', 'utf-8', 'cp1252']
    
    content = ""
    for enc in encodings:
        try:
            with open(log_file, 'r', encoding=enc) as f:
                content = f.read()
            print(f"Successfully read with encoding: {enc}")
            break
        except Exception as e:
            continue
            
    if not content:
        print("Failed to read file with any encoding")
        return

    print("--- LOG ANALYSIS START ---")
    
    # Check if Day 3 Failed
    if "DAY 3 FAILED" in content:
        print("CONFIRMED: DAY 3 FAILED (Infeasible)")
    else:
        print("STATUS: Day 3 seemingly passed?")

    # Extract Day 2 Visits
    lines = content.split('\n')
    day2_started = False
    for line in lines:
        if ">>>> DAY 2 <<<<" in line:
            day2_started = True
            print(">>> STARTING DAY 2 LOGS")
        if ">>>> DAY 3 <<<<" in line:
            day2_started = False
            print(">>> END OF DAY 2 LOGS")
            
        if day2_started:
            # Check for Qutub Minar
            if "Qutub Minar" in line or "LOC_002" in line:
                print(f"MATCH: {line.strip()}")
            # Check for Lotus Temple
            if "Lotus Temple" in line or "LOC_004" in line:
                print(f"MATCH: {line.strip()}")

if __name__ == "__main__":
    analyze()
