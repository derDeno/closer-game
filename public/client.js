const socket = io({ autoConnect: false });

const entryScreen = document.getElementById('entry-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const nameInput = document.getElementById('name-input');
const codeInput = document.getElementById('code-input');
const errorEl = document.getElementById('entry-error');
const lobbyCodeEl = document.getElementById('lobby-code');
const playerListEl = document.getElementById('player-list');
const questionArea = document.getElementById('question-area');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const answerHint = document.getElementById('answer-hint');
const resultsArea = document.getElementById('results-area');
const statusArea = document.getElementById('status-area');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');

let currentLobbyCode = null;
let answerSubmitted = false;
let readySent = false;
let lastResultsShown = false;

function showEntry() {
  entryScreen.classList.remove('hidden');
  lobbyScreen.classList.add('hidden');
}

function showLobby() {
  entryScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
}

async function createLobby() {
  try {
    const response = await fetch('/lobbies', { method: 'POST' });
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
  setStatus('Runde beendet. Klicke auf "Bereit" um fortzufahren.');
  lastResultsShown = true;
}

function applyLobbyState(state) {
  if (!state) return;
  renderPlayers(state.players || []);

  if (state.status === 'collecting' && state.currentQuestion) {
    questionText.textContent = state.currentQuestion.question;
    questionArea.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    if (!answerSubmitted) {
      answerInput.disabled = false;
      answerHint.textContent = '';
    }
    setStatus('Runde läuft – gib deine Antwort ein!');
    readyBtn.classList.add('hidden');
  } else if (state.status === 'waiting') {
    questionArea.classList.add('hidden');
    if (!readySent) {
      readyBtn.classList.remove('hidden');
      readyBtn.disabled = false;
      readyBtn.textContent = 'Bereit zum Start';
    }
    setStatus('Warte auf den Start der Runde.');
  } else if (state.status === 'results' && state.lastResults && !lastResultsShown) {
    displayResults(state.lastResults);
  }
}

joinBtn.addEventListener('click', joinLobby);
createBtn.addEventListener('click', createLobby);

answerForm.addEventListener('submit', event => {
  event.preventDefault();
  if (answerSubmitted) return;
  const answer = answerInput.value.trim();
  if (!answer) return;
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
});

showEntry();
