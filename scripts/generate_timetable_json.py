import pandas as pd
import zipfile
import json
import os
import re
import io

# Get the project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(BASE_DIR, 'raw_data')
DATA_DIR = os.path.join(BASE_DIR, 'data')

res = {}

zips = [
    "20230916_subway-timetable-sakuradoriline.zip",
    "20240316_subway-timetable-kamiidaline.zip",
    "20240316_subway-timetable-tsurumailine.zip",
    "20250329_subway-timetable-higashiyamaline_.zip",
    "20250929_subway-timetable-meijoline.zip",
    "20250929_subway-timetable-meikoline.zip"
]

print(f"Processing {len(zips)} zip files")

for zip_filename in zips:
    zip_path = os.path.join(RAW_DATA_DIR, zip_filename)
    if not os.path.exists(zip_path):
        print(f"Skipping {zip_filename} (not found in {RAW_DATA_DIR})")
        continue
        
    print(f"Processing {zip_filename}...")
    try:
        with zipfile.ZipFile(zip_path, 'r') as z:
            for info in z.infolist():
                if info.filename.endswith('.xlsx'):
                    try:
                        # Read ALL sheets from excel directly from zip
                        with z.open(info) as f:
                            content = f.read()
                            excel_file = pd.ExcelFile(io.BytesIO(content))
                            sheet_names = excel_file.sheet_names
                            
                        for sheet_name in sheet_names:
                            df = excel_file.parse(sheet_name, header=None)
                            
                            station_dir = ""
                            for r in range(min(5, df.shape[0])):
                                for v in df.iloc[r].values:
                                    if pd.notna(v) and str(v).strip():
                                        s = str(v).strip()
                                        if "駅" in s and "方面" in s:
                                            station_dir = s
                                            break
                                        elif "駅" in s and not station_dir:
                                            station_dir = s
                                if station_dir and "方面" in station_dir: break

                            if not station_dir: continue
                            
                            m = re.search(r'(.+?)駅[\s（(](.+?)[）)]', station_dir)
                            if not m:
                                station_name = station_dir.split('駅')[0] if '駅' in station_dir else station_dir
                                direction = "方面"
                            else:
                                station_name = m.group(1).strip()
                                station_name = re.sub(r'\(.+?\)', '', station_name).strip()
                                direction = m.group(2).strip()
                                if not direction.endswith("方面") and direction != "方面":
                                    direction += "方面"
                                
                            if station_name not in res:
                                res[station_name] = {}
                            if direction not in res[station_name]:
                                res[station_name][direction] = {"平日": {}, "土休日": {}}
                                
                            weekend_col_start = len(df.columns) // 2
                            
                            for i in range(df.shape[0]):
                                row = df.iloc[i].values
                                if len(row) < 2: continue
                                
                                for is_weekend in [False, True]:
                                    start_c = 1 if not is_weekend else weekend_col_start
                                    end_c = weekend_col_start if not is_weekend else len(row)
                                    
                                    h = None
                                    mins = []
                                    for c in range(start_c, end_c):
                                        if c >= len(row): break
                                        v = row[c]
                                        if pd.notna(v):
                                            try:
                                                val_str = str(v).strip()
                                                if not val_str: continue
                                                
                                                val = float(val_str)
                                                if val.is_integer():
                                                    ival = int(val)
                                                    if h is None:
                                                        if 4 <= ival <= 24 or ival == 0:
                                                            h = ival
                                                    else:
                                                        if 0 <= ival < 60:
                                                            mins.append(ival)
                                            except:
                                                pass
                                    if h is not None:
                                        day_type = "土休日" if is_weekend else "平日"
                                        h_str = str(h)
                                        if h_str not in res[station_name][direction][day_type]:
                                           res[station_name][direction][day_type][h_str] = mins
                                        else:
                                           res[station_name][direction][day_type][h_str].extend(mins)
                    except Exception as e:
                        print(f"Error processing {info.filename} in {zip_filename}: {e}")
    except Exception as e:
        print(f"Error opening {zip_filename}: {e}")

for st in res:
    for d in res[st]:
       for dt in res[st][d]:
          for h in res[st][d][dt]:
             res[st][d][dt][h] = sorted(list(set(res[st][d][dt][h])))

os.makedirs(DATA_DIR, exist_ok=True)
output_path = os.path.join(DATA_DIR, 'timetable.js')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write("const timetableData = " + json.dumps(res, ensure_ascii=False) + ";\n")

print(f"Done generating {output_path}")
