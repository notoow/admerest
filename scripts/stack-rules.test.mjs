import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StackRound,assessBalance,STACK_GOAL} from '../dist/stack-rules.js';
const advance=(game,n=14)=>{for(let i=0;i<n;i++)game.step(.05);};
test('aligned sheets reach the goal with exact 3 mm heights and alternating entries',()=>{
 const game=new StackRound();game.reset();
 for(let i=0;i<STACK_GOAL;i++){assert.equal(game.incoming.side,i%2===0?-1:1);game.incoming.x=.1;assert(game.place());assert(!game.place(),'double input cannot place twice');advance(game);}
 assert.equal(game.status,'clear');assert.equal(game.score,50);assert.equal(game.perfects,50);assert.equal(game.snapshot().heightCm,15);assert.equal(game.risk,0);
});
test('a missed sheet scores nothing and ends the round',()=>{
 const game=new StackRound();game.reset();game.incoming.x=7;game.place();advance(game);assert.equal(game.score,0);assert.equal(game.failure.reason,'miss');assert.equal(game.status,'over');assert.equal(game.stack.length,0);
});
test('overlapping sheets can still topple when their combined mass leaves a lower support',()=>{
 const balanced=assessBalance([{x:1},{x:2}]);assert.equal(balanced.stable,true);
 const leaning=assessBalance([{x:1.5},{x:3},{x:4.5}]);assert.equal(leaning.stable,false);assert.equal(leaning.index,0);assert.equal(leaning.direction,1);
 const game=new StackRound();game.reset();for(const x of [1.5,3,4.5]){game.incoming.x=x;game.place();advance(game);}assert.equal(game.status,'over');assert.equal(game.failure.reason,'balance');assert.equal(game.score,2);
});
test('pause preserves incoming position and a partly dropped sheet; reset clears previous failures',()=>{
 const game=new StackRound();game.reset();game.step(.05);game.pause();const x=game.incoming.x;advance(game,50);assert.equal(game.incoming.x,x);assert(!game.place());game.resume();assert.equal(game.status,'moving');game.incoming.x=0;game.place();game.step(.05);game.pause();advance(game,50);assert.equal(game.elapsed,.05);game.resume();advance(game);assert.equal(game.score,1);game.reset();assert.equal(game.score,0);assert.equal(game.perfects,0);assert.equal(game.failure,null);
});
