import urllib.request
import zipfile
import io
import re

url = "https://assets.cms.plateau.reearth.io/assets/79/e43a02-06b6-40c2-ae97-51eba1b4297b/23100_nagoya-shi_city_2022_citygml_4_op.zip"

class HttpFile(io.RawIOBase):
    def __init__(self, url):
        self.url = url
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as resp:
            self.length = int(resp.headers['Content-Length'])
        self.offset = 0

    def seekable(self): return True
    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET: self.offset = offset
        elif whence == io.SEEK_CUR: self.offset += offset
        elif whence == io.SEEK_END: self.offset = self.length + offset
        return self.offset
    def tell(self): return self.offset
    def readable(self): return True
    def readinto(self, b):
        if self.offset >= self.length: return 0
        end = min(self.offset + len(b) - 1, self.length - 1)
        req = urllib.request.Request(self.url)
        req.add_header('Range', f'bytes={self.offset}-{end}')
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
            b[:len(data)] = data
            self.offset += len(data)
            return len(data)

try:
    http_file = HttpFile(url)
    with zipfile.ZipFile(http_file) as zf:
        urf_files = [n for n in zf.namelist() if 'udx/urf/' in n and n.endswith('.gml')]
        print(f"Found {len(urf_files)} URF files. Searching for elevators...")
        found = False
        for name in urf_files:
            with zf.open(name) as f:
                content = f.read().decode('utf-8')
                if 'エレベータ' in content or 'Elevator' in content:
                    print(f"Found match in {name}")
                    found = True
                    with open(name.split('/')[-1], 'w', encoding='utf-8') as out:
                        out.write(content)
        if not found:
            print("No elevators found in URF files.")
except Exception as e:
    print("Error:", e)
