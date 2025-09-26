import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 8;
const QUESTIONS_PATH = path.join(__dirname, 'questions.json');

const questions = JSON.parse(fs.readFileSync(QUESTIONS_PATH, 'utf-8'));
const lobbies = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function generateLobbyCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (lobbies.has(code));
  return code;
}

function pickQuestion(lobby) {
  const remaining = questions.filter(q => !lobby.usedQuestionIds.has(q.id));
  if (remaining.length === 0) {
    lobby.usedQuestionIds.clear();
    remaining.push(...questions);
  }
  const choice = remaining[Math.floor(Math.random() * remaining.length)];
  lobby.usedQuestionIds.add(choice.id);
  return choice;
}

function getLobbyState(lobby) {
  return {
    code: lobby.code,
    players: Object.values(lobby.players).map(player => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      connected: player.connected
    })),
    status: lobby.collectingAnswers ? 'collecting' : lobby.currentQuestion ? 'results' : 'waiting',
    currentQuestion: lobby.collectingAnswers ? {
      id: lobby.currentQuestion.id,
      question: lobby.currentQuestion.question,
      type: lobby.currentQuestion.type
    } : null,
    lastResults: lobby.lastResults
  };
}

function broadcastLobby(lobby) {
  io.to(lobby.code).emit('lobbyUpdate', getLobbyState(lobby));
}

function broadcastPlayers(lobby) {
  io.to(lobby.code).emit('playersUpdate', getLobbyState(lobby).players);
}

function startRound(lobby) {
  lobby.currentQuestion = pickQuestion(lobby);
  lobby.collectingAnswers = true;
  lobby.lastResults = null;
  for (const player of Object.values(lobby.players)) {
    player.hasSubmitted = false;
    player.answer = null;
    player.ready = false;
  }
  io.to(lobby.code).emit('roundStarted', {
    question: lobby.currentQuestion.question,
    type: lobby.currentQuestion.type
  });
  broadcastLobby(lobby);
}

function evaluateRound(lobby) {
  const answers = Object.values(lobby.players)
    .filter(player => player.connected)
    .map(player => ({
      playerId: player.id,
      name: player.name,
      answer: player.answer
    }));

  let closestId = null;
  let farthestId = null;

  if (lobby.currentQuestion.type === 'number' && typeof lobby.currentQuestion.answer === 'number') {
    const numericAnswers = answers
      .map(entry => ({
        ...entry,
        numeric: Number(String(entry.answer).replace(',', '.'))
      }))
      .filter(entry => !Number.isNaN(entry.numeric));

    if (numericAnswers.length > 0) {
      numericAnswers.sort((a, b) => Math.abs(a.numeric - lobby.currentQuestion.answer) - Math.abs(b.numeric - lobby.currentQuestion.answer));
      closestId = numericAnswers[0].playerId;
      farthestId = numericAnswers[numericAnswers.length - 1].playerId;
    }
  }

  const payload = {
    answers: answers.map(entry => ({
      ...entry,
      closest: entry.playerId === closestId,
      farthest: entry.playerId === farthestId
    })),
    correctAnswer: lobby.currentQuestion.answer ?? null,
    type: lobby.currentQuestion.type
  };

  lobby.lastResults = payload;

  io.to(lobby.code).emit('roundResults', payload);

  lobby.collectingAnswers = false;
  broadcastLobby(lobby);
}

function allPlayersSubmitted(lobby) {
  return Object.values(lobby.players)
    .filter(player => player.connected)
    .every(player => player.hasSubmitted);
}

function allPlayersReady(lobby) {
  const connectedPlayers = Object.values(lobby.players).filter(player => player.connected);
  return connectedPlayers.length > 0 && connectedPlayers.every(player => player.ready);
}

app.post('/lobbies', (req, res) => {
  const code = generateLobbyCode();
  const lobby = {
    code,
    players: {},
    currentQuestion: null,
    collectingAnswers: false,
    usedQuestionIds: new Set(),
    lastResults: null
  };
  lobbies.set(code, lobby);
  res.json({ code });
});

io.on('connection', socket => {
  socket.on('joinLobby', ({ code, name }, callback) => {
    const lobby = lobbies.get(code?.toUpperCase());
    if (!lobby) {
      callback?.({ error: 'Lobby nicht gefunden.' });
      return;
    }

    if (Object.values(lobby.players).filter(p => p.connected).length >= MAX_PLAYERS) {
      callback?.({ error: 'Die Lobby ist bereits voll.' });
      return;
    }

    const trimmedName = String(name || '').trim().slice(0, 18);
    const displayName = trimmedName.length > 0 ? trimmedName : 'Spieler';

    lobby.players[socket.id] = {
      id: socket.id,
      name: displayName,
      answer: null,
      hasSubmitted: false,
      ready: false,
      connected: true
    };

    socket.join(lobby.code);
    broadcastLobby(lobby);
    callback?.({ success: true, lobby: getLobbyState(lobby) });
  });

  socket.on('submitAnswer', answer => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || !lobby.collectingAnswers) return;

    const player = lobby.players[socket.id];
    if (!player || player.hasSubmitted) return;

    player.answer = typeof answer === 'string' ? answer.trim() : answer;
    player.hasSubmitted = true;

    io.to(lobby.code).emit('answerReceived', {
      playerId: player.id,
      name: player.name
    });

    if (allPlayersSubmitted(lobby)) {
      evaluateRound(lobby);
    }
  });

  socket.on('playerReady', () => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || lobby.collectingAnswers) return;
    const player = lobby.players[socket.id];
    if (!player) return;
    player.ready = true;
    broadcastPlayers(lobby);
    if (allPlayersReady(lobby)) {
      startRound(lobby);
    }
  });

  socket.on('startRound', () => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || lobby.collectingAnswers) return;
    if (!lobby.currentQuestion) {
      startRound(lobby);
    }
  });

  socket.on('disconnect', () => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby) return;

    delete lobby.players[socket.id];
    socket.leave(lobby.code);

    const remaining = Object.keys(lobby.players).length;
    if (remaining === 0) {
      lobbies.delete(lobby.code);
    } else {
      if (lobby.collectingAnswers && allPlayersSubmitted(lobby)) {
        evaluateRound(lobby);
      } else {
        broadcastLobby(lobby);
      }
    }
  });
});

function findLobbyBySocket(socketId) {
  for (const lobby of lobbies.values()) {
    if (lobby.players[socketId]) {
      return lobby;
    }
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
