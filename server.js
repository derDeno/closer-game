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

function parseNumericAnswer(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (normalized.length === 0) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getConnectedPlayers(lobby) {
  return Object.values(lobby.players).filter(player => player.connected);
}

function ensurePlayerStats(lobby, playerId, name) {
  if (!lobby.playerStats.has(playerId)) {
    lobby.playerStats.set(playerId, {
      playerId,
      name,
      rounds: 0,
      validAnswers: 0,
      totalDeviation: 0,
      points: 0,
      lastDeviation: null,
      lastPoints: 0
    });
  }

  const stats = lobby.playerStats.get(playerId);
  stats.name = name;
  return stats;
}

function getLobbyState(lobby) {
  const connectedPlayers = getConnectedPlayers(lobby);
  const status = lobby.gameFinished
    ? 'finished'
    : lobby.collectingAnswers
      ? 'collecting'
      : lobby.lastResults
        ? 'results'
        : 'waiting';

  return {
    code: lobby.code,
    players: Object.values(lobby.players).map(player => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      connected: player.connected,
      hasSubmitted: player.hasSubmitted
    })),
    status,
    currentQuestion:
      lobby.collectingAnswers && lobby.currentQuestion
        ? {
            id: lobby.currentQuestion.id,
            question: lobby.currentQuestion.question,
            type: lobby.currentQuestion.type
          }
        : null,
    lastResults: lobby.lastResults,
    settings: {
      mode: lobby.isUnlimited ? 'unlimited' : 'fixed',
      questionLimit: lobby.questionLimit
    },
    roundsPlayed: lobby.roundsPlayed,
    endVote: lobby.isUnlimited && !lobby.gameFinished
      ? {
          count: lobby.endVotes.size,
          required: connectedPlayers.length,
          voterIds: Array.from(lobby.endVotes),
          voterNames: Array.from(lobby.endVotes)
            .map(id => lobby.players[id]?.name)
            .filter(Boolean)
        }
      : null,
    finalSummary: lobby.gameFinished ? lobby.finalSummary : null
  };
}

function broadcastLobby(lobby) {
  io.to(lobby.code).emit('lobbyUpdate', getLobbyState(lobby));
}

function broadcastPlayers(lobby) {
  io.to(lobby.code).emit('playersUpdate', getLobbyState(lobby).players);
}

function startRound(lobby) {
  if (lobby.gameFinished) return;
  if (!lobby.isUnlimited && lobby.questionLimit && lobby.roundsPlayed >= lobby.questionLimit) {
    finalizeGame(lobby, 'limit');
    return;
  }
  lobby.currentQuestion = pickQuestion(lobby);
  lobby.collectingAnswers = true;
  lobby.lastResults = null;
  lobby.endVotes.clear();
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
  const question = lobby.currentQuestion;
  const answers = getConnectedPlayers(lobby).map(player => {
    const numeric = parseNumericAnswer(player.answer);
    const distance = typeof question?.answer === 'number' && numeric !== null ? Math.abs(numeric - question.answer) : null;
    return {
      playerId: player.id,
      name: player.name,
      answer: player.answer,
      distance
    };
  });

  let closestId = null;
  let farthestId = null;

  const validDistances = answers.filter(entry => typeof entry.distance === 'number');
  if (validDistances.length > 0) {
    validDistances.sort((a, b) => a.distance - b.distance);
    closestId = validDistances[0].playerId;
    farthestId = validDistances[validDistances.length - 1].playerId;
  }

  const participantCount = answers.length;
  answers.forEach(entry => {
    const stats = ensurePlayerStats(lobby, entry.playerId, entry.name);
    stats.rounds += 1;
    if (typeof entry.distance === 'number') {
      stats.validAnswers += 1;
      stats.totalDeviation += entry.distance;
      stats.lastDeviation = entry.distance;
    } else {
      stats.lastDeviation = null;
    }
    stats.lastPoints = 0;
  });

  validDistances.forEach((entry, index) => {
    const stats = ensurePlayerStats(lobby, entry.playerId, entry.name);
    const pointsAwarded = participantCount - index;
    stats.points += pointsAwarded;
    stats.lastPoints = pointsAwarded;
  });

  const payload = {
    questionId: question?.id ?? null,
    question: question?.question ?? null,
    type: question?.type ?? null,
    answers: answers.map(entry => ({
      playerId: entry.playerId,
      name: entry.name,
      answer: entry.answer,
      distance: entry.distance,
      closest: entry.playerId === closestId,
      farthest: entry.playerId === farthestId
    })),
    correctAnswer: question?.answer ?? null
  };

  lobby.lastResults = payload;
  lobby.collectingAnswers = false;
  lobby.roundsPlayed += 1;

  io.to(lobby.code).emit('roundResults', payload);

  if (!lobby.isUnlimited && lobby.questionLimit && lobby.roundsPlayed >= lobby.questionLimit) {
    finalizeGame(lobby, 'limit', payload);
  } else {
    broadcastLobby(lobby);
  }

  return payload;
}

function buildHighscore(lobby) {
  if (!lobby?.playerStats) {
    return [];
  }

  return Array.from(lobby.playerStats.values())
    .map(stats => {
      const averageDeviation = stats.validAnswers > 0 ? stats.totalDeviation / stats.validAnswers : null;
      return {
        name: stats.name,
        points: stats.points,
        averageDeviation,
        totalDeviation: stats.totalDeviation,
        validAnswers: stats.validAnswers,
        rounds: stats.rounds
      };
    })
    .filter(entry => entry.rounds > 0 || entry.points > 0 || entry.validAnswers > 0)
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      const aAvg = typeof a.averageDeviation === 'number' ? a.averageDeviation : Number.POSITIVE_INFINITY;
      const bAvg = typeof b.averageDeviation === 'number' ? b.averageDeviation : Number.POSITIVE_INFINITY;

      if (aAvg !== bAvg) {
        return aAvg - bAvg;
      }

      if (a.totalDeviation !== b.totalDeviation) {
        return a.totalDeviation - b.totalDeviation;
      }

      return a.name.localeCompare(b.name, 'de');
    });
}

function finalizeGame(lobby, reason, resultsOverride) {
  if (lobby.gameFinished) return;

  let results = resultsOverride || lobby.lastResults || null;

  if (!results && lobby.collectingAnswers) {
    results = evaluateRound(lobby);
  }

  lobby.gameFinished = true;
  lobby.collectingAnswers = false;
  lobby.endVotes.clear();

  const summary = {
    reason,
    highscore: buildHighscore(lobby),
    roundsPlayed: lobby.roundsPlayed
  };

  lobby.finalSummary = summary;
  lobby.currentQuestion = null;

  io.to(lobby.code).emit('gameSummary', summary);
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
  const mode = req.body?.mode === 'unlimited' ? 'unlimited' : 'fixed';
  const requestedCount = Number.parseInt(req.body?.questionCount, 10);
  const questionLimit = mode === 'fixed' && Number.isInteger(requestedCount) && requestedCount > 0 ? Math.min(requestedCount, 99) : 5;

  const lobby = {
    code,
    players: {},
    currentQuestion: null,
    collectingAnswers: false,
    usedQuestionIds: new Set(),
    lastResults: null,
    questionLimit: mode === 'unlimited' ? null : questionLimit,
    isUnlimited: mode === 'unlimited',
    roundsPlayed: 0,
    endVotes: new Set(),
    gameFinished: false,
    finalSummary: null,
    playerStats: new Map()
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

    ensurePlayerStats(lobby, socket.id, displayName);

    socket.join(lobby.code);
    broadcastLobby(lobby);
    callback?.({ success: true, lobby: getLobbyState(lobby), playerId: socket.id });
  });

  socket.on('submitAnswer', answer => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || lobby.gameFinished || !lobby.collectingAnswers) return;

    const player = lobby.players[socket.id];
    if (!player || player.hasSubmitted) return;

    player.answer = typeof answer === 'string' ? answer.trim() : answer;
    player.hasSubmitted = true;

    io.to(lobby.code).emit('answerReceived', {
      playerId: player.id,
      name: player.name
    });

    broadcastPlayers(lobby);

    if (allPlayersSubmitted(lobby)) {
      evaluateRound(lobby);
    }
  });

  socket.on('playerReady', () => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || lobby.collectingAnswers || lobby.gameFinished) return;
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
    if (!lobby || lobby.collectingAnswers || lobby.gameFinished) return;
    if (!lobby.currentQuestion) {
      startRound(lobby);
    }
  });

  socket.on('voteEndGame', callback => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby || !lobby.isUnlimited || lobby.gameFinished) {
      callback?.({ success: false, error: 'Eine Abstimmung ist derzeit nicht möglich.' });
      return;
    }

    if (lobby.endVotes.has(socket.id)) {
      callback?.({ success: false, error: 'Du hast bereits für das Spielende gestimmt.' });
      return;
    }

    lobby.endVotes.add(socket.id);
    broadcastLobby(lobby);

    const connectedCount = getConnectedPlayers(lobby).length;
    if (connectedCount > 0 && lobby.endVotes.size >= connectedCount) {
      finalizeGame(lobby, 'vote');
    }

    callback?.({ success: true });
  });

  socket.on('disconnect', () => {
    const lobby = findLobbyBySocket(socket.id);
    if (!lobby) return;

    delete lobby.players[socket.id];
    socket.leave(lobby.code);
    lobby.endVotes.delete(socket.id);

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
