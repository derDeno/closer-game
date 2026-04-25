import fs from 'fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import crypto from 'crypto';

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
const DISCONNECTED_PLAYER_TTL_MS = 5 * 60 * 1000;
const QUESTIONS_DIR = path.join(__dirname, 'questions');
const LEGACY_QUESTIONS_PATH = path.join(__dirname, 'questions.json');

function loadQuestionCatalogues() {
  const catalogues = {};

  if (fs.existsSync(QUESTIONS_DIR)) {
    const entries = fs.readdirSync(QUESTIONS_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const match = entry.name.match(/^questions\.([a-z0-9-]+)\.json$/i);
      if (!match) continue;

      const language = match[1].toLowerCase();
      const filePath = path.join(QUESTIONS_DIR, entry.name);
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (Array.isArray(parsed)) {
          catalogues[language] = parsed;
        }
      } catch (error) {
        console.error(`Failed to load question catalogue ${entry.name}:`, error);
      }
    }
  }

  if (Object.keys(catalogues).length === 0 && fs.existsSync(LEGACY_QUESTIONS_PATH)) {
    try {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_QUESTIONS_PATH, 'utf-8'));
      if (legacy && typeof legacy === 'object') {
        for (const [language, entries] of Object.entries(legacy)) {
          if (Array.isArray(entries)) {
            catalogues[String(language).toLowerCase()] = entries;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load legacy questions.json:', error);
    }
  }

  if (Object.keys(catalogues).length === 0) {
    throw new Error('No question catalogues found');
  }

  return catalogues;
}

const questionsByLanguage = loadQuestionCatalogues();
const SUPPORTED_LANGUAGES = Object.keys(questionsByLanguage);
const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES.includes('de') ? 'de' : SUPPORTED_LANGUAGES[0] ?? 'de';

const lobbies = new Map();

function resolveLanguage(language) {
  if (typeof language !== 'string') {
    return DEFAULT_LANGUAGE;
  }
  const normalized = language.trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNumberSeparators(language = DEFAULT_LANGUAGE) {
  const locale = resolveLanguage(language) === 'de' ? 'de-DE' : 'en-US';
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find(part => part.type === 'decimal')?.value || '.',
    group: parts.find(part => part.type === 'group')?.value || ','
  };
}

function removeSeparator(value, separator) {
  return separator ? value.replace(new RegExp(escapeRegExp(separator), 'g'), '') : value;
}

function getBaseQuestions(language) {
  const lang = resolveLanguage(language);
  const entries = Array.isArray(questionsByLanguage[lang]) ? questionsByLanguage[lang] : [];
  return entries.map(question => ({
    ...question,
    id: `base-${question.id}`,
    language: lang
  }));
}

function normalizeCustomQuestions(rawCustomQuestions, language) {
  if (!Array.isArray(rawCustomQuestions)) {
    return [];
  }

  const custom = [];
  const questionLanguage = resolveLanguage(language);
  for (let index = 0; index < rawCustomQuestions.length; index += 1) {
    if (custom.length >= 50) break;
    const entry = rawCustomQuestions[index];
    const questionText = typeof entry?.question === 'string' ? entry.question.trim() : '';
    if (questionText.length === 0) {
      continue;
    }

    let numericAnswer = null;
    if (typeof entry?.answer === 'number') {
      numericAnswer = Number.isFinite(entry.answer) ? entry.answer : null;
    } else {
      numericAnswer = parseNumericAnswer(entry?.answer, questionLanguage);
    }

    if (typeof numericAnswer !== 'number') {
      continue;
    }

    custom.push({
      id: `custom-${custom.length + 1}`,
      question: questionText,
      type: 'number',
      answer: numericAnswer,
      language: questionLanguage
    });
  }

  return custom;
}

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

function normalizePlayerId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  return /^[a-zA-Z0-9:_-]{8,80}$/.test(id) ? id : '';
}

function generatePlayerId(lobby, preferredId = '') {
  if (preferredId && !lobby.players[preferredId]) {
    return preferredId;
  }

  let id = '';
  do {
    id = crypto.randomUUID();
  } while (lobby.players[id]);
  return id;
}

function findDisconnectedPlayerByName(lobby, name) {
  const matches = Object.values(lobby.players).filter(player => !player.connected && player.name === name);
  return matches.length === 1 ? matches[0] : null;
}

function pickQuestion(lobby) {
  const pool = Array.isArray(lobby?.questionPool) ? lobby.questionPool : [];
  if (pool.length === 0) {
    return null;
  }

  let remaining = pool.filter(question => !lobby.usedQuestionIds.has(question.id));
  if (remaining.length === 0) {
    lobby.usedQuestionIds.clear();
    remaining = pool.slice();
  }

  const choice = remaining[Math.floor(Math.random() * remaining.length)];
  if (choice) {
    lobby.usedQuestionIds.add(choice.id);
  }
  return choice ?? null;
}

function parseNumericAnswer(value, language = DEFAULT_LANGUAGE) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    let negative = false;
    let normalized = trimmed;

    if (normalized.startsWith('-')) {
      negative = true;
      normalized = normalized.slice(1);
    } else if (normalized.startsWith('+')) {
      normalized = normalized.slice(1);
    }

    normalized = normalized.replace(/\s+/g, '');
    normalized = normalized.replace(/[^0-9.,]/g, '');

    if (normalized.length === 0) {
      return null;
    }

    const { decimal, group } = getNumberSeparators(language);
    const separatorMatches = normalized.match(/[.,]/g) || [];
    const uniqueSeparators = [...new Set(separatorMatches)];
    let decimalSeparator = null;

    if (uniqueSeparators.length > 1) {
      const lastComma = normalized.lastIndexOf(',');
      const lastDot = normalized.lastIndexOf('.');
      decimalSeparator = lastComma > lastDot ? ',' : '.';
    } else if (uniqueSeparators.length === 1) {
      const separator = uniqueSeparators[0];
      const separatorCount = separatorMatches.length;
      const thousandsPattern = new RegExp(`^\\d{1,3}(${escapeRegExp(separator)}\\d{3})+$`);

      if (separator === group && thousandsPattern.test(normalized)) {
        normalized = removeSeparator(normalized, group);
      } else if (separatorCount > 1 && thousandsPattern.test(normalized)) {
        normalized = removeSeparator(normalized, separator);
      } else if (separator === decimal) {
        decimalSeparator = separator;
      } else if (thousandsPattern.test(normalized)) {
        normalized = removeSeparator(normalized, separator);
      } else {
        decimalSeparator = separator;
      }
    }

    normalized = decimalSeparator === group ? normalized : removeSeparator(normalized, group);

    let integerPart = normalized;
    let fractionPart = '';

    if (decimalSeparator) {
      const splitIndex = normalized.lastIndexOf(decimalSeparator);
      integerPart = normalized.slice(0, splitIndex);
      fractionPart = normalized.slice(splitIndex + 1);
    }

    integerPart = integerPart.replace(/[^0-9]/g, '');
    fractionPart = fractionPart.replace(/[^0-9]/g, '');

    if (integerPart.length === 0 && fractionPart.length > 0) {
      integerPart = '0';
    }

    const hasDigits = integerPart.length > 0 || fractionPart.length > 0;
    if (!hasDigits) {
      return null;
    }

    const result = `${negative ? '-' : ''}${integerPart || '0'}${fractionPart.length > 0 ? `.${fractionPart}` : ''}`;
    const parsed = Number(result);
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
      questionLimit: lobby.questionLimit,
      language: lobby.language,
      useOnlyCustom: lobby.useOnlyCustom,
      customQuestionCount: lobby.customQuestions?.length ?? 0,
      baseQuestionCount: lobby.baseQuestionCount
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
  const nextQuestion = pickQuestion(lobby);
  if (!nextQuestion) {
    finalizeGame(lobby, 'no-questions');
    return;
  }

  lobby.currentQuestion = nextQuestion;
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
    const numeric = parseNumericAnswer(player.answer, lobby.language);
    const distance = typeof question?.answer === 'number' && numeric !== null ? Math.abs(numeric - question.answer) : null;
    return {
      playerId: player.id,
      name: player.name,
      answer: player.answer,
      distance
    };
  });

  const validDistances = answers.filter(entry => typeof entry.distance === 'number');
  const sortedDistances = [...validDistances].sort((a, b) => a.distance - b.distance);

  const closestIds = new Set();
  const farthestIds = new Set();

  if (sortedDistances.length > 0) {
    const minDistance = sortedDistances[0].distance;
    const maxDistance = sortedDistances[sortedDistances.length - 1].distance;

    sortedDistances
      .filter(entry => entry.distance === minDistance)
      .forEach(entry => closestIds.add(entry.playerId));

    sortedDistances
      .filter(entry => entry.distance === maxDistance)
      .forEach(entry => farthestIds.add(entry.playerId));

    if (closestIds.size === sortedDistances.length && farthestIds.size === sortedDistances.length) {
      if (minDistance === 0) {
        farthestIds.clear();
      } else {
        closestIds.clear();
      }
    }
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

  sortedDistances.forEach((entry, index) => {
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
      closest: closestIds.has(entry.playerId),
      farthest: farthestIds.has(entry.playerId)
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

      const locale = lobby?.language || DEFAULT_LANGUAGE;
      return a.name.localeCompare(b.name, locale);
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
  const connectedPlayers = Object.values(lobby.players).filter(player => player.connected);
  return connectedPlayers.length > 0 && connectedPlayers.every(player => player.hasSubmitted);
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
  const language = resolveLanguage(req.body?.language);

  const rawCustomQuestions = Array.isArray(req.body?.customQuestions) ? req.body.customQuestions : [];
  const customQuestions = normalizeCustomQuestions(rawCustomQuestions, language);
  const hasCustomQuestions = customQuestions.length > 0;
  const useOnlyCustomRequested = Boolean(req.body?.useOnlyCustom);

  if (useOnlyCustomRequested && !hasCustomQuestions) {
    res.status(400).json({ errorCode: 'NO_CUSTOM_QUESTIONS' });
    return;
  }

  const baseQuestions = getBaseQuestions(language);
  const baseQuestionCount = baseQuestions.length;
  const questionPool = useOnlyCustomRequested && hasCustomQuestions ? customQuestions : [...baseQuestions, ...customQuestions];

  if (questionPool.length === 0) {
    res.status(400).json({ errorCode: 'NO_QUESTIONS_AVAILABLE' });
    return;
  }

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
    playerStats: new Map(),
    disconnectTimers: new Map(),
    questionPool,
    customQuestions,
    baseQuestionCount,
    useOnlyCustom: useOnlyCustomRequested && hasCustomQuestions,
    language
  };
  lobbies.set(code, lobby);
  res.json({ code });
});

io.on('connection', socket => {
  socket.on('joinLobby', ({ code, name, playerId }, callback) => {
    const lobby = lobbies.get(code?.toUpperCase());
    if (!lobby) {
      callback?.({ errorCode: 'LOBBY_NOT_FOUND' });
      return;
    }

    const trimmedName = String(name || '').trim().slice(0, 18);
    const displayName = trimmedName.length > 0 ? trimmedName : 'Spieler';
    const requestedPlayerId = normalizePlayerId(playerId);
    let player = requestedPlayerId ? lobby.players[requestedPlayerId] : null;
    if (!player) {
      player = findDisconnectedPlayerByName(lobby, displayName);
    }

    if (player) {
      const previousSocketId = player.socketId;
      const timer = lobby.disconnectTimers.get(player.id);
      if (timer) {
        clearTimeout(timer);
        lobby.disconnectTimers.delete(player.id);
      }

      player.name = displayName;
      player.socketId = socket.id;
      player.connected = true;
      if (previousSocketId && previousSocketId !== socket.id) {
        io.sockets.sockets.get(previousSocketId)?.disconnect(true);
      }
    } else {
      if (Object.values(lobby.players).filter(p => p.connected).length >= MAX_PLAYERS) {
        callback?.({ errorCode: 'LOBBY_FULL' });
        return;
      }

      const id = generatePlayerId(lobby, requestedPlayerId);
      player = {
        id,
        socketId: socket.id,
        name: displayName,
        answer: null,
        hasSubmitted: false,
        ready: false,
        connected: true
      };
      lobby.players[id] = player;
    }

    ensurePlayerStats(lobby, player.id, displayName);

    socket.join(lobby.code);
    broadcastLobby(lobby);
    callback?.({ success: true, lobby: getLobbyState(lobby), playerId: player.id });
  });

  socket.on('submitAnswer', answer => {
    const { lobby, player } = findLobbyAndPlayerBySocket(socket.id) || {};
    if (!lobby || lobby.gameFinished || !lobby.collectingAnswers) return;

    if (!player || player.hasSubmitted) return;

    const parsedAnswer = parseNumericAnswer(answer, lobby.language);
    player.answer = parsedAnswer ?? (typeof answer === 'string' ? answer.trim() : answer);
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
    const { lobby, player } = findLobbyAndPlayerBySocket(socket.id) || {};
    if (!lobby || lobby.collectingAnswers || lobby.gameFinished) return;
    if (!player) return;
    player.ready = true;
    broadcastPlayers(lobby);
    if (allPlayersReady(lobby)) {
      startRound(lobby);
    }
  });

  socket.on('startRound', () => {
    const { lobby } = findLobbyAndPlayerBySocket(socket.id) || {};
    if (!lobby || lobby.collectingAnswers || lobby.gameFinished) return;
    if (!lobby.currentQuestion) {
      startRound(lobby);
    }
  });

  socket.on('voteEndGame', callback => {
    const { lobby, player } = findLobbyAndPlayerBySocket(socket.id) || {};
    if (!lobby || !lobby.isUnlimited || lobby.gameFinished) {
      callback?.({ success: false, errorCode: 'VOTE_NOT_ALLOWED' });
      return;
    }

    if (lobby.endVotes.has(player.id)) {
      callback?.({ success: false, errorCode: 'VOTE_ALREADY_CAST' });
      return;
    }

    lobby.endVotes.add(player.id);
    broadcastLobby(lobby);

    const connectedCount = getConnectedPlayers(lobby).length;
    if (connectedCount > 0 && lobby.endVotes.size >= connectedCount) {
      finalizeGame(lobby, 'vote');
    }

    callback?.({ success: true });
  });

  socket.on('leaveLobby', callback => {
    const { lobby, player } = findLobbyAndPlayerBySocket(socket.id) || {};
    if (lobby && player) {
      removePlayerFromLobby(lobby, player.id);
    }
    callback?.({ success: true });
  });

  socket.on('disconnect', () => {
    markPlayerDisconnected(socket.id);
  });
});

function findLobbyAndPlayerBySocket(socketId) {
  for (const lobby of lobbies.values()) {
    const player = Object.values(lobby.players).find(entry => entry.socketId === socketId);
    if (player) {
      return { lobby, player };
    }
  }
  return null;
}

function removePlayerFromLobby(lobby, playerId) {
  const timer = lobby.disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    lobby.disconnectTimers.delete(playerId);
  }

  delete lobby.players[playerId];
  lobby.endVotes.delete(playerId);

  if (Object.keys(lobby.players).length === 0) {
    lobbies.delete(lobby.code);
    return;
  }

  if (lobby.collectingAnswers && allPlayersSubmitted(lobby)) {
    evaluateRound(lobby);
  } else {
    broadcastLobby(lobby);
  }
}

function markPlayerDisconnected(socketId) {
  const found = findLobbyAndPlayerBySocket(socketId);
  if (!found) return;

  const { lobby, player } = found;
  player.connected = false;
  player.socketId = null;
  lobby.endVotes.delete(player.id);

  if (lobby.collectingAnswers && allPlayersSubmitted(lobby)) {
    evaluateRound(lobby);
  } else {
    broadcastLobby(lobby);
  }

  const timer = setTimeout(() => {
    const current = lobby.players[player.id];
    if (current && !current.connected) {
      removePlayerFromLobby(lobby, player.id);
    }
  }, DISCONNECTED_PLAYER_TTL_MS);
  lobby.disconnectTimers.set(player.id, timer);
}

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
