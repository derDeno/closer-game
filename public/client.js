const socket = io({ autoConnect: false });

const entryScreen = document.getElementById('entry-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const nameInput = document.getElementById('name-input');
const codeInput = document.getElementById('code-input');
const errorEl = document.getElementById('entry-error');
const modeFixedRadio = document.getElementById('mode-fixed');
const modeUnlimitedRadio = document.getElementById('mode-unlimited');
const questionCountInput = document.getElementById('question-count');
const fixedConfig = document.getElementById('fixed-config');
const lobbyCodeEl = document.getElementById('lobby-code');
const playerListEl = document.getElementById('player-list');
const questionArea = document.getElementById('question-area');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const answerHint = document.getElementById('answer-hint');
const resultsArea = document.getElementById('results-area');
const summaryArea = document.getElementById('summary-area');
const statusArea = document.getElementById('status-area');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');
const voteBtn = document.getElementById('end-vote-btn');

let currentLobbyCode = null;
let currentPlayerId = null;
let answerSubmitted = false;
let readySent = false;
let lastResultsShown = false;

const distanceFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 2,
  useGrouping: true
});

function formatDistance(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return distanceFormatter.format(value);
}

function showEntry() {
  entryScreen.classList.remove('hidden');
  lobbyScreen.classList.add('hidden');
}

function showLobby() {
  entryScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
}

function updateQuestionModeUI() {
  const isFixed = modeFixedRadio.checked;
  if (isFixed) {
    fixedConfig.classList.remove('hidden');
    questionCountInput.disabled = false;
  } else {
    fixedConfig.classList.add('hidden');
    questionCountInput.disabled = true;
  }
}

async function createLobby() {
  try {
    const mode = modeUnlimitedRadio.checked ? 'unlimited' : 'fixed';
    let questionCount = null;
    errorEl.textContent = '';

    if (mode === 'fixed') {
      const parsed = Number.parseInt(questionCountInput.value, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        errorEl.textContent = 'Bitte gib eine gültige Anzahl an Fragen ein.';
        return;
      }
      questionCount = Math.min(parsed, 99);
      questionCountInput.value = String(questionCount);
    }

    const response = await fetch('/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, questionCount })
    });
    const data = await response.json();
    if (data?.code) {
      codeInput.value = data.code;
      joinLobby();
    }
  } catch (error) {
    errorEl.textContent = 'Lobby konnte nicht erstellt werden.';
  }
}

function joinLobby() {
  const name = nameInput.value.trim();
  const code = codeInput.value.trim().toUpperCase();

  if (!code || code.length !== 4) {
    errorEl.textContent = 'Bitte gib einen gültigen 4-stelligen Code ein.';
    return;
  }

  joinBtn.disabled = true;
  createBtn.disabled = true;
  errorEl.textContent = '';

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit('joinLobby', { code, name }, response => {
    if (!response?.success) {
      errorEl.textContent = response?.error || 'Beitritt fehlgeschlagen.';
      joinBtn.disabled = false;
      createBtn.disabled = false;
      return;
    }

    currentLobbyCode = code;
    currentPlayerId = response.playerId || null;
    lobbyCodeEl.textContent = code;
    showLobby();
    answerInput.value = '';
    answerInput.disabled = false;
    readyBtn.classList.add('hidden');
    readyBtn.disabled = false;
    readySent = false;
    lastResultsShown = false;

    if (response.lobby) {
      applyLobbyState(response.lobby);
    }
  });
}

function renderPlayers(players) {
  playerListEl.innerHTML = '';
  players.forEach(player => {
    const div = document.createElement('div');
    div.className = `player-card ${player.ready ? 'ready' : 'waiting'}`;
    div.innerHTML = `
      <span class="player-name">${escapeHtml(player.name)}</span>
      <span class="player-status">${player.ready ? 'Bereit' : 'Wartet'}</span>
    `;
    playerListEl.appendChild(div);
  });
}

function setStatus(message) {
  statusArea.textContent = message || '';
}

function resetRoundUI() {
  answerSubmitted = false;
  answerInput.value = '';
  answerInput.disabled = false;
  answerHint.textContent = '';
  resultsArea.innerHTML = '';
  resultsArea.classList.add('hidden');
  summaryArea.innerHTML = '';
  summaryArea.classList.add('hidden');
  questionArea.classList.remove('hidden');
  readyBtn.classList.add('hidden');
  readyBtn.disabled = false;
  readySent = false;
  lastResultsShown = false;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function displayResults({ answers = [], correctAnswer, type }) {
  questionArea.classList.add('hidden');
  resultsArea.classList.remove('hidden');
  resultsArea.innerHTML = '';
  summaryArea.classList.add('hidden');
  summaryArea.innerHTML = '';

  if (typeof correctAnswer !== 'undefined' && correctAnswer !== null) {
    const correct = document.createElement('p');
    correct.className = 'hint';
    correct.textContent = `Richtige Antwort: ${correctAnswer}`;
    resultsArea.appendChild(correct);
  }

  answers.forEach(entry => {
    const div = document.createElement('div');
    div.className = `result-entry ${entry.closest ? 'closest' : ''} ${entry.farthest ? 'farthest' : ''}`;
    const label = document.createElement('span');
    label.innerHTML = `<strong>${escapeHtml(entry.name)}</strong>: ${escapeHtml(entry.answer ?? '–')}`;
    div.appendChild(label);

    if (entry.closest) {
      const badge = document.createElement('span');
      badge.className = 'badge good';
      badge.textContent = 'Am nächsten dran';
      div.appendChild(badge);
    } else if (entry.farthest) {
      const badge = document.createElement('span');
      badge.className = 'badge bad';
      badge.textContent = 'Am weitesten weg';
      div.appendChild(badge);
    }

    resultsArea.appendChild(div);
  });

  readyBtn.classList.remove('hidden');
  readyBtn.disabled = false;
  readyBtn.textContent = 'Bereit für nächste Runde';
  lastResultsShown = true;
}

function displaySummary(summary) {
  const data = summary || {};
  questionArea.classList.add('hidden');
  resultsArea.classList.add('hidden');
  readyBtn.classList.add('hidden');
  summaryArea.classList.remove('hidden');
  summaryArea.innerHTML = '';
  voteBtn.classList.add('hidden');
  answerInput.disabled = true;
  answerHint.textContent = '';
  lastResultsShown = true;

  const heading = document.createElement('h3');
  heading.textContent = 'Highscore der Runde';
  summaryArea.appendChild(heading);

  if (typeof data.roundsPlayed === 'number') {
    const roundsInfo = document.createElement('p');
    roundsInfo.className = 'hint';
    roundsInfo.textContent = `Gespielte Runden: ${data.roundsPlayed}`;
    summaryArea.appendChild(roundsInfo);
  }

  if (data.reason) {
    const reasonText = document.createElement('p');
    reasonText.className = 'hint';
    reasonText.textContent =
      data.reason === 'vote'
        ? 'Das Spiel wurde per Abstimmung beendet.'
        : 'Das Spiel endete nach der festgelegten Rundenanzahl.';
    summaryArea.appendChild(reasonText);
  }

  if (data.question) {
    const questionInfo = document.createElement('p');
    questionInfo.innerHTML = `<strong>Frage:</strong> ${escapeHtml(data.question)}`;
    summaryArea.appendChild(questionInfo);
  }

  if (typeof data.correctAnswer !== 'undefined' && data.correctAnswer !== null) {
    const answerInfo = document.createElement('p');
    answerInfo.innerHTML = `<strong>Richtige Antwort:</strong> ${escapeHtml(data.correctAnswer)}`;
    summaryArea.appendChild(answerInfo);
  }

  if (Array.isArray(data.highscore) && data.highscore.length > 0) {
    const list = document.createElement('div');
    list.className = 'results-list';

    data.highscore.forEach((entry, index) => {
      const row = document.createElement('div');
      row.className = 'result-entry';

      const name = document.createElement('span');
      name.innerHTML = `<strong>${index + 1}. ${escapeHtml(entry.name)}</strong>`;
      row.appendChild(name);

      const details = document.createElement('span');
      if (entry.distance === null || entry.distance === undefined) {
        details.textContent = 'Keine gültige Antwort';
      } else {
        const answerText = typeof entry.answer === 'undefined' || entry.answer === null ? '–' : entry.answer;
        const formatted = formatDistance(entry.distance);
        details.textContent = `${answerText} (Abweichung: ${formatted ?? entry.distance})`;
      }
      row.appendChild(details);

      list.appendChild(row);
    });

    summaryArea.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Keine gültigen Antworten verfügbar.';
    summaryArea.appendChild(empty);
  }
}

function applyLobbyState(state) {
  if (!state) return;
  renderPlayers(state.players || []);

  const settings = state.settings || {};
  const endVote = state.endVote || null;

  if (settings.mode === 'unlimited' && state.status !== 'finished') {
    voteBtn.classList.remove('hidden');
    const label = endVote ? `Spiel beenden (${endVote.count}/${endVote.required})` : 'Spiel beenden (Abstimmung)';
    voteBtn.textContent = label;
    const hasVoted = Array.isArray(endVote?.voterIds) && currentPlayerId ? endVote.voterIds.includes(currentPlayerId) : false;
    voteBtn.disabled = hasVoted;
  } else {
    voteBtn.classList.add('hidden');
    voteBtn.disabled = false;
  }

  let statusMessage = null;

  if (state.status === 'collecting' && state.currentQuestion) {
    questionText.textContent = state.currentQuestion.question;
    questionArea.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    summaryArea.classList.add('hidden');
    if (!answerSubmitted) {
      answerInput.disabled = false;
      answerHint.textContent = '';
    }
    readyBtn.classList.add('hidden');
    statusMessage = 'Runde läuft – gib deine Antwort ein!';
  } else if (state.status === 'waiting') {
    questionArea.classList.add('hidden');
    resultsArea.classList.add('hidden');
    summaryArea.classList.add('hidden');
    if (!readySent) {
      readyBtn.classList.remove('hidden');
      readyBtn.disabled = false;
      readyBtn.textContent = 'Bereit zum Start';
    }
    statusMessage = 'Warte auf den Start der Runde.';
  } else if (state.status === 'results' && state.lastResults && !lastResultsShown) {
    displayResults(state.lastResults);
    statusMessage = 'Runde beendet. Klicke auf "Bereit" um fortzufahren.';
  } else if (state.status === 'finished') {
    displaySummary(state.finalSummary || null);
    statusMessage = 'Spiel beendet.';
  }

  if (endVote && state.status !== 'finished') {
    const voterNames = Array.isArray(endVote.voterNames) && endVote.voterNames.length > 0 ? ` – ${endVote.voterNames.join(', ')}` : '';
    const voteMessage = `Stimmen für Spielende: ${endVote.count}/${endVote.required}${voterNames}`;
    statusMessage = statusMessage ? `${statusMessage} ${voteMessage}` : voteMessage;
  }

  if (statusMessage !== null) {
    setStatus(statusMessage);
  }
}

joinBtn.addEventListener('click', joinLobby);
createBtn.addEventListener('click', createLobby);
modeFixedRadio.addEventListener('change', updateQuestionModeUI);
modeUnlimitedRadio.addEventListener('change', updateQuestionModeUI);

answerForm.addEventListener('submit', event => {
  event.preventDefault();
  if (answerSubmitted) return;
  const answer = answerInput.value.trim();
  if (!answer) {
    answerHint.textContent = 'Bitte gib eine Zahl ein.';
    return;
  }
  const normalized = answer.replace(',', '.');
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    answerHint.textContent = 'Bitte gib eine gültige Zahl ein.';
    return;
  }
  socket.emit('submitAnswer', answer);
  answerSubmitted = true;
  answerInput.disabled = true;
  answerHint.textContent = 'Antwort gesendet. Warte auf die anderen Spieler…';
});

readyBtn.addEventListener('click', () => {
  if (readySent) return;
  socket.emit('playerReady');
  readySent = true;
  readyBtn.disabled = true;
  readyBtn.textContent = 'Bereit!';
});

leaveBtn.addEventListener('click', () => {
  window.location.reload();
});

voteBtn.addEventListener('click', () => {
  if (voteBtn.disabled) return;
  voteBtn.disabled = true;
  socket.emit('voteEndGame', response => {
    if (!response?.success) {
      voteBtn.disabled = false;
      if (response?.error) {
        setStatus(response.error);
      }
    }
  });
});

socket.on('connect_error', () => {
  errorEl.textContent = 'Verbindung fehlgeschlagen.';
  joinBtn.disabled = false;
  createBtn.disabled = false;
});

socket.on('lobbyUpdate', state => {
  applyLobbyState(state);
});

socket.on('playersUpdate', players => {
  renderPlayers(players || []);
});

socket.on('roundStarted', payload => {
  questionText.textContent = payload.question;
  setStatus('Runde läuft – gib deine Antwort ein!');
  resetRoundUI();
});

socket.on('answerReceived', ({ name }) => {
  setStatus(`${name} hat geantwortet…`);
});

socket.on('roundResults', payload => {
  displayResults(payload);
  setStatus('Runde beendet. Klicke auf "Bereit" um fortzufahren.');
});

socket.on('gameSummary', summary => {
  displaySummary(summary);
  setStatus('Spiel beendet.');
});

updateQuestionModeUI();
showEntry();
