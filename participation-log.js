import { randomUUID } from 'node:crypto';

export const RETENTION_MS=24*60*60*1000;
export const STATUS_LABELS={playing:'En curso',finished:'Finalizada',left:'Salió de la partida',interrupted:'Interrumpida'};
const count=v=>Math.max(0,Math.floor(Number(v)||0));
const upsert=`INSERT INTO galaxy_participations
 (id,name,mode,score,correct,rounds,status,started_at,expires_at,updated_at)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 ON CONFLICT(id) DO UPDATE SET score=EXCLUDED.score,correct=EXCLUDED.correct,
 rounds=EXCLUDED.rounds,status=EXCLUDED.status,updated_at=EXCLUDED.updated_at
 WHERE EXCLUDED.updated_at>=galaxy_participations.updated_at`;

export class ParticipationLog {
  constructor({now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,onFailure=()=>{}}={}){
    this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;this.onFailure=onFailure;
    this.records=new Map();this.pool=null;this.ready=false;this.queue=Promise.resolve();this.timer=null;
  }
  start(name,mode='solo'){
    const now=this.now(),record={id:randomUUID(),name:String(name||'').trim().slice(0,20),mode:mode==='team'?'team':'solo',score:0,correct:0,rounds:0,status:'playing',startedAt:now,expiresAt:now+RETENTION_MS,updatedAt:now};
    this.prune();this.records.set(record.id,record);this.persist(record);this.schedule();return record.id;
  }
  update(id,values){
    this.prune();const record=this.records.get(id);
    if(!record||record.status!=='playing')return;
    record.score=count(values.score);record.correct=count(values.correct);record.rounds=Math.max(record.rounds,count(values.rounds));
    if(Object.hasOwn(STATUS_LABELS,values.status))record.status=values.status;
    record.updatedAt=this.now();this.persist(record);
  }
  prune(){
    const now=this.now();let removed=false;
    for(const [id,r] of this.records)if(r.expiresAt<=now){this.records.delete(id);removed=true}
    if(removed)this.enqueue(pool=>pool.query('DELETE FROM galaxy_participations WHERE expires_at <= $1',[now]));
    this.schedule();
  }
  schedule(){
    if(this.timer!==null)this.clearTimer(this.timer);this.timer=null;
    if(!this.records.size)return;
    let first=Infinity;for(const r of this.records.values())first=Math.min(first,r.expiresAt);
    this.timer=this.setTimer(()=>{this.timer=null;this.prune()},Math.max(1,first-this.now()));this.timer?.unref?.();
  }
  list(){this.prune();return [...this.records.values()].sort((a,b)=>b.startedAt-a.startedAt||a.name.localeCompare(b.name,'es')).map(r=>({...r}))}
  enqueue(operation){
    const pool=this.pool;if(!pool)return;
    this.queue=this.queue.then(()=>operation(pool)).catch(()=>{if(this.pool===pool){this.pool=null;this.ready=false;this.onFailure()}});
  }
  persist(record){
    const r={...record};this.enqueue(pool=>r.expiresAt<=this.now()?undefined:pool.query(upsert,[r.id,r.name,r.mode,r.score,r.correct,r.rounds,r.status,r.startedAt,r.expiresAt,r.updatedAt]));
  }
  async connect(pool){
    await this.queue;
    await pool.query(`CREATE TABLE IF NOT EXISTS galaxy_participations (
      id TEXT PRIMARY KEY,name TEXT NOT NULL,mode TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,correct INTEGER NOT NULL DEFAULT 0,rounds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL,started_at BIGINT NOT NULL,expires_at BIGINT NOT NULL,updated_at BIGINT NOT NULL)`);
    await pool.query('CREATE INDEX IF NOT EXISTS galaxy_participations_expiry ON galaxy_participations(expires_at)');
    const now=this.now();await pool.query('DELETE FROM galaxy_participations WHERE expires_at <= $1',[now]);
    const loaded=await pool.query('SELECT * FROM galaxy_participations WHERE expires_at > $1 ORDER BY started_at DESC',[now]);
    for(const row of loaded.rows){
      const r={id:row.id,name:row.name,mode:row.mode,score:Number(row.score),correct:Number(row.correct),rounds:Number(row.rounds),status:row.status,startedAt:Number(row.started_at),expiresAt:Number(row.expires_at),updatedAt:Number(row.updated_at)};
      const current=this.records.get(r.id);
      if(!current&&r.status==='playing'){r.status='interrupted';r.updatedAt=now}
      if(!current||r.updatedAt>current.updatedAt)this.records.set(r.id,r);
    }
    this.pool=pool;this.ready=true;this.prune();
    for(const r of this.records.values())this.persist(r);
    await this.queue;if(!this.ready)throw new Error('Participation persistence unavailable');
    this.schedule();
  }
  close(){if(this.timer!==null)this.clearTimer(this.timer);this.timer=null}
}

export function participationCSV(records){
  const date=n=>new Date(n).toLocaleString('es-MX',{timeZone:'America/Mexico_City',hourCycle:'h23'});
  const cell=value=>{let s=String(value??'');if(/^[\s]*[=+\-@]|^[\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
  const rows=[['Piloto','Modalidad','Inicio (Ciudad de México)','Puntaje','Aciertos','Ronda alcanzada','Estado','Borrado del registro (Ciudad de México)']];
  for(const r of records)rows.push([r.name,r.mode==='team'?'Escuadrón':'Individual',date(r.startedAt),r.score,r.correct,r.rounds,STATUS_LABELS[r.status]||r.status,date(r.expiresAt)]);
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
