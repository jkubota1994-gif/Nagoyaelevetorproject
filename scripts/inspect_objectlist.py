import pandas as pd
import sys

try:
    df = pd.read_excel(r'c:\Users\break\.gemini\elevetormapinjectionproject\raw_data\objectlist.xlsx', nrows=5)
    print("Columns:", df.columns.tolist())
    print("First few rows:")
    print(df.to_string())
except Exception as e:
    print(f"Error: {e}")
