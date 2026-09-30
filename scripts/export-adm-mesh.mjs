import {writeFileSync} from 'node:fs';
import {admGeometry} from '../dist/adm-geometry.js';
const serialize=quality=>{const g=admGeometry(5/6,1,.05,quality);return {position:[...g.attributes.position.array],uv:[...g.attributes.uv.array],groups:g.groups,normalizedDimensions:[5/6,1,.05]};};
const detail=serialize('detail'),lod=serialize('motion');
writeFileSync(new URL('../models/adm-mesh.json',import.meta.url),JSON.stringify({detail,lod}));
console.log(`Exported detail ${detail.position.length/9}, motion ${lod.position.length/9} triangles for Blender.`);
