def analyze():
    log_file = "verify_dupe.txt"
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

    print("--- DUPLICATION CHECK START ---")
    
    lines = content.split('\n')
    in_day_3 = False
    in_fam_c = False
    fam_c_lines = []

    for line in lines:
        if ">>>> DAY 3 <<<<" in line:
            in_day_3 = True
            print("Found DAY 3 block")
        if ">>>> DAY 4 <<<<" in line or "Final Optimization Status" in line:
            in_day_3 = False
            
        if in_day_3:
            if "FAM_C:" in line:
                in_fam_c = True
                print("Found FAM_C block in Day 3")
            elif "FAM_A:" in line or "FAM_B:" in line:
                in_fam_c = False
            
            if in_fam_c and "Parikrama" in line:
                print(f"  > Found Parikrama visit: {line.strip()}")
                fam_c_lines.append(line.strip())

    if len(fam_c_lines) > 1:
        print(f"⚠️  DUPLICATION DETECTED: Parikrama appears {len(fam_c_lines)} times for FAM_C Day 3!")
    elif len(fam_c_lines) == 1:
         print("✅  No duplication: Parikrama appears exactly once.")
    else:
         print("❓  Parikrama not found in FAM_C Day 3.")
