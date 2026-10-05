import {test} from 'node:test';
import assert from 'node:assert/strict';
import {VideoRoom} from '../dist/video-player.js';

// A small DOM adapter exercises lifecycle and async races without requesting YouTube.
function fixture(t,loadAPI){
 class Element {
  constructor(){this.children=[];this.nodes=new Map();this.dataset={};this.classList={add(){},remove(){}};}
  setAttribute(){} addEventListener(){} getBoundingClientRect(){return {top:100,bottom:300};} scrollIntoView(){}
  append(...children){this.children.push(...children);} replaceChildren(){this.children=[];}
  querySelector(selector){if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector);}
  querySelectorAll(selector){return selector==='iframe'?this.children:[];}
  focus(){this.focused=true;} showModal(){this.open=true;} close(){this.open=false;}
 }
 const saved=Object.fromEntries(['document','location','addEventListener','innerHeight','matchMedia'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 globalThis.innerHeight=1000;globalThis.matchMedia=()=>({matches:true});globalThis.document={querySelector:()=>null,body:new Element(),createElement:()=>new Element()};globalThis.location={origin:'https://example.test'};globalThis.addEventListener=()=>{};
 const cards=['sMoM10ZrBmE','tM3rcIBuNds'].map((id,index)=>{const card=new Element();card.dataset={videoId:id,videoFormat:index===0?'short':'wide'};card.querySelector('h3').textContent='Test '+index;card.querySelector('.video-links a').href='https://www.youtube.com/watch?v='+id;return card;});
 const room=new VideoRoom(cards,{loadAPI});
 t.after(()=>{room.close();for(const [key,descriptor]of Object.entries(saved)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {room,cards};
}
function fakeAPI(){const players=[];return {players,PlayerState:{ENDED:0,PLAYING:1,PAUSED:2},Player:class{constructor(frame,options){this.events=options.events;players.push(this);}destroy(){this.destroyed=true;}}};}

test('close during API loading removes the frame and cannot resurrect a player',async t=>{
 let resolve;const pending=new Promise(r=>resolve=r),api=fakeAPI(),{room,cards}=fixture(t,()=>pending);
 const opening=room.open(0);assert.equal(room.state().iframeCount,1);assert.equal(room.dialog,undefined,'inline playback never creates a dialog');assert(cards[0].querySelector('.video-stage').children.includes(room.screen));room.close();resolve(api);await opening;
 assert.equal(api.players.length,0);assert.equal(room.state().iframeCount,0);assert.equal(room.status,'closed');assert(cards[0].querySelector('.video-poster').focused);
});
test('next video destroys previous playback and ignores its delayed end event',async t=>{
 const api=fakeAPI(),{room}=fixture(t,async()=>api);await room.open(0);const first=api.players[0];await room.open(1);
 assert(first.destroyed);first.events.onStateChange({data:0});assert.equal(room.state().videoId,'tM3rcIBuNds');assert.equal(room.state().iframeCount,1);
 api.players[1].events.onStateChange({data:1});assert.equal(room.status,'playing');room.close();assert(api.players[1].destroyed);
});
test('natural completion removes the iframe and offers replay without playing two videos',async t=>{
 const api=fakeAPI(),{room}=fixture(t,async()=>api);await room.open(0);api.players[0].events.onStateChange({data:0});
 assert.equal(room.status,'ended');assert.equal(room.state().iframeCount,0);assert.equal(room.view.finished.hidden,false);
 await room.open(0);assert.equal(room.state().iframeCount,1);assert.equal(room.view.finished.hidden,true);
});
test('API failure preserves the native embed and external alternative; close still stops it',async t=>{
 const {room}=fixture(t,async()=>{throw new Error('blocked');});await room.open(0);
 assert.equal(room.status,'direct');assert.equal(room.state().iframeCount,1);assert.match(room.cards[0].querySelector('.video-links a').href,/youtube\.com/);
 room.close();assert.equal(room.state().iframeCount,0);
});
