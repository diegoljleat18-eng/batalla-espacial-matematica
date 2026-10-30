import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANETS,makeQuestion,bank,diagnostic,metrics,recommended,parseAnswer,csvCell,points} from '../public/aula/model.js';

let seed=923451;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const calculate=text=>{const expression=text.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-');assert.match(expression,/^[\d\s+*/().-]+$/);return Function('return ('+expression+')')()};

test('all procedures and difficulties generate mathematically valid explanations and choices',()=>{
  for(const p of PLANETS)for(const level of [1,2,3])for(let i=0;i<250;i++){
    const q=makeQuestion(p.id,level,random);
    assert.equal(calculate(q.text),q.answer,q.text);
    assert.ok(Number.isInteger(q.answer)&&q.answer>=0);
    assert.equal(new Set(q.options).size,4);
    assert.equal(q.options.filter(n=>n===q.answer).length,1);
    for(const expression of q.equivalents)assert.equal(calculate(expression),q.answer,expression);
    for(const step of q.steps.filter(s=>s.includes('='))){const [left,right]=step.split('=');assert.equal(calculate(left),Number(right),step)}
  }
});
test('each mission has eight unique challenges and two unseen transfer operations',()=>{
  for(const p of PLANETS)for(const level of [1,2,3]){
    const practice=bank(p.id,8,level,[],random);
    const transfer=bank(p.id,2,level,practice.map(q=>q.text),random);
    assert.equal(new Set([...practice,...transfer].map(q=>q.text)).size,10);
  }
  assert.equal(diagnostic(2,random).length,5);
});
test('reports and rewards distinguish independent work, hints, retries and time support',()=>{
  const first={phase:'practice',strategy:'decenas',correct:true,hints:0,timedOut:false,attempts:[{value:65,correct:true}],seconds:8};
  const retry={...first,hints:1,attempts:[{value:64,correct:false},{value:65,correct:true}],seconds:12};
  const timed={...first,timedOut:true};
  const wrong={...first,correct:false,attempts:[{value:64,correct:false},{value:63,correct:false}]};
  assert.deepEqual(metrics([first,retry,timed,wrong]),{total:4,correct:3,independent:1,errors:3,hints:1,timeouts:1,seconds:36});
  assert.equal(points(first),10);assert.equal(points(retry),5);assert.equal(points(timed),5);assert.equal(points(wrong),0);
  assert.equal(points({...first,phase:'diagnostic'}),0);
  const session={records:PLANETS.map((p,i)=>({...first,strategy:p.id,phase:'diagnostic',correct:i!==2}))};
  assert.equal(recommended(session),'dobles');
});
test('written answers reject empty or malformed entries and CSV neutralizes spreadsheet formulas',()=>{
  for(const v of ['', ' ', '2+3','5,0','1e2','Infinity','NaN'])assert.equal(parseAnswer(v),null);
  assert.equal(parseAnswer(' 65 '),65);assert.equal(parseAnswer('-2'),-2);
  assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('Ana "Luna"'),'"Ana ""Luna"""');
});
