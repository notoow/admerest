import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOverlayNavigation} from '../dist/overlay-navigation.js';

function fixture(){
 const host=new EventTarget(),states=[{section:'play'}];let index=0,pending=0;
 host.history={get state(){return states[index];},pushState(state){states.splice(++index);states.push(state);},back(){pending++;}};
 return {host,track:createOverlayNavigation(host),flush(){assert(pending>0);pending--;index--;host.dispatchEvent(new Event('popstate'));},get pending(){return pending;},get index(){return index;}};
}
test('browser Back dismisses the experience once and preserves the section history',()=>{
 const f=fixture();let closed=0;const release=f.track(()=>{closed++;release();});
 assert.equal(f.index,1);f.host.history.back();f.flush();
 assert.equal(closed,1);assert.equal(f.pending,0);assert.deepEqual(f.host.history.state,{section:'play'});
});
test('manual dismissal waits for its own Back before a replacement overlay opens',async()=>{
 const f=fixture();let closed=0;const release=f.track(()=>closed++),done=release();
 release();assert.equal(f.pending,1);const replacement=f.track(()=>closed++);
 assert.equal(f.index,1);f.flush();await done;
 assert.equal(closed,0);assert.equal(f.index,1);
 f.host.history.back();f.flush();assert.equal(closed,1);replacement();assert.equal(f.pending,0);
});
test('an overlay closed while waiting never creates a phantom Back step',async()=>{
 const f=fixture(),done=f.track(()=>{})();f.track(()=>{})();f.flush();await done;
 assert.equal(f.index,0);assert.equal(f.pending,0);
});
test('pagehide tears down the visual without navigating the destination backwards',()=>{
 const f=fixture();let closed=0;const release=f.track(()=>{closed++;release();});
 f.host.dispatchEvent(new Event('pagehide'));assert.equal(closed,1);assert.equal(f.pending,0);
});
