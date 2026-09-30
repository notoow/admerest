import * as THREE from 'three';
import {ADM_PATTERN} from './adm-pattern.js';

export function admGeometry(width=5/6,height=1,depth=.05,quality='detail'){
 const s=new THREE.Shape(),r=.012,x=-width/2,y=-height/2;
 s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
 const [left,top,right,bottom]=ADM_PATTERN.crop;
 for(const aperture of ADM_PATTERN.features){const hole=new THREE.Path();const points=quality==='detail'?aperture.points:aperture.points.filter((_,i)=>i%4===0);points.forEach(([px,py],i)=>{const a=((px-left)/(right-left)-.5)*width,b=(.5-(py-top)/(bottom-top))*height;if(i===0)hole.moveTo(a,b);else hole.lineTo(a,b);});hole.closePath();s.holes.push(hole);}
 const bevel=.00045,bodyDepth=depth-2*bevel;
 const g=new THREE.ExtrudeGeometry(s,{depth:bodyDepth,bevelEnabled:true,bevelThickness:bevel,bevelSize:.00016,bevelSegments:quality==='detail'?2:1,curveSegments:quality==='detail'?10:6,steps:1});
 g.translate(0,0,-bodyDepth/2);
 const uv=g.attributes.uv,pos=g.attributes.position;
 for(let i=0;i<uv.count;i++)uv.setXY(i,(left+(pos.getX(i)/width+.5)*(right-left))/ADM_PATTERN.image[0],1-(top+(.5-pos.getY(i)/height)*(bottom-top))/ADM_PATTERN.image[1]);
 uv.needsUpdate=true;g.computeVertexNormals();return g;
}
