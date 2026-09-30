"""Analyze the supplied photo to recover aperture contours; never modifies the photo."""
from pathlib import Path
import cv2, json, numpy as np
from PIL import Image

root=Path(__file__).resolve().parents[1]
rgb=np.asarray(Image.open(root/'dist/assets/adm-front.png').convert('RGB'))
hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
mask=((hsv[:,:,1]>43)&(hsv[:,:,2]<234)).astype('uint8')*255
mask[:180]=0;mask[682:]=0;mask[:,:75]=0;mask[:,530:]=0
mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
n,labels,stats,centers=cv2.connectedComponentsWithStats(mask)
features=[]
for i in range(1,n):
    x,y,w,h,area=stats[i]
    if area<=45: continue
    contours,_=cv2.findContours((labels==i).astype('uint8'),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    contour=max(contours,key=cv2.contourArea)
    points=cv2.approxPolyDP(contour,.45,True).reshape(-1,2).astype(float)
    # Subpixel corner rounding keeps the original asymmetry of the punched/cut edge.
    for _ in range(2):
        nxt=np.roll(points,-1,axis=0)
        points=np.stack((points*.75+nxt*.25,points*.25+nxt*.75),axis=1).reshape(-1,2)
    points=(points-centers[i])*1.035+centers[i]
    # A curved slit's centroid can lie outside its opening. Probe the widest interior instead.
    origin=points.min(axis=0)-2
    contour_mask=np.zeros(tuple(np.ceil((points.max(axis=0)-origin+2)*8).astype(int)[::-1]),np.uint8)
    cv2.fillPoly(contour_mask,[np.round((points-origin)*8).astype(np.int32)],255)
    distance=cv2.distanceTransform(contour_mask,cv2.DIST_L2,5)
    py,px=np.unravel_index(distance.argmax(),distance.shape)
    probe=origin+np.array([px,py])/8
    features.append({'kind':'round' if .55<w/h<1.8 else 'slit','center':centers[i].round(3).tolist(),'probe':probe.round(3).tolist(),'points':points.round(3).tolist()})
features.sort(key=lambda f:(round(f['center'][1]/30),f['center'][0]))
assert len(features)==95
assert sum(f['kind']=='round' for f in features)==12
pattern={'image':[597,849],'crop':[5,3,592,846],'roundCount':12,'slitCount':83,'features':features}
(root/'models/adm-pattern.json').write_text(json.dumps(pattern,indent=2),encoding='utf8')
(root/'dist/adm-pattern.js').write_text('// Aperture outlines measured from the supplied photo. Pixel coordinates.\nexport const ADM_PATTERN='+json.dumps(pattern,separators=(',',':'))+';\n',encoding='utf8')
print('Traced 12 round apertures and 83 slits from the reference photo.')
