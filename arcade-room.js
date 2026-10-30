export const ARCADE_SECONDS = 10;
export const arcadeLevel = round => Math.max(1, Math.min(5, 1 + Math.floor((round - 1) / 5)));

export function arcadeQuestion(level) {
  const max=10+level*10;
  let a=1+Math.floor(Math.random()*max),b=1+Math.floor(Math.random()*max);
  const op=['+','-','×','÷'][Math.floor(Math.random()*Math.min(4,level+1))];
  let answer;
  if(op==='-'){if(b>a)[a,b]=[b,a];answer=a-b}
  else if(op==='×'){a=1+Math.floor(Math.random()*(5+level*2));b=1+Math.floor(Math.random()*10);answer=a*b}
  else if(op==='÷'){b=1+Math.floor(Math.random()*10);answer=1+Math.floor(Math.random()*(5+level*2));a=b*answer}
  else answer=a+b;
  return {text:`${a} ${op} ${b} = ?`,answer};
}

// Rounds have no upper limit. Only a team with no surviving pilots ends a run.
export function advanceArcadeRoom(room, now=Date.now()) {
  const missed=[];
  if(room.round>0){
    for(const p of room.players.values()){
      if(p.shield>0&&!p.answered){
        p.shield=Math.max(0,p.shield-1);p.streak=0;p.answered=true;
        missed.push({id:p.id,shield:p.shield,answer:room.question.answer});
      }
    }
  }
  const finished=[...room.players.values()].every(p=>p.shield<=0);
  if(finished){room.started=false;return {finished,missed}}
  room.round++;
  room.question=arcadeQuestion(arcadeLevel(room.round));
  room.deadline=now+ARCADE_SECONDS*1000;
  for(const p of room.players.values())p.answered=p.shield<=0;
  return {finished:false,missed};
}
