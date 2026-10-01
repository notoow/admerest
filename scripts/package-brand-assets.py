"""Package supplied, unchanged notoow artwork for web/icon formats.

Run with the 3D and 2D source PNG paths as arguments. Only icon sizing,
transparent square padding and PNG/ICO encoding are performed.
"""
from pathlib import Path
from PIL import Image
import shutil
import sys

root = Path(__file__).resolve().parents[1]
out = root / 'dist/assets/brand'
out.mkdir(parents=True, exist_ok=True)
shutil.copyfile(sys.argv[1], out / 'notoow-3d.png')
shutil.copyfile(sys.argv[2], out / 'notoow-2d.png')
source = Image.open(sys.argv[1]).convert('RGBA')

def icon(size):
    artwork = source.copy()
    artwork.thumbnail((round(size*.92), round(size*.92)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(artwork, ((size-artwork.width)//2, (size-artwork.height)//2))
    return canvas

for size in (16, 32, 48, 180, 192, 512):
    icon(size).save(out / f'icon-{size}.png', optimize=True)
icon(256).save(root / 'dist/favicon.ico', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Original logos copied without pixel changes; transparent 3D PNG/ICO icons packaged.')
