import * as THREE from 'three';

const texture = new THREE.TextureLoader().load('/assets/adm-front.png');
texture.colorSpace = THREE.SRGBColorSpace;
texture.anisotropy = 8;
const face = new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.008,color:0xfff4df,roughness:.83,metalness:0});
const edge = new THREE.MeshStandardMaterial({color:0xe9dec7,roughness:.92});
export const ADM_MATERIALS = [face,edge];

function outline(w,h,r){
 const p=new THREE.Shape();const x=-w/2,y=-h/2;
 p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;
}
// Positions follow the photographed sheet. Geometry, not a printed dot, creates each aperture.
const holes=[[206,235],[411,234],[208,329],[408,329],[306,447],[199,501],[403,502],[109,654],[209,653],[306,650],[408,651],[509,650]];
const slits=[];
for(const x of [135,183,234,284,332,381,433])slits.push([x,205,x-1,252]);
for(const y of [267,297])for(const x of [100,162,222,283,345,407])slits.push([x,y,x+46,y+1]);
for(const x of [100,134,182,229,283,332,382,433,483])slits.push([x,318,x-1,366]);
for(const x of [148,194,240,287,333,380,430,478])slits.push([x,395,x-2,445]);
for(const x of [103,148,192,239,334,382,429,480])slits.push([x,449,x-3,495]);
for(const y of [525,553])for(const x of [102,166,224,285,350,412])slits.push([x,y,x+46,y]);
for(const x of [113,161,210,258,307,354,402,450,498])slits.push([x,580,x-2,630]);
for(const x of [140,187,235,282,330,377,426,473])slits.push([x,608,x-1,649]);

export function admGeometry(width=.70,height=1,depth=.024){
 const s=outline(width,height,.009);
 const point=(x,y)=>[(x/597-.5)*width,(.5-y/849)*height];
 for(const [x,y] of holes){const [px,py]=point(x,y);const h=new THREE.Path();h.absellipse(px,py,9/597*width,9/849*height,0,Math.PI*2,true);s.holes.push(h);}
 for(const [x1,y1,x2,y2] of slits){
  const [ax,ay]=point(x1,y1),[bx,by]=point(x2,y2),d=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/d*.0013,ny=(bx-ax)/d*.0013;
  const h=new THREE.Path();h.moveTo(ax+nx,ay+ny);h.lineTo(bx+nx,by+ny);h.lineTo(bx-nx,by-ny);h.lineTo(ax-nx,ay-ny);h.closePath();s.holes.push(h);
 }
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.0015,bevelSize:.001,bevelSegments:1,curveSegments:9,steps:1});
 g.translate(0,0,-depth/2);
 const uv=g.attributes.uv,pos=g.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i)/width+.5,pos.getY(i)/height+.5);
 uv.needsUpdate=true;g.computeVertexNormals();return g;
}
export const sheetGeometry=admGeometry();
export function createSheet(){const m=new THREE.Mesh(sheetGeometry,ADM_MATERIALS);m.castShadow=true;m.receiveShadow=true;return m;}
export function towerMaterial(repeat){const t=texture.clone();t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,repeat);t.needsUpdate=true;const f=new THREE.MeshStandardMaterial({map:t,color:0xfff8e9,roughness:.9});return [edge,edge,edge,edge,f,f];}

