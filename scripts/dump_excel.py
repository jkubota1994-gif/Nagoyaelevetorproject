import pandas as pd
import sys

file_path = "subway-timetable/名城線/ポケット時刻表_平日・土休日Ｍ０１金山.xlsx"
df = pd.read_excel(file_path, sheet_name=0, header=None)
with open('debug_excel.txt', 'w', encoding='utf-8') as f:
    for i in range(df.shape[0]):
        row = df.iloc[i].values
        row_str = [str(x) if pd.notna(x) else "" for x in row]
        f.write("\t".join(row_str) + "\n")
print("Saved to debug_excel.txt")
