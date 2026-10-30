import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceArcadeRoom, arcadeLevel } from '../arcade-room.js';

function room(){return {started:true,round:0,total:null,players:new Map([['a',{id:'a',shield:2,answered:false,streak:0}]])}}

test('continuous arcade survives 60 answered rounds and keeps the difficulty bounded',()=>{
  const r=room();
  for(let n=1;n<=60;n++){
    for(const p of r.players.values())p.answered=true;
    const result=advanceArcadeRoom(r,1000*n);
    assert.equal(result.finished,false);
    assert.equal(r.started,true);
    assert.equal(r.round,n);
    assert.equal(r.deadline,1000*n+10000);
    assert.ok(arcadeLevel(r.round)>=1&&arcadeLevel(r.round)<=5);
    assert.ok(Number.isFinite(r.question.answer));
  }
  assert.equal(r.round,60);
  assert.equal(r.players.get('a').shield,2);
});

test('missing two questions consumes the initial lives and ends the run',()=>{
  const r=room();advanceArcadeRoom(r,0);
  const answer=r.question.answer;
  assert.deepEqual(advanceArcadeRoom(r,10000).missed,[{id:'a',shield:1,answer}]);
  assert.equal(r.round,2);
  const result=advanceArcadeRoom(r,20000);
  assert.equal(result.finished,true);
  assert.equal(r.started,false);
  assert.equal(r.players.get('a').shield,0);
  assert.equal(r.round,2);
});

test('an eliminated player cannot end the team run while another pilot survives',()=>{
  const r=room();r.players.set('b',{id:'b',shield:0,answered:true,streak:0});
  advanceArcadeRoom(r);r.players.get('a').answered=true;
  assert.equal(advanceArcadeRoom(r).finished,false);
  assert.equal(r.round,2);
  assert.equal(r.players.get('b').shield,0);
  assert.equal(r.players.get('b').answered,true);
});
