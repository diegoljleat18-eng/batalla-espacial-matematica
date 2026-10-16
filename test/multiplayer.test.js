import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { io } from 'socket.io-client';

let baseURL = process.env.TEST_BASE_URL;
let server;
let serverOutput = '';
const clients = [];

before(async () => {
  if (baseURL) return;
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  baseURL = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(serverOutput)), 5000);
    server.stdout.on('data', () => {
      if (serverOutput.includes('listos en puerto')) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Server exited (${code}): ${serverOutput}`));
    });
  });
});

after(async () => {
  for (const client of clients) client.disconnect();
  if (server && server.exitCode === null && !server.signalCode) {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
  }
});

function waitState(socket, predicate) {
  if (socket.latest && predicate(socket.latest)) return Promise.resolve(socket.latest);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('state', received);
      reject(new Error(`State timeout: ${serverOutput}`));
    }, 15000);
    function received(state) {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off('state', received);
      resolve(state);
    }
    socket.on('state', received);
  });
}

async function connect(namespace, transport) {
  const socket = io(baseURL + namespace, {
    autoConnect: false, forceNew: true, reconnection: false,
    transports: [transport], timeout: 12000,
  });
  clients.push(socket);
  socket.on('state', state => { socket.latest = state; });
  const connected = new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  socket.connect();
  await connected;
  return socket;
}

const send = (socket, event, value) => socket.timeout(12000).emitWithAck(event, value);

function solve(question) {
  const [a, op, b] = question.split(' ');
  if (op === '+') return Number(a) + Number(b);
  if (op === '-' || op === '−') return Number(a) - Number(b);
  if (op === '×') return Number(a) * Number(b);
  if (op === '÷') return Number(a) / Number(b);
  throw new Error(`Unknown question: ${question}`);
}

test('health and both game pages are served', async () => {
  const health = await fetch(`${baseURL}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual((await health.json()).games, ['galaxia', 'math-rush']);
  for (const [path, title] of [['/', 'GALAXIA'], ['/math-rush.html', 'MATH RUSH']]) {
    const response = await fetch(baseURL + path);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).includes(title));
  }
});

for (const [namespace, label] of [['', 'Galaxia'], ['/rush', 'Math Rush']]) {
  test(`${label}: five players join, start, answer, advance on timeout and close`, async () => {
    const sockets = [];
    try {
      for (let i = 0; i < 6; i++) {
        sockets.push(await connect(namespace, i % 2 ? 'polling' : 'websocket'));
      }
      const [host, ...guests] = sockets;
      assert.ok((await send(host, 'create', { name: '' })).error);
      const created = await send(host, 'create', { name: `Prueba ${label}` });
      assert.equal(created.ok, true);
      assert.equal(created.host, true);
      assert.match(created.code, /^\d{6}$/);
      assert.ok((await send(guests[0], 'join', { code: '000000', name: 'Prueba' })).error);
      for (let i = 0; i < 4; i++) {
        const joined = await send(guests[i], 'join', { code: created.code, name: `Prueba ${i + 2}` });
        assert.equal(joined.ok, true);
        assert.equal(joined.host, false);
      }
      assert.ok((await send(guests[4], 'join', { code: created.code, name: 'Sexto' })).error);
      const players = sockets.slice(0, 5);
      await Promise.all(players.map(socket => waitState(socket, state => state.players.length === 5)));
      host.emit('start');
      const states = await Promise.all(players.map(socket => waitState(socket, state => state.started && state.round === 1)));
      assert.equal(new Set(states.map(state => state.question)).size, 1);
      assert.ok(states[0].remaining > 0 && states[0].remaining <= 10);
      const answer = solve(states[0].question);
      for (const socket of players) {
        const result = await send(socket, 'answer', answer);
        assert.equal(result.correct, true);
        await waitState(socket, state => state.players.find(p => p.id === socket.id).correct === 1);
        assert.ok((await send(socket, 'answer', answer)).error);
      }
      const second = await waitState(host, state => state.round === 2);
      assert.ok(second.players.every(player => !player.answered && player.streak === 1));
      // Let all players miss a full round: the next timer must stay alive and reset each streak.
      const third = await waitState(host, state => state.round === 3);
      assert.ok(third.started);
      assert.ok(third.players.every(player => !player.answered && player.streak === 0));
      const closed = once(guests[0], 'closed');
      host.disconnect();
      await closed;
      for (const socket of sockets) socket.disconnect();
      const check = await connect(namespace, 'websocket');
      assert.ok((await send(check, 'join', { code: created.code, name: 'Sala cerrada' })).error);
      check.disconnect();
      assert.equal((await fetch(`${baseURL}/health`)).status, 200);
      if (server) assert.equal(server.exitCode, null, serverOutput);
    } finally {
      for (const socket of sockets) socket.disconnect();
    }
  });
}
