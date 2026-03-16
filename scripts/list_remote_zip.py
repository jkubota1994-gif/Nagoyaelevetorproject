import urllib.request
import zipfile
import io

url = "https://assets.cms.plateau.reearth.io/assets/79/e43a02-06b6-40c2-ae97-51eba1b4297b/23100_nagoya-shi_city_2022_citygml_4_op.zip"

class HttpFile(io.RawIOBase):
    def __init__(self, url):
        self.url = url
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as resp:
            self.length = int(resp.headers['Content-Length'])
        self.offset = 0

    def seekable(self):
        return True

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            self.offset = offset
        elif whence == io.SEEK_CUR:
            self.offset += offset
        elif whence == io.SEEK_END:
            self.offset = self.length + offset
        return self.offset

    def tell(self):
        return self.offset

    def readable(self):
        return True

    def readinto(self, b):
        if self.offset >= self.length:
            return 0
        end = self.offset + len(b) - 1
        if end >= self.length:
            end = self.length - 1
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
        namelist = zf.namelist()
        
        # Let's see what folders are there
        folders = set()
        for name in namelist:
            parts = name.split('/')
            if len(parts) > 1:
                folders.add(parts[1])
                
        print("Folders inside udx:", folders)
        
        # Find any file containing 'urf' (Urban Furniture) or 'tran' (Transportation)
        # because elevators could be there, or bldg
        urf_files = [n for n in namelist if 'urf/' in n]
        tran_files = [n for n in namelist if 'tran/' in n]
        print(f"Found {len(urf_files)} URF files, {len(tran_files)} TRAN files.")
        
        with open('zip_contents.txt', 'w') as f:
            for name in namelist:
                f.write(name + '\n')
except Exception as e:
    print("Error:", e)
