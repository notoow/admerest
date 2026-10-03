import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readExperience,saveExperience} from '../dist/experience-session.js';

const sample={quantity:1234,size:'6x12',playView:'tower',towerAdded:true,towerOpen:true};
function storage(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),data};}

test('a tab round trip retains accepted count, size and tower without storing identity',()=>{
 const tab=storage();
 assert.equal(readExperience(tab),null);
 assert.equal(saveExperience({...sample,name:'not a simulation field',verified:true},tab),true);
 assert.deepEqual(readExperience(tab),{version:1,...sample});
 assert(![...tab.data.values()][0].includes('name'));
 assert(![...tab.data.values()][0].includes('verified'));
});
test('zero and the largest count survive, while a never-added tower cannot reopen',()=>{
 const tab=storage();
 for(const quantity of [0,100000]){
  saveExperience({...sample,quantity,towerAdded:false},tab);
  assert.equal(readExperience(tab).quantity,quantity);
  assert.equal(readExperience(tab).towerOpen,false);
 }
});
test('corrupt, obsolete and out-of-range sessions safely fall back',()=>{
 const base={version:1,...sample};
 for(const value of ['{',null,[],{...base,version:2},{...base,quantity:-1},{...base,quantity:1.5},{...base,quantity:'1234'},{...base,quantity:100001},{...base,size:'__proto__'},{...base,playView:'unknown'},{...base,towerOpen:'true'}]){
  const text=typeof value==='string'?value:JSON.stringify(value);
  assert.equal(readExperience({getItem:()=>text}),null);
 }
 const tab=storage();assert.equal(saveExperience({...sample,quantity:NaN},tab),false);assert.equal(tab.data.size,0);
});
test('unavailable storage never interrupts the calculator',()=>{
 const denied={getItem(){throw Error('denied');},setItem(){throw Error('quota');}};
 assert.equal(readExperience(denied),null);assert.equal(saveExperience(sample,denied),false);
});
