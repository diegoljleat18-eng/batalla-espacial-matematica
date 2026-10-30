export const VERSION = 'aula-1.0';
export const PLANETS = [
  { id:'descomponer', name:'Órbita Prisma', method:'Descomposición', color:'#67e8f9', objective:'Separar números en partes para sumar, restar o multiplicar mentalmente.', intro:'Repara los paneles solares. Puedes separar un número en decenas y unidades y operar con cada parte.', example:{text:'46 + 23',steps:['Separa 23 en 20 y 3.','46 + 20 = 66','66 + 3 = 69']}, prompt:'¿Qué número separaste y qué hiciste con cada parte?' },
  { id:'decenas', name:'Estación Década', method:'Completar decenas', color:'#c4b5fd', objective:'Llegar primero a una decena o centena para facilitar la suma.', intro:'Recarga los reactores. Toma del segundo número lo necesario para completar la siguiente decena.', example:{text:'48 + 17',steps:['A 48 le faltan 2 para llegar a 50.','Separa 17 en 2 y 15.','48 + 2 + 15 = 65']}, prompt:'¿Cuánto faltaba para llegar a la decena y cuánto quedó por sumar?' },
  { id:'dobles', name:'Lunas Gemelas', method:'Dobles y mitades', color:'#f9a8d4', objective:'Usar dobles conocidos y mitades para resolver cálculos relacionados.', intro:'Activa los satélites gemelos. Un doble conocido o la mitad de un producto sencillo pueden ayudarte.', example:{text:'18 × 5',steps:['Multiplicar por 5 equivale a multiplicar por 10 y tomar la mitad.','18 × 10 = 180','La mitad de 180 es 90.']}, prompt:'¿Qué doble o mitad usaste y cómo te ayudó?' },
  { id:'compensar', name:'Puerto Equilibrio', method:'Compensación', color:'#fcd34d', objective:'Cambiar temporalmente un número por uno cercano y ajustar el resultado.', intro:'Estabiliza el puerto. Redondea uno de los números y después compensa lo que agregaste o quitaste.', example:{text:'39 + 26',steps:['Cambia 39 por 40: agregaste 1.','40 + 26 = 66','Quita ese 1: 66 − 1 = 65.']}, prompt:'¿Qué número cambiaste, cuánto lo cambiaste y cómo compensaste?' }
];

const integer=(min,max,rng)=>min+Math.floor(rng()*(max-min+1));
export function makeQuestion(strategy,level=1,rng=Math.random){
  level=Math.max(1,Math.min(3,Number(level)||1));
  let a,b,answer,text,hint,steps,equivalents;
  const n=(lo,hi)=>integer(lo,hi,rng);
  if(strategy==='descomponer'){
    a=n(level===1?12:42,level===1?49:199);b=n(1,level===1?4:9)*10+n(1,9);
    if(level===3&&rng()<.5){
      a=n(21,89);b=n(3,9);const tens=Math.floor(a/10)*10,units=a%10;
      text=`${a} × ${b}`;answer=a*b;hint=`Separa ${a} en ${tens} y ${units}. Multiplica cada parte por ${b}.`;
      steps=[`${tens} × ${b} = ${tens*b}`,`${units} × ${b} = ${units*b}`,`${tens*b} + ${units*b} = ${answer}`];equivalents=[`${tens}*${b}+${units}*${b}`];
    }else if(level>1&&rng()<.4){
      a+=b;answer=a-b;const tens=Math.floor(b/10)*10,units=b%10;
      text=`${a} − ${b}`;hint=`Separa ${b} en ${tens} y ${units}. Resta primero las decenas.`;
      steps=[`${a} − ${tens} = ${a-tens}`,`${a-tens} − ${units} = ${answer}`];equivalents=[`${a}-${tens}-${units}`];
    }else{
      answer=a+b;const tens=Math.floor(b/10)*10,units=b%10;
      text=`${a} + ${b}`;hint=`Separa ${b} en ${tens} y ${units}. Suma una parte a la vez.`;
      steps=[`${a} + ${tens} = ${a+tens}`,`${a+tens} + ${units} = ${answer}`];equivalents=[`${a}+${tens}+${units}`];
    }
  }else if(strategy==='decenas'){
    a=n(1,level===1?5:level===2?14:39)*10+n(6,9);b=n(level===1?1:2,level===1?3:9)*10+n(1,9);
    const missing=10-a%10,rest=b-missing;answer=a+b;text=`${a} + ${b}`;
    hint=`A ${a} le faltan ${missing} para llegar a ${a+missing}. Toma esa cantidad de ${b}.`;
    steps=[`Separa ${b} en ${missing} y ${rest}.`,`${a} + ${missing} = ${a+missing}`,`${a+missing} + ${rest} = ${answer}`];equivalents=[`${a}+${missing}+${rest}`];
  }else if(strategy==='dobles'){
    if(level===1||rng()<.35){
      a=n(level===1?6:21,level===1?24:79);const delta=n(0,1);b=a+delta;answer=a+b;text=`${a} + ${b}`;
      hint=`Usa el doble de ${a}${delta?' y luego suma 1':''}.`;
      steps=[`${a} + ${a} = ${a*2}`,delta?`${a*2} + 1 = ${answer}`:`El doble de ${a} es ${answer}.`];equivalents=[`${a}*2+${delta}`];
    }else{
      a=n(6,level===2?30:90);b=5;answer=a*5;text=`${a} × 5`;
      hint=`Calcula ${a} × 10 y toma la mitad.`;
      steps=[`${a} × 10 = ${a*10}`,`La mitad de ${a*10} es ${answer}.`];equivalents=[`${a}*10/2`];
    }
  }else if(strategy==='compensar'){
    const round=n(2,level===1?6:level===2?20:60)*10,gap=n(1,2);a=round-gap;b=n(11,level===1?40:level===2?99:199);
    if(level>1&&rng()<.5){
      [a,b]=[b+round,round-gap];answer=a-b;text=`${a} − ${b}`;
      hint=`Resta ${round} en lugar de ${b}. Habrás restado ${gap} de más: devuélvelo.`;
      steps=[`${a} − ${round} = ${a-round}`,`${a-round} + ${gap} = ${answer}`];equivalents=[`${a}-${round}+${gap}`];
    }else{
      answer=a+b;text=`${a} + ${b}`;
      hint=`Cambia ${a} por ${round}. Agregaste ${gap}; al final deberás quitarlo.`;
      steps=[`${round} + ${b} = ${round+b}`,`${round+b} − ${gap} = ${answer}`];equivalents=[`${round}+${b}-${gap}`];
    }
  }else throw new Error('Procedimiento desconocido');
  const options=new Set([answer]);
  for(const delta of [10,-10,1,-1,2,-2,20]){if(options.size===4)break;if(answer+delta>=0)options.add(answer+delta)}
  const shuffled=[...options];for(let i=shuffled.length-1;i>0;i--){const j=n(0,i);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]}
  return {strategy,text,answer,hint,steps,equivalents,options:shuffled};
}

export function bank(strategy,count,level,seen=[],rng=Math.random){
  const used=new Set(seen),out=[];
  for(let i=0;i<5000&&out.length<count;i++){const q=makeQuestion(strategy,level,rng);if(!used.has(q.text)){used.add(q.text);out.push(q)}}
  if(out.length!==count)throw new Error('No se pudieron crear operaciones distintas. Intenta de nuevo.');
  return out;
}
export function diagnostic(level,rng=Math.random){
  const out=[];for(const i of [0,1,2,3,0])out.push(bank(PLANETS[i].id,1,level,out.map(q=>q.text),rng)[0]);return out;
}
export function recommended(session){
  const records=session.records.filter(r=>r.phase==='diagnostic');
  return [...PLANETS].sort((a,b)=>{
    const rate=id=>{const rs=records.filter(r=>r.strategy===id);return rs.length?rs.filter(r=>r.correct).length/rs.length:0};
    return rate(a.id)-rate(b.id);
  })[0].id;
}
export function metrics(records){
  return {total:records.length,correct:records.filter(r=>r.correct).length,independent:records.filter(r=>r.correct&&r.attempts.length===1&&!r.hints&&!r.timedOut).length,
    errors:records.reduce((sum,r)=>sum+r.attempts.filter(a=>!a.correct).length,0),hints:records.reduce((sum,r)=>sum+(r.hints||0),0),timeouts:records.filter(r=>r.timedOut).length,
    seconds:Math.round(records.reduce((sum,r)=>sum+(r.seconds||0),0))};
}
export function points(record){return record.phase==='practice'&&record.correct?(record.attempts.length===1&&!record.hints&&!record.timedOut?10:5):0}
export function parseAnswer(value){const text=String(value).trim();return /^-?\d+$/.test(text)&&Number.isSafeInteger(Number(text))?Number(text):null}
export function csvCell(value){const s=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'"+s:s).replaceAll('"','""')+'"'}
