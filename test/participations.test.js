import test from 'node:test';
import assert from 'node:assert/strict';
import {ParticipationLog,RETENTION_MS,participationCSV} from '../participation-log.js';

function harness(start=100000){
  let now=start;const timers=[];
  const log=new ParticipationLog({now:()=>now,setTimer:(fn,delay)=>{const t={fn,delay};timers.push(t);return t},clearTimer:()=>{}});
  return {log,timers,setTime:n=>{now=n},now:()=>now};
}
test('every started game has its own record, including zero scores and repeated names',()=>{
  const {log}=harness();const first=log.start('Luna'),second=log.start('Luna','team');
  assert.notEqual(first,second);assert.equal(log.list().length,2);
  assert.ok(log.list().every(r=>r.score===0&&r.correct===0));
  assert.deepEqual(new Set(log.list().map(r=>r.mode)),new Set(['solo','team']));
});
test('updates never extend retention and records expire exactly at their own 24-hour boundary',()=>{
  const h=harness(),first=h.log.start('Primero');
  h.setTime(100000+3600000);const second=h.log.start('Después');
  h.log.update(first,{score:100,correct:1,rounds:2,status:'playing'});
  assert.equal(h.log.list().find(r=>r.id===first).expiresAt,100000+RETENTION_MS);
  h.setTime(100000+RETENTION_MS-1);assert.equal(h.log.list().length,2);
  h.setTime(100000+RETENTION_MS);assert.deepEqual(h.log.list().map(r=>r.id),[second]);
  h.log.update(first,{score:999,correct:9,rounds:9,status:'finished'});
  assert.equal(h.log.list().length,1);
  assert.ok(!participationCSV(h.log.list()).includes('Primero'));
  h.setTime(100000+3600000+RETENTION_MS);h.timers.at(-1).fn();assert.equal(h.log.records.size,0);
});
test('finished and disconnected records keep their final totals',()=>{
  const {log}=harness(),id=log.start('Final');log.update(id,{score:120,correct:1,rounds:2,status:'finished'});
  log.update(id,{score:0,correct:0,rounds:10,status:'left'});
  assert.equal(log.list()[0].status,'finished');assert.equal(log.list()[0].score,120);assert.equal(log.list()[0].rounds,2);
});
test('storage restore keeps the original expiry, marks interrupted games and deletes expired rows',async()=>{
  const h=harness(),queries=[];
  const row={id:'persisted',name:'Guardado',mode:'solo',score:50,correct:1,rounds:1,status:'playing',started_at:90000,expires_at:90000+RETENTION_MS,updated_at:95000};
  const pool={query:async(sql,args=[])=>{queries.push({sql,args});return {rows:sql.startsWith('SELECT')?[row]:[]}}};
  await h.log.connect(pool);assert.equal(h.log.ready,true);assert.equal(h.log.list()[0].status,'interrupted');
  assert.equal(h.log.list()[0].expiresAt,90000+RETENTION_MS);
  h.setTime(90000+RETENTION_MS);assert.equal(h.log.list().length,0);await h.log.queue;
  assert.ok(queries.some(q=>q.sql==='DELETE FROM galaxy_participations WHERE expires_at <= $1'&&q.args[0]===90000+RETENTION_MS));
  assert.ok(queries.every(q=>!q.sql.includes('galaxy_scores')));
});
test('CSV contains zero-score entries, quotes names, and protects spreadsheet formula cells',()=>{
  const {log}=harness();log.start('=1+1');log.start('Ana "Luna"');
  const csv=participationCSV(log.list());assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('"Ana ""Luna"""'));
  assert.ok(csv.includes('"0","0","0","En curso"'));
  assert.equal(csv.split('\r\n').length,3);
});
