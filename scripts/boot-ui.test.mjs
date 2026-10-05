import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/boot-ui.js',import.meta.url),'utf8');
function boot(){
 const nodes=new Map(),events=new Map(),timers=new Map();let next=0;
 const node=key=>{if(!nodes.has(key))nodes.set(key,{hidden:false,dataset:{},addEventListener(name,fn){this[name]=fn;},removeAttribute(key){delete this[key];}});return nodes.get(key);};
 const panel=node('panel');panel.querySelector=node;
 const root={dataset:{},classList:{remove(){root.unlocked=true;},add(){root.unlocked=false;}}};
 vm.runInNewContext(source,{document:{querySelector:()=>panel,documentElement:root},location:{reload(){root.reloaded=true;}},addEventListener:(key,fn)=>events.set(key,fn),setTimeout:fn=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)});
 return {node,panel,root,timers,event:detail=>events.get('admerest-load')({detail})};
}
test('loader shows actual download progress and releases the page only at ready',()=>{
 const b=boot();b.event({phase:'model',label:'Loading',loaded:512,total:1024});
 assert.equal(b.node('progress').value,.5);assert.match(b.node('[data-boot-detail]').textContent,/50%/);assert.equal(b.panel.hidden,false);
 b.event({phase:'scene',label:'Building'});assert.equal(b.node('progress').value,undefined);
 b.event({phase:'ready',label:'Ready'});assert.equal(b.panel.hidden,true);assert.equal(b.root.unlocked,true);assert.equal(b.timers.size,0);
 b.event({phase:'model',label:'late'});assert.equal(b.panel.hidden,true);
});
test('slow, dismissed and failed startup keeps a working retry instead of trapping the user',()=>{
 const b=boot();for(const timer of b.timers.values())timer();assert.equal(b.node('[data-boot-retry]').hidden,false);
 b.node('[data-boot-continue]').click();assert.equal(b.panel.hidden,true);assert.equal(b.root.unlocked,true);
 b.event({phase:'error',label:'Failed'});assert.equal(b.panel.hidden,false);assert.equal(b.panel.dataset.failed,'true');
 b.node('[data-boot-retry]').click();assert.equal(b.root.reloaded,true);
});
