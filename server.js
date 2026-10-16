import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
const app=express(); const http=createServer(app); const io=new Server(http);
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const publicDir=path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
app.use(express.static(publicDir));
app.get('/', (_req,res)=>res.sendFile(path.join(publicDir,'index.html')));
const rooms=new Map();
const question=(level)=>{const max=10+level*10;let a=1+Math.floor(Math.random()*max),b=1+Math.floor(Math.random()*max),op=['+','-','×','÷'][Math.floor(Math.random()*Math.min(4,level+1))],answer;if(op==='-'){if(b>a)[a,b]=[b,a];answer=a-b;}else if(op==='×'){a=1+Math.floor(Math.random()*(5+level*2));b=1+Math.floor(Math.random()*10);answer=a*b;}else if(op==='÷'){b=1+Math.floor(Math.random()*10);answer=1+Math.floor(Math.random()*(5+level*2));a=b*answer;}else answer=a+b;return {text:`${a} ${op} ${b} = ?`,answer};};
function state(room){return {code:room.code,started:room.started,round:room.round,total:room.total,level:Math.min(5,1+Math.floor((room.round-1)/5)),players:[...room.players.values()].map(p=>({id:p.id,name:p.name,score:p.score,shield:p.shield,correct:p.correct,answered:p.answered})),question:room.started?room.question.text:null,remaining:room.started?Math.max(0,Math.ceil((room.deadline-Date.now())/1000)):null};}
function emit(room){io.to(room.code).emit('state',state(room));}
function next(room){clearTimeout(room.timer);if(room.round>=room.total||[...room.players.values()].every(p=>p.shield<=0)){room.started=false;io.to(room.code).emit('finished',state(room));emit(room);return;}room.round++;room.question=question(Math.min(5,1+Math.floor((room.round-1)/5)));room.deadline=Date.now()+10000;for(const p of room.players.values())p.answered=p.shield<=0;emit(room);room.timer=setTimeout(()=>next(room),10000);}
io.on('connection',socket=>{
 socket.on('create',({name},cb)=>{name=String(name||'').trim().slice(0,20);if(!name)return cb({error:'Escribe tu nombre.'});let code;do{code=String(Math.floor(100000+Math.random()*900000));}while(rooms.has(code));const room={code,host:socket.id,players:new Map(),started:false,round:0,total:25,timer:null};rooms.set(code,room);room.players.set(socket.id,{id:socket.id,name,score:0,shield:2,correct:0,answered:false});socket.join(code);socket.data.code=code;cb({ok:true,code,host:true});emit(room);});
 socket.on('join',({code,name},cb)=>{code=String(code||'').trim();name=String(name||'').trim().slice(0,20);const room=rooms.get(code);if(!room)return cb({error:'Sala no encontrada.'});if(room.started)return cb({error:'La partida ya comenzó.'});if(room.players.size>=5)return cb({error:'La sala está llena.'});if(!name)return cb({error:'Escribe tu nombre.'});room.players.set(socket.id,{id:socket.id,name,score:0,shield:2,correct:0,answered:false});socket.join(code);socket.data.code=code;cb({ok:true,code,host:false});emit(room);});
 socket.on('start',()=>{const room=rooms.get(socket.data.code);if(!room||room.host!==socket.id||room.started)return;room.round=0;room.started=true;for(const p of room.players.values()){p.score=0;p.shield=2;p.correct=0;p.answered=false;}next(room);});
 socket.on('answer',(value,cb)=>{const room=rooms.get(socket.data.code),p=room?.players.get(socket.id);if(!room?.started||!p||p.answered||Date.now()>room.deadline)return cb?.({error:'Respuesta fuera de tiempo o ya enviada.'});if(p.shield<=0)return cb?.({error:'Sin vidas: espera el final de la misión.'});p.answered=true;const correct=Number(value)===room.question.answer;if(correct){p.correct++;p.score+=100+Math.max(0,Math.ceil((room.deadline-Date.now())/1000))*5;}else p.shield=Math.max(0,p.shield-1);cb?.({correct,answer:room.question.answer});emit(room);if([...room.players.values()].every(x=>x.answered||x.shield<=0)){clearTimeout(room.timer);room.timer=setTimeout(()=>next(room),1600);}});
 socket.on('disconnect',()=>{const room=rooms.get(socket.data.code);if(!room)return;room.players.delete(socket.id);if(room.host===socket.id){clearTimeout(room.timer);rooms.delete(room.code);io.to(room.code).emit('closed');}else emit(room);});
});
http.listen(process.env.PORT||3000,()=>console.log('Juego listo en puerto '+(process.env.PORT||3000)));
