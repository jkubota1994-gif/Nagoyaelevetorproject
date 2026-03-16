import zipfile
import glob
import os

# Get the project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(BASE_DIR, 'raw_data')
OUTPUT_DIR = os.path.join(BASE_DIR, 'subway-timetable')

os.makedirs(OUTPUT_DIR, exist_ok=True)
zips = glob.glob(os.path.join(RAW_DATA_DIR, '*subway-timetable*.zip'))
for z in zips:
    print(f"Extracting {z}")
    with zipfile.ZipFile(z, 'r') as zip_ref:
        zip_ref.extractall(OUTPUT_DIR)
print("Done")
