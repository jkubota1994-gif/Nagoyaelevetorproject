import pandas as pd
import json

try:
    df = pd.read_excel('elevetorlocationspot.xlsx')
    print("Columns:", df.columns.tolist())
    print("First 10 rows:")
    print(df.head(10).to_string())
    
    records = df.to_dict(orient='records')
    with open('elevators_from_excel.json', 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print("Saved to elevators_from_excel.json")
except Exception as e:
    print("Error:", e)
