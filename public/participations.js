(()=>{
  const get=id=>document.getElementById(id),labels={playing:'En curso',finished:'Finalizada',left:'Salió de la partida',interrupted:'Interrumpida'};
  let records=[],offset=0,page=0,loading=false,lastLoad=0,lastMinute=-1,lastCount=-1;
  const pageSize=20;
  function render(){
    const now=Date.now()+offset,active=records.filter(r=>r.expiresAt>now),pages=Math.max(1,Math.ceil(active.length/pageSize));
    page=Math.min(page,pages-1);get('participationRows').replaceChildren();
    const date=n=>new Date(n).toLocaleString('es-MX',{timeZone:'America/Mexico_City',hourCycle:'h23'});
    for(const r of active.slice(page*pageSize,(page+1)*pageSize)){
      const minutes=Math.max(0,Math.ceil((r.expiresAt-now)/60000)),row=document.createElement('tr');
      for(const value of [date(r.startedAt),r.name,r.mode==='team'?'Escuadrón':'Individual',r.score,r.correct,r.rounds,labels[r.status]||r.status,Math.floor(minutes/60)+' h '+minutes%60+' min']){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell)}
      get('participationRows').append(row);
    }
    if(!active.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=8;cell.textContent='Aún no hay participaciones en las últimas 24 horas. Se registrarán al iniciar una partida.';row.append(cell);get('participationRows').append(row)}
    get('participationCount').textContent=active.length+' participaciones vigentes · Página '+(page+1)+' de '+pages;
    get('participationPrev').disabled=page===0;get('participationNext').disabled=page+1>=pages;
    lastCount=active.length;lastMinute=Math.floor(now/60000);
  }
  async function refresh(){
    if(loading)return;loading=true;get('participationRefresh').disabled=true;
    try{const response=await fetch('/api/participations',{cache:'no-store'});if(!response.ok)throw new Error('Unavailable');const data=await response.json();records=Array.isArray(data.records)?data.records:[];offset=Number(data.serverNow)-Date.now();lastLoad=Date.now();render();get('participationStatus').textContent=data.persistent?'Registro compartido guardado. Actualización automática.':'El registro está en almacenamiento temporal en este momento. Puedes descargar las evidencias CSV.'}
    catch{get('participationStatus').textContent='No se pudo actualizar el registro. Pulsa Actualizar para volver a intentarlo.'}
    finally{loading=false;get('participationRefresh').disabled=false}
  }
  get('participationRefresh').onclick=refresh;
  get('participationPrev').onclick=()=>{page=Math.max(0,page-1);render()};
  get('participationNext').onclick=()=>{page++;render()};
  socket.on('state',s=>{if(s.started&&Date.now()-lastLoad>1500)refresh()});socket.on('finished',refresh);
  setInterval(()=>{const now=Date.now()+offset;if(records.filter(r=>r.expiresAt>now).length!==lastCount||Math.floor(now/60000)!==lastMinute)render()},1000);
  setInterval(()=>{if(!document.hidden)refresh()},15000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  refresh();
})();
