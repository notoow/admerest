import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const source=readFileSync(new URL('../dist/journey.js',import.meta.url),'utf8').replace(/^import .*;\r?$/gm,'').replace('export class ScrollJourney','class ScrollJourney');
 const scrolls=[],hint={},vars={};let stageHeight=601,headerHeight=99,sectionTop=99;
 const context=vm.createContext({innerHeight:700,matchMedia:()=>({matches:false}),window:{scrollY:0,scrollTo:value=>scrolls.push(value)}});
 vm.runInContext(source+'\nthis.ScrollJourney=ScrollJourney;',context);
 const journey=Object.create(context.ScrollJourney.prototype);
 Object.assign(journey,{phase:2,progress:1,header:{getBoundingClientRect:()=>({height:headerHeight})},stage:{getBoundingClientRect:()=>({height:stageHeight,top:headerHeight,bottom:headerHeight+stageHeight}),get offsetHeight(){return stageHeight;},scrollIntoView:value=>scrolls.push(value)},section:{dataset:{},style:{setProperty:(k,v)=>{vars[k]=v;}},querySelector:()=>hint,getBoundingClientRect:()=>({top:sectionTop}),offsetHeight:1855}});
 return {journey,context,scrolls,hint,vars,height:v=>{stageHeight=v;},header:v=>{headerHeight=v;},top:v=>{sectionTop=v;}};
}
test('content that outgrows the space below the real header leaves sticky mode and can recover',()=>{
 const f=fixture();f.journey.fitLayout();assert.equal(f.journey.section.dataset.layout,'sticky');
 f.height(650);f.journey.fitLayout();assert.equal(f.journey.section.dataset.layout,'flow');assert.equal(f.journey.progress,1);assert.equal(f.scrolls.at(-1).top,0,'resizing must keep the current chapter on screen');
 f.header(120);f.journey.fitLayout();assert.equal(f.vars['--journey-header-height'],'120px');
 f.context.innerHeight=900;f.journey.fitLayout();assert.equal(f.journey.section.dataset.layout,'sticky');
});
test('in page flow every chapter remains selectable and scrolling does not overwrite the selection',()=>{
 const f=fixture();f.height(720);f.journey.fitLayout();
 for(const [chapter,progress] of [[0,0],[1,.5],[2,1]]){
  f.journey.selectChapter(chapter);f.top(-600);f.journey.readScrollProgress();assert.equal(f.journey.progress,progress);
  assert.equal(f.scrolls.at(-1).block,'start');assert.equal(f.scrolls.at(-1).top,undefined);
 }
 assert.match(f.hint.textContent,/장면을 선택/);
});
test('sticky chapter navigation accounts for the header and matches scroll progress',()=>{
 const f=fixture();f.journey.fitLayout();
 f.journey.selectChapter(2);assert.equal(f.scrolls.at(-1).top,1254);
 f.top(99-1254);f.journey.readScrollProgress();assert.equal(f.journey.progress,1);
 f.journey.selectChapter(0);assert.equal(f.scrolls.at(-1).top,0);
 f.top(300);f.journey.readScrollProgress();assert.equal(f.journey.progress,0);
});
