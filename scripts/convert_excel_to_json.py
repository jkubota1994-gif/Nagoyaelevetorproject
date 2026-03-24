import pandas as pd
import json
import os

EXCEL_PATH = os.path.join('raw_data', 'elevetorlocationspot.xlsx')
JSON_PATH = os.path.join('raw_data', 'elevators_from_excel.json')

try:
    if not os.path.exists(EXCEL_PATH):
        print(f"Error: {EXCEL_PATH} not found.")
        exit(1)
        
    df = pd.read_excel(EXCEL_PATH)
    print("Columns found:", df.columns.tolist())
    
    records = df.to_dict(orient='records')
    
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully converted {EXCEL_PATH} to {JSON_PATH}")
    print(f"Total records: {len(records)}")
    
except Exception as e:
    print(f"Error: {e}")
