import pandas as pd
import sys

file_path = "subway-timetable/名城線/ポケット時刻表_平日・土休日Ｍ０１金山.xlsx"
try:
    df = pd.read_excel(file_path, sheet_name=0, header=None)
    print("=== Sheet 1 ===")
    print(df.head(20).to_string())
except Exception as e:
    print(f"Error reading file: {e}")
