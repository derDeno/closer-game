const socket = io({ autoConnect: false });

const entryScreen = document.getElementById('entry-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const entryModeSelect = document.getElementById('entry-mode-select');
const entryFormPanel = document.getElementById('entry-form-panel');
const selectJoinBtn = document.getElementById('select-join-btn');
const selectCreateBtn = document.getElementById('select-create-btn');
const entryBackBtn = document.getElementById('entry-back-btn');
const joinSettings = document.getElementById('join-settings');
const createSettings = document.getElementById('create-settings');
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const nameInput = document.getElementById('name-input');
const codeInput = document.getElementById('code-input');
const languageSelect = document.getElementById('language-select');
const errorEl = document.getElementById('entry-error');
const modeFixedRadio = document.getElementById('mode-fixed');
const modeUnlimitedRadio = document.getElementById('mode-unlimited');
const questionCountInput = document.getElementById('question-count');
const fixedConfig = document.getElementById('fixed-config');
const customQuestionsSection = document.getElementById('custom-questions-section');
const customQuestionsList = document.getElementById('custom-questions-list');
const addCustomQuestionBtn = document.getElementById('add-custom-question-btn');
const questionCatalogSelect = document.getElementById('question-catalog-select');
const lobbyCodeEl = document.getElementById('lobby-code');
const playerListEl = document.getElementById('player-list');
const questionArea = document.getElementById('question-area');
const questionText = document.getElementById('question-text');
const answerForm = document.getElementById('answer-form');
const answerInput = document.getElementById('answer-input');
const answerHint = document.getElementById('answer-hint');
const resultsArea = document.getElementById('results-area');
const summaryArea = document.getElementById('summary-area');
const highscoreBtn = document.getElementById('show-highscore-btn');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');
const voteBtn = document.getElementById('end-vote-btn');

const DEFAULT_LANGUAGE = 'de';

const languageConfigs = {
  de: { locale: 'de-DE', label: 'Deutsch', langAttr: 'de' },
  en: { locale: 'en-US', label: 'English', langAttr: 'en' }
};

const translations = {
  de: {
    appTitle: 'Näher Draan',
    nameLabel: 'Dein Name',
    namePlaceholder: 'Spieler',
    codeLabel: 'Lobby-Code',
    codePlaceholder: 'ABCD',
    languageLabel: 'Sprache',
    languageOptionDe: 'Deutsch',
    languageOptionEn: 'Englisch',
    questionCatalogLabel: 'Fragenkatalog',
    questionCatalogDefault: 'Standardfragen',
    questionCatalogCustom: 'Eigene Fragen',
    backToModeSelection: 'Zurück',
    modeLegend: 'Rundenmodus',
    modeFixedLabel: 'Feste Anzahl von Fragen',
    modeFixedCountLabel: 'Anzahl der Fragen',
    modeUnlimitedLabel: 'Unbegrenzt – Spielende per Abstimmung',
    customQuestionsHeading: 'Eigene Fragen',
    customQuestionsDescription: 'Füge eigene Fragen hinzu, um eine individuelle Runde zu spielen.',
    addCustomQuestion: 'Eigene Frage hinzufügen',
    addCustomQuestionAria: 'Eigene Frage hinzufügen',
    customQuestionHint: 'Gib eine Frage und die korrekte Zahl ein.',
    customQuestionLabel: 'Frage {index}',
    customQuestionPlaceholder: 'Frage',
    customAnswerLabel: 'Antwort',
    customAnswerPlaceholder: 'Antwort',
    removeCustomQuestion: 'Entfernen',
    removeCustomQuestionAria: 'Eigene Frage entfernen',
    joinButton: 'Lobby beitreten',
    createButton: 'Neue Lobby erstellen',
    entryErrorName: 'Bitte gib deinen Namen ein.',
    entryErrorQuestionCount: 'Bitte gib eine gültige Anzahl an Fragen ein.',
    entryErrorCode: 'Bitte gib einen gültigen 4-stelligen Code ein.',
    entryErrorGeneric: 'Lobby konnte nicht erstellt werden.',
    errorCreateLobby: 'Lobby konnte nicht erstellt werden.',
    errorNoQuestionsAvailable: 'Es stehen keine Fragen zur Verfügung.',
    errorJoinFailed: 'Beitritt fehlgeschlagen.',
    errorCustomRequired: 'Bitte füge mindestens eine gültige eigene Frage hinzu.',
    lobbyNotFound: 'Lobby nicht gefunden.',
    lobbyFull: 'Die Lobby ist bereits voll.',
    voteNotAllowed: 'Eine Abstimmung ist derzeit nicht möglich.',
    voteAlready: 'Du hast bereits für das Spielende gestimmt.',
    connectionFailed: 'Verbindung fehlgeschlagen.',
    submitAnswer: 'Antwort senden',
    answerPlaceholder: 'Deine Antwort',
    answerRequired: 'Bitte gib eine Zahl ein.',
    answerInvalid: 'Bitte gib eine gültige Zahl ein.',
    answerSent: 'Antwort gesendet. Warte auf die anderen Spieler…',
    playerStatusOffline: 'Offline',
    playerStatusSubmitted: 'Antwort gesendet',
    playerStatusPending: 'Antwort ausstehend',
    playerStatusFinished: 'Spiel beendet',
    playerStatusReady: 'Bereit',
    playerStatusWaiting: 'Wartet',
    voteLabel: 'Spiel beenden (Abstimmung)',
    voteLabelWithCount: 'Spiel beenden ({count}/{required})',
    voteStatus: 'Stimmen für Spielende: {count}/{required}{names}',
    voteStatusNames: ' – {names}',
    resultsCorrectAnswer: 'Richtige Antwort: {answer}',
    badgeClosest: 'Am nächsten dran',
    badgeFarthest: 'Am weitesten weg',
    readyNextRound: 'Bereit für nächste Runde',
    readyStart: 'Bereit zum Start',
    readyConfirmed: 'Bereit!',
    summaryHeading: 'Highscore des Spiels',
    summaryRounds: 'Gespielte Runden: {count}',
    summaryReasonVote: 'Das Spiel wurde per Abstimmung beendet.',
    summaryReasonLimit: 'Das Spiel endete nach der festgelegten Rundenanzahl.',
    summaryReasonNoQuestions: 'Das Spiel endete, da keine Fragen mehr verfügbar waren.',
    summaryPoints: 'Punkte: {value}',
    summaryAverageDeviation: 'Ø Abweichung: {value}',
    summaryAverageDeviationNone: 'Ø Abweichung: –',
    summaryEmpty: 'Keine gültigen Antworten verfügbar.',
    showHighscore: 'Highscore anzeigen',
    leaveLobby: 'Lobby verlassen',
    logoAlt: 'Näher Draan Logo',
    entryTitle: 'Näher Draan'
  },
  en: {
    appTitle: 'Closer Game',
    nameLabel: 'Your name',
    namePlaceholder: 'Player',
    codeLabel: 'Lobby code',
    codePlaceholder: 'ABCD',
    languageLabel: 'Language',
    languageOptionDe: 'German',
    languageOptionEn: 'English',
    questionCatalogLabel: 'Question catalog',
    questionCatalogDefault: 'Default questions',
    questionCatalogCustom: 'Custom questions',
    backToModeSelection: 'Back',
    modeLegend: 'Round mode',
    modeFixedLabel: 'Fixed number of questions',
    modeFixedCountLabel: 'Number of questions',
    modeUnlimitedLabel: 'Unlimited – vote to end the game',
    customQuestionsHeading: 'Custom questions',
    customQuestionsDescription: 'Add your own questions to play a custom round.',
    addCustomQuestion: 'Add custom question',
    addCustomQuestionAria: 'Add custom question',
    customQuestionHint: 'Provide a question and the correct number.',
    customQuestionLabel: 'Question {index}',
    customQuestionPlaceholder: 'Question',
    customAnswerLabel: 'Answer',
    customAnswerPlaceholder: 'Answer',
    removeCustomQuestion: 'Remove',
    removeCustomQuestionAria: 'Remove custom question',
    joinButton: 'Join lobby',
    createButton: 'Create new lobby',
    entryErrorName: 'Please enter your name.',
    entryErrorQuestionCount: 'Please enter a valid number of questions.',
    entryErrorCode: 'Please enter a valid 4-letter code.',
    entryErrorGeneric: 'Failed to create lobby.',
    errorCreateLobby: 'Failed to create lobby.',
    errorNoQuestionsAvailable: 'No questions available.',
    errorJoinFailed: 'Failed to join lobby.',
    errorCustomRequired: 'Please add at least one valid custom question.',
    lobbyNotFound: 'Lobby not found.',
    lobbyFull: 'The lobby is already full.',
    voteNotAllowed: 'A vote to end the game is not possible right now.',
    voteAlready: 'You have already voted to end the game.',
    connectionFailed: 'Connection failed.',
    submitAnswer: 'Submit answer',
    answerPlaceholder: 'Your answer',
    answerRequired: 'Please enter a number.',
    answerInvalid: 'Please enter a valid number.',
    answerSent: 'Answer submitted. Waiting for the other players…',
    playerStatusOffline: 'Offline',
    playerStatusSubmitted: 'Answer submitted',
    playerStatusPending: 'Answer pending',
    playerStatusFinished: 'Game finished',
    playerStatusReady: 'Ready',
    playerStatusWaiting: 'Waiting',
    voteLabel: 'End game (vote)',
    voteLabelWithCount: 'End game ({count}/{required})',
    voteStatus: 'Votes to end the game: {count}/{required}{names}',
    voteStatusNames: ' – {names}',
    resultsCorrectAnswer: 'Correct answer: {answer}',
    badgeClosest: 'Closest',
    badgeFarthest: 'Farthest',
    readyNextRound: 'Ready for next round',
    readyStart: 'Ready to start',
    readyConfirmed: 'Ready!',
    summaryHeading: 'Game highscore',
    summaryRounds: 'Rounds played: {count}',
    summaryReasonVote: 'The game was ended by a vote.',
    summaryReasonLimit: 'The game ended after the set number of rounds.',
    summaryReasonNoQuestions: 'The game ended because no questions were available.',
    summaryPoints: 'Points: {value}',
    summaryAverageDeviation: 'Avg. deviation: {value}',
    summaryAverageDeviationNone: 'Avg. deviation: –',
    summaryEmpty: 'No valid answers available.',
    showHighscore: 'Show highscore',
    leaveLobby: 'Leave lobby',
    logoAlt: 'Closer Game logo',
    entryTitle: 'Closer Game'
  }
};

let currentLanguage = DEFAULT_LANGUAGE;
let lobbyLanguage = null;

let distanceFormatter;
let numberFormatter;
let integerFormatter;

function getLanguageConfig(language) {
  const normalized = typeof language === 'string' ? language.trim().toLowerCase() : DEFAULT_LANGUAGE;
  return languageConfigs[normalized] || languageConfigs[DEFAULT_LANGUAGE];
}

function formatTemplate(template, params) {
  if (typeof template !== 'string') {
    return '';
  }
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = params[key];
    return typeof value === 'undefined' ? `{${key}}` : String(value);
  });
}

function t(key, params = {}) {
  const translationsForLanguage = translations[currentLanguage] || translations[DEFAULT_LANGUAGE] || {};
  const fallback = translations[DEFAULT_LANGUAGE] || {};
  const template = translationsForLanguage[key] ?? fallback[key] ?? '';
  return formatTemplate(template, params);
}

function parseI18nParams(value) {
  if (!value) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function updateFormatters() {
  const config = getLanguageConfig(currentLanguage);
  const locale = config.locale;
  distanceFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    useGrouping: true
  });
  numberFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 20,
    useGrouping: true
  });
  integerFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    useGrouping: true
  });
}

function applyTranslations() {
  document.title = t('appTitle');
  const config = getLanguageConfig(currentLanguage);
  document.documentElement.lang = config.langAttr;

  updateCustomQuestionLabels();

  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (!key) return;
    const params = parseI18nParams(element.getAttribute('data-i18n-params'));
    element.textContent = t(key, params);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (!key) return;
    const params = parseI18nParams(element.getAttribute('data-i18n-params'));
    element.setAttribute('placeholder', t(key, params));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
    const key = element.getAttribute('data-i18n-aria-label');
    if (!key) return;
    const params = parseI18nParams(element.getAttribute('data-i18n-params'));
    element.setAttribute('aria-label', t(key, params));
  });

  document.querySelectorAll('[data-i18n-alt]').forEach(element => {
    const key = element.getAttribute('data-i18n-alt');
    if (!key) return;
    const params = parseI18nParams(element.getAttribute('data-i18n-params'));
    element.setAttribute('alt', t(key, params));
  });

  document.querySelectorAll('[data-i18n-option]').forEach(element => {
    const key = element.getAttribute('data-i18n-option');
    if (!key) return;
    const params = parseI18nParams(element.getAttribute('data-i18n-params'));
    element.textContent = t(key, params);
  });

  if (addCustomQuestionBtn) {
    addCustomQuestionBtn.setAttribute('aria-label', t('addCustomQuestionAria'));
  }
}

function setLanguage(language, { updateSelect = true } = {}) {
  const configKey = typeof language === 'string' ? language.trim().toLowerCase() : DEFAULT_LANGUAGE;
  currentLanguage = translations[configKey] ? configKey : DEFAULT_LANGUAGE;
  if (updateSelect && languageSelect && languageSelect.value !== currentLanguage) {
    languageSelect.value = currentLanguage;
  }
  updateFormatters();
  applyTranslations();
}

const MAX_CUSTOM_QUESTIONS = 50;

function updateCustomQuestionLabels() {
  if (!customQuestionsList) {
    return;
  }

  const rows = Array.from(customQuestionsList.querySelectorAll('.custom-question-row'));
  rows.forEach((row, index) => {
    const label = row.querySelector('.custom-question-label');
    if (label) {
      label.setAttribute('data-i18n-params', JSON.stringify({ index: index + 1 }));
    }
  });

  if (addCustomQuestionBtn) {
    addCustomQuestionBtn.disabled = rows.length >= MAX_CUSTOM_QUESTIONS;
  }
}

function updateQuestionCatalogUI() {
  if (!customQuestionsSection || !questionCatalogSelect) {
    return;
  }

  if (questionCatalogSelect.value === 'custom') {
    customQuestionsSection.classList.remove('hidden');
  } else {
    customQuestionsSection.classList.add('hidden');
  }
}

function createCustomQuestionRow({ question = '', answer = '' } = {}) {
  if (!customQuestionsList) {
    return;
  }
  if (customQuestionsList.querySelectorAll('.custom-question-row').length >= MAX_CUSTOM_QUESTIONS) {
    return;
  }

  const row = document.createElement('div');
  row.className = 'custom-question-row';

  const fields = document.createElement('div');
  fields.className = 'custom-question-fields';

  const questionGroup = document.createElement('div');
  questionGroup.className = 'form-group';
  const questionLabel = document.createElement('label');
  questionLabel.className = 'custom-question-label';
  questionLabel.setAttribute('data-i18n', 'customQuestionLabel');
  questionGroup.append(questionLabel);
  const questionInput = document.createElement('input');
  questionInput.type = 'text';
  questionInput.maxLength = 200;
  questionInput.value = question;
  questionInput.className = 'custom-question-input';
  questionInput.setAttribute('data-i18n-placeholder', 'customQuestionPlaceholder');
  questionInput.setAttribute('placeholder', t('customQuestionPlaceholder'));
  questionGroup.append(questionInput);

  const answerGroup = document.createElement('div');
  answerGroup.className = 'form-group';
  const answerLabel = document.createElement('label');
  answerLabel.setAttribute('data-i18n', 'customAnswerLabel');
  answerGroup.append(answerLabel);
  const answerInput = document.createElement('input');
  answerInput.type = 'text';
  answerInput.inputMode = 'decimal';
  answerInput.value = answer;
  answerInput.className = 'custom-answer-input';
  answerInput.setAttribute('data-i18n-placeholder', 'customAnswerPlaceholder');
  answerInput.setAttribute('placeholder', t('customAnswerPlaceholder'));
  answerInput.addEventListener('blur', () => {
    const normalized = normalizeNumericString(answerInput.value);
    if (!normalized) {
      answerInput.value = '';
      return;
    }
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      const formatted = formatNumericValue(parsed);
      if (formatted) {
        answerInput.value = formatted;
      }
    }
  });
  answerGroup.append(answerInput);

  fields.append(questionGroup, answerGroup);

  const actions = document.createElement('div');
  actions.className = 'custom-question-actions';
  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.className = 'link remove-custom-question';
  removeButton.setAttribute('data-i18n', 'removeCustomQuestion');
  removeButton.setAttribute('data-i18n-aria-label', 'removeCustomQuestionAria');
  removeButton.addEventListener('click', () => {
    row.remove();
    updateCustomQuestionLabels();
    applyTranslations();
  });
  actions.append(removeButton);

  row.append(fields, actions);
  customQuestionsList.append(row);
  updateCustomQuestionLabels();
  applyTranslations();
}

function collectCustomQuestions() {
  if (!customQuestionsList) {
    return [];
  }

  const rows = Array.from(customQuestionsList.querySelectorAll('.custom-question-row'));
  const collected = [];

  for (const row of rows) {
    const questionInput = row.querySelector('.custom-question-input');
    const answerInput = row.querySelector('.custom-answer-input');
    const questionText = questionInput?.value?.trim();
    const normalizedAnswer = normalizeNumericString(answerInput?.value ?? '');

    if (!questionText || !normalizedAnswer) {
      continue;
    }

    const numericAnswer = Number(normalizedAnswer);
    if (!Number.isFinite(numericAnswer)) {
      continue;
    }

    collected.push({ question: questionText, answer: numericAnswer });
    if (collected.length >= MAX_CUSTOM_QUESTIONS) {
      break;
    }
  }

  return collected;
}

const errorCodeTranslations = {
  LOBBY_NOT_FOUND: 'lobbyNotFound',
  LOBBY_FULL: 'lobbyFull',
  VOTE_NOT_ALLOWED: 'voteNotAllowed',
  VOTE_ALREADY_CAST: 'voteAlready',
  NO_CUSTOM_QUESTIONS: 'errorCustomRequired',
  NO_QUESTIONS_AVAILABLE: 'errorNoQuestionsAvailable'
};

function translateErrorCode(code, fallbackKey) {
  if (typeof code !== 'string' || code.length === 0) {
    return fallbackKey ? t(fallbackKey) : '';
  }
  const key = errorCodeTranslations[code] || fallbackKey;
  return key ? t(key) : '';
}

let currentLobbyCode = null;
let currentPlayerId = null;
let answerSubmitted = false;
let readySent = false;
let lastResultsShown = false;
let currentLobbyStatus = 'waiting';
let latestPlayers = [];
let pendingSummary = null;
let summaryVisible = false;
let rejoinInFlight = false;

const LOBBY_SESSION_KEY = 'closer-game:lobby-session';
const LOBBY_SESSION_COOKIE = 'closer_game_lobby_session';

function parseLobbySession(value) {
  try {
    const parsed = JSON.parse(value || 'null');
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const code = typeof parsed.code === 'string' ? parsed.code.trim().toUpperCase() : '';
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const playerId = typeof parsed.playerId === 'string' ? parsed.playerId.trim() : '';
    return code && name && playerId ? { code, name, playerId } : null;
  } catch (error) {
    return null;
  }
}

function readStoredValue(storage) {
  try {
    return storage?.getItem(LOBBY_SESSION_KEY) || null;
  } catch (error) {
    return null;
  }
}

function getLobbySessionCookie() {
  const prefix = `${LOBBY_SESSION_COOKIE}=`;
  const entry = document.cookie
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));
  if (!entry) {
    return null;
  }

  try {
    return decodeURIComponent(entry.slice(prefix.length));
  } catch (error) {
    return null;
  }
}

function getSavedLobbySession() {
  return parseLobbySession(readStoredValue(window.localStorage))
    || parseLobbySession(readStoredValue(window.sessionStorage))
    || parseLobbySession(getLobbySessionCookie());
}

function createPlayerId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function saveLobbySession({ code, name, playerId }) {
  const session = {
    code: String(code || '').trim().toUpperCase(),
    name: String(name || '').trim(),
    playerId: String(playerId || '').trim()
  };
  if (!session.code || !session.name || !session.playerId) {
    return;
  }

  const value = JSON.stringify(session);
  try {
    window.localStorage.setItem(LOBBY_SESSION_KEY, value);
  } catch (error) {
    // Browsers can deny storage in private or restricted modes.
  }
  try {
    window.sessionStorage.setItem(LOBBY_SESSION_KEY, value);
  } catch (error) {
    // Keep going; the cookie fallback may still work.
  }
  try {
    document.cookie = `${LOBBY_SESSION_COOKIE}=${encodeURIComponent(value)}; max-age=86400; path=/; samesite=lax`;
  } catch (error) {
    // Reconnect still works while the page keeps its in-memory state.
  }
}

function clearLobbySession() {
  try {
    window.localStorage.removeItem(LOBBY_SESSION_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
  try {
    window.sessionStorage.removeItem(LOBBY_SESSION_KEY);
  } catch (error) {
    // Ignore storage failures.
  }
  try {
    document.cookie = `${LOBBY_SESSION_COOKIE}=; max-age=0; path=/; samesite=lax`;
  } catch (error) {
    // Ignore storage failures.
  }
}

function formatDistance(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return distanceFormatter.format(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getNumberSeparators(language = currentLanguage) {
  const locale = getLanguageConfig(language).locale;
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  return {
    decimal: parts.find(part => part.type === 'decimal')?.value || '.',
    group: parts.find(part => part.type === 'group')?.value || ','
  };
}

function removeSeparator(value, separator) {
  return separator ? value.replace(new RegExp(escapeRegExp(separator), 'g'), '') : value;
}

function normalizeNumericString(value, language = currentLanguage) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

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
  const thousandsPattern = new RegExp(`^\\d{1,3}(${escapeRegExp(uniqueSeparators[0] || '')}\\d{3})+$`);
  let decimalSeparator = null;

  if (uniqueSeparators.length > 1) {
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');
    decimalSeparator = lastComma > lastDot ? ',' : '.';
  } else if (uniqueSeparators.length === 1) {
    const separator = uniqueSeparators[0];
    const separatorCount = separatorMatches.length;
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

  const lastComma = normalized.lastIndexOf(',');
  const lastDot = normalized.lastIndexOf('.');

  if (!decimalSeparator && (lastComma !== -1 || lastDot !== -1)) {
    decimalSeparator = lastComma > lastDot ? ',' : '.';
  }

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

  const normalizedNumber = `${negative ? '-' : ''}${integerPart || '0'}${fractionPart.length > 0 ? `.${fractionPart}` : ''}`;
  return normalizedNumber;
}

function getNumberFormatter({ integer = false, language = currentLanguage } = {}) {
  if (language === currentLanguage) {
    return integer ? integerFormatter : numberFormatter;
  }

  return new Intl.NumberFormat(getLanguageConfig(language).locale, {
    maximumFractionDigits: integer ? 0 : 20,
    useGrouping: true
  });
}

function formatNumericValue(value, { integer = false, language = currentLanguage } = {}) {
  const formatter = getNumberFormatter({ integer, language });

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    return formatter.format(value);
  }

  if (typeof value === 'string') {
    const normalized = normalizeNumericString(value);
    if (!normalized) {
      return null;
    }
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return formatter.format(parsed);
  }

  return null;
}

function showEntry() {
  document.body.classList.remove('lobby-view', 'round-active');
  lobbyScreen.classList.remove('round-active');
  entryScreen.classList.remove('hidden');
  lobbyScreen.classList.add('hidden');
  showEntryModeSelection();
}

function showLobby() {
  entryScreen.classList.add('hidden');
  lobbyScreen.classList.remove('hidden');
  document.body.classList.add('lobby-view');
  document.body.classList.remove('round-active');
  lobbyScreen.classList.remove('round-active');
}

function showEntryModeSelection() {
  entryModeSelect?.classList.remove('hidden');
  entryFormPanel?.classList.add('hidden');
  joinSettings?.classList.add('hidden');
  createSettings?.classList.add('hidden');
  joinBtn.classList.add('hidden');
  createBtn.classList.add('hidden');
  joinBtn.disabled = false;
  createBtn.disabled = false;
  errorEl.textContent = '';
}

function showEntryForm(mode) {
  const isJoinMode = mode === 'join';

  entryModeSelect?.classList.add('hidden');
  entryFormPanel?.classList.remove('hidden');
  joinSettings?.classList.toggle('hidden', !isJoinMode);
  createSettings?.classList.toggle('hidden', isJoinMode);
  joinBtn.classList.toggle('hidden', !isJoinMode);
  createBtn.classList.toggle('hidden', isJoinMode);
  joinBtn.disabled = false;
  createBtn.disabled = false;
  errorEl.textContent = '';

  if (!isJoinMode) {
    updateQuestionCatalogUI();
    updateQuestionModeUI();
  }
  nameInput.focus();
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
    const name = nameInput.value.trim();
    if (!name) {
      errorEl.textContent = t('entryErrorName');
      nameInput.focus();
      return;
    }

    const mode = modeUnlimitedRadio.checked ? 'unlimited' : 'fixed';
    let questionCount = null;
    errorEl.textContent = '';

    if (mode === 'fixed') {
      const parsed = Number.parseInt(questionCountInput.value, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        errorEl.textContent = t('entryErrorQuestionCount');
        return;
      }
      questionCount = Math.min(parsed, 99);
      questionCountInput.value = String(questionCount);
    }

    const useCustomCatalog = questionCatalogSelect?.value === 'custom';
    const customQuestions = useCustomCatalog ? collectCustomQuestions() : [];
    if (useCustomCatalog && customQuestions.length === 0) {
      errorEl.textContent = t('errorCustomRequired');
      return;
    }

    const response = await fetch('/lobbies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        questionCount,
        language: currentLanguage,
        customQuestions,
        useOnlyCustom: useCustomCatalog
      })
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.code) {
      const message = translateErrorCode(data?.errorCode, 'errorCreateLobby');
      errorEl.textContent = message;
      return;
    }

    codeInput.value = data.code;
    joinLobby();
  } catch (error) {
    errorEl.textContent = t('errorCreateLobby');
  }
}

function joinLobby() {
  const name = nameInput.value.trim();
  const code = codeInput.value.trim().toUpperCase();

  if (!name) {
    errorEl.textContent = t('entryErrorName');
    nameInput.focus();
    return;
  }

  if (!code || code.length !== 4) {
    errorEl.textContent = t('entryErrorCode');
    return;
  }

  joinBtn.disabled = true;
  createBtn.disabled = true;
  errorEl.textContent = '';

  const savedSession = getSavedLobbySession();
  const playerId = savedSession?.code === code
    ? savedSession.playerId
    : currentPlayerId || createPlayerId();
  currentLobbyCode = code;
  currentPlayerId = playerId;
  saveLobbySession({ code, name, playerId });

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit('joinLobby', { code, name, playerId }, response => {
    if (!response?.success) {
      clearLobbySession();
      currentLobbyCode = null;
      currentPlayerId = null;
      const message = translateErrorCode(response?.errorCode, 'errorJoinFailed');
      errorEl.textContent = message;
      joinBtn.disabled = false;
      createBtn.disabled = false;
      return;
    }

    currentPlayerId = response.playerId || null;
    if (currentPlayerId) {
      saveLobbySession({ code, name, playerId: currentPlayerId });
    }
    lobbyCodeEl.textContent = code;
    showLobby();
    answerInput.value = '';
    answerInput.disabled = false;
    readyBtn.classList.add('hidden');
    readyBtn.disabled = false;
    readySent = false;
    lastResultsShown = false;

    if (response.lobby) {
      lobbyLanguage = response.lobby?.settings?.language || currentLanguage;
      setLanguage(lobbyLanguage, { updateSelect: true });
      applyLobbyState(response.lobby);
    }
  });
}

function rejoinCurrentLobby() {
  const savedSession = getSavedLobbySession();
  const code = currentLobbyCode || codeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim() || savedSession?.name || '';

  if (!code || !name || !currentPlayerId || rejoinInFlight) {
    return;
  }

  rejoinInFlight = true;
  socket.emit('joinLobby', { code, name, playerId: currentPlayerId }, response => {
    rejoinInFlight = false;
    if (!response?.success) {
      clearLobbySession();
      currentLobbyCode = null;
      currentPlayerId = null;
      showEntry();
      errorEl.textContent = translateErrorCode(response?.errorCode, 'errorJoinFailed');
      joinBtn.disabled = false;
      createBtn.disabled = false;
      return;
    }

    currentLobbyCode = code;
    currentPlayerId = response.playerId || currentPlayerId;
    saveLobbySession({ code, name, playerId: currentPlayerId });
    lobbyCodeEl.textContent = code;
    showLobby();
    if (response.lobby) {
      lobbyLanguage = response.lobby?.settings?.language || currentLanguage;
      setLanguage(lobbyLanguage, { updateSelect: true });
      applyLobbyState(response.lobby);
    }
  });
}

function resumeLobbyConnection() {
  const savedSession = getSavedLobbySession();
  if (savedSession && (!currentLobbyCode || !currentPlayerId)) {
    currentLobbyCode = savedSession.code;
    currentPlayerId = savedSession.playerId;
    nameInput.value = savedSession.name;
    codeInput.value = savedSession.code;
  }

  if (!currentLobbyCode || !currentPlayerId) {
    return;
  }

  if (!socket.connected) {
    socket.connect();
    return;
  }

  rejoinCurrentLobby();
}

function updatePlayers(players = []) {
  latestPlayers = players.map(player => ({
    ...player,
    hasSubmitted: Boolean(player?.hasSubmitted)
  }));
  renderPlayers();
}

function getPlayerStatus(player) {
  if (!player?.connected) {
    return t('playerStatusOffline');
  }

  if (currentLobbyStatus === 'collecting') {
    return player.hasSubmitted ? t('playerStatusSubmitted') : t('playerStatusPending');
  }

  if (currentLobbyStatus === 'finished') {
    return t('playerStatusFinished');
  }

  return player.ready ? t('playerStatusReady') : t('playerStatusWaiting');
}

function renderPlayers() {
  playerListEl.innerHTML = '';

  latestPlayers.forEach(player => {
    const classes = ['player-card'];
    if (!player.connected) {
      classes.push('offline');
    } else if (player.ready && currentLobbyStatus !== 'collecting') {
      classes.push('ready');
    } else {
      classes.push('waiting');
    }
    if (player.hasSubmitted && currentLobbyStatus === 'collecting') {
      classes.push('submitted');
    }

    const div = document.createElement('div');
    div.className = classes.join(' ');

    const nameEl = document.createElement('span');
    nameEl.className = 'player-name';
    nameEl.textContent = player.name ?? '';

    const statusEl = document.createElement('span');
    statusEl.className = 'player-status';
    const statusText = getPlayerStatus(player);
    statusEl.textContent = statusText || '\u00a0';

    div.appendChild(nameEl);
    div.appendChild(statusEl);
    playerListEl.appendChild(div);
  });
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
  pendingSummary = null;
  highscoreBtn.classList.add('hidden');
  highscoreBtn.disabled = true;
  summaryVisible = false;
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
  const resultLanguage = lobbyLanguage || currentLanguage;
  questionArea.classList.add('hidden');
  resultsArea.classList.remove('hidden');
  resultsArea.innerHTML = '';
  summaryArea.classList.add('hidden');
  summaryArea.innerHTML = '';

  if (typeof correctAnswer !== 'undefined' && correctAnswer !== null) {
    const correct = document.createElement('p');
    correct.className = 'correct-answer';
    const formattedCorrect = formatNumericValue(correctAnswer, {
      integer: typeof correctAnswer === 'number' && Number.isInteger(correctAnswer),
      language: resultLanguage
    });
    const answerText = formattedCorrect ?? correctAnswer;
    correct.textContent = t('resultsCorrectAnswer', { answer: answerText });
    resultsArea.appendChild(correct);
  }

  answers.forEach(entry => {
    const div = document.createElement('div');
    div.className = `result-entry ${entry.closest ? 'closest' : ''} ${entry.farthest ? 'farthest' : ''}`;
    const label = document.createElement('span');
    const formattedAnswer = formatNumericValue(entry.answer, { language: resultLanguage });
    const answerText = formattedAnswer ?? (entry.answer ?? '–');
    label.innerHTML = `<strong>${escapeHtml(entry.name)}</strong>: ${escapeHtml(answerText)}`;
    div.appendChild(label);

    if (entry.closest) {
      const badge = document.createElement('span');
      badge.className = 'badge good';
      badge.textContent = t('badgeClosest');
      div.appendChild(badge);
    }

    if (entry.farthest) {
      const badge = document.createElement('span');
      badge.className = 'badge bad';
      badge.textContent = t('badgeFarthest');
      div.appendChild(badge);
    }

    resultsArea.appendChild(div);
  });

  readyBtn.classList.remove('hidden');
  readyBtn.disabled = false;
  readyBtn.textContent = t('readyNextRound');
  lastResultsShown = true;
}

function prepareSummary(summary) {
  if (summaryVisible) {
    if (summary) {
      renderSummary(summary);
    }
    return;
  }

  pendingSummary = summary || null;
  summaryArea.classList.add('hidden');
  summaryArea.innerHTML = '';
  summaryVisible = false;

  if (pendingSummary) {
    highscoreBtn.classList.remove('hidden');
    highscoreBtn.disabled = false;
    highscoreBtn.textContent = t('showHighscore');
  } else {
    highscoreBtn.classList.add('hidden');
    highscoreBtn.disabled = true;
  }
}

function renderSummary(summary) {
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
  pendingSummary = null;
  highscoreBtn.classList.add('hidden');
  highscoreBtn.disabled = true;
  summaryVisible = true;

  const heading = document.createElement('h3');
  heading.textContent = t('summaryHeading');
  summaryArea.appendChild(heading);

  if (typeof data.roundsPlayed === 'number') {
    const roundsInfo = document.createElement('p');
    roundsInfo.className = 'hint';
    const formattedRounds = formatNumericValue(data.roundsPlayed, { integer: true });
    const roundsText = formattedRounds ?? data.roundsPlayed;
    roundsInfo.textContent = t('summaryRounds', { count: roundsText });
    summaryArea.appendChild(roundsInfo);
  }

  if (data.reason) {
    const reasonText = document.createElement('p');
    reasonText.className = 'hint';
    if (data.reason === 'vote') {
      reasonText.textContent = t('summaryReasonVote');
    } else if (data.reason === 'no-questions') {
      reasonText.textContent = t('summaryReasonNoQuestions');
    } else {
      reasonText.textContent = t('summaryReasonLimit');
    }
    summaryArea.appendChild(reasonText);
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
      const parts = [];

      if (typeof entry.points === 'number') {
        const formattedPoints = formatNumericValue(entry.points, { integer: true });
        parts.push(t('summaryPoints', { value: formattedPoints ?? entry.points }));
      }

      if (typeof entry.averageDeviation === 'number') {
        const formatted = formatDistance(entry.averageDeviation);
        parts.push(t('summaryAverageDeviation', { value: formatted ?? entry.averageDeviation }));
      } else {
        parts.push(t('summaryAverageDeviationNone'));
      }

      details.textContent = parts.join(' | ');
      row.appendChild(details);

      list.appendChild(row);
    });

    summaryArea.appendChild(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = t('summaryEmpty');
    summaryArea.appendChild(empty);
  }
}

function applyLobbyState(state) {
  if (!state) return;

  currentLobbyStatus = state.status || 'waiting';
  const currentPlayer = Array.isArray(state.players) && currentPlayerId
    ? state.players.find(player => player.id === currentPlayerId)
    : null;
  if (currentLobbyStatus === 'waiting') {
    readySent = Boolean(currentPlayer?.ready);
  }

  if (!lobbyLanguage && state.settings?.language) {
    lobbyLanguage = state.settings.language;
    setLanguage(lobbyLanguage, { updateSelect: true });
  }

  if (Array.isArray(state.players)) {
    updatePlayers(state.players);
  } else {
    renderPlayers();
  }

  if (currentLobbyStatus === 'collecting') {
    document.body.classList.add('round-active');
    lobbyScreen.classList.add('round-active');
  } else {
    document.body.classList.remove('round-active');
    lobbyScreen.classList.remove('round-active');
  }

  const settings = state.settings || {};
  const endVote = state.endVote || null;

  if (settings.mode === 'unlimited' && currentLobbyStatus !== 'finished') {
    voteBtn.classList.remove('hidden');
    const label = endVote
      ? t('voteLabelWithCount', { count: endVote.count, required: endVote.required })
      : t('voteLabel');
    voteBtn.textContent = label;
    const hasVoted = Array.isArray(endVote?.voterIds) && currentPlayerId ? endVote.voterIds.includes(currentPlayerId) : false;
    voteBtn.disabled = hasVoted;
  } else {
    voteBtn.classList.add('hidden');
    voteBtn.disabled = false;
  }

  if (currentLobbyStatus === 'collecting' && state.currentQuestion) {
    questionText.textContent = state.currentQuestion.question;
    questionArea.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    summaryArea.classList.add('hidden');
    prepareSummary(null);
    answerSubmitted = Boolean(currentPlayer?.hasSubmitted);
    if (answerSubmitted) {
      answerInput.disabled = true;
      answerHint.textContent = t('answerSent');
    } else {
      answerInput.disabled = false;
      answerHint.textContent = '';
    }
    readyBtn.classList.add('hidden');
  } else if (currentLobbyStatus === 'waiting') {
    prepareSummary(null);
    questionArea.classList.add('hidden');
    resultsArea.classList.add('hidden');
    summaryArea.classList.add('hidden');
    if (!readySent) {
      readyBtn.classList.remove('hidden');
      readyBtn.disabled = false;
      readyBtn.textContent = t('readyStart');
    } else {
      readyBtn.classList.remove('hidden');
      readyBtn.disabled = true;
      readyBtn.textContent = t('readyConfirmed');
    }
  } else if (currentLobbyStatus === 'results' && state.lastResults && !lastResultsShown) {
    prepareSummary(null);
    displayResults(state.lastResults);
  } else if (currentLobbyStatus === 'finished') {
    questionArea.classList.add('hidden');
    readyBtn.classList.add('hidden');
    readyBtn.disabled = true;
    voteBtn.classList.add('hidden');
    voteBtn.disabled = true;
    answerInput.disabled = true;
    answerHint.textContent = '';
    prepareSummary(state.finalSummary || null);
  }

  renderPlayers();
}

joinBtn.addEventListener('click', joinLobby);
createBtn.addEventListener('click', createLobby);
selectJoinBtn?.addEventListener('click', () => {
  showEntryForm('join');
});
selectCreateBtn?.addEventListener('click', () => {
  showEntryForm('create');
});
entryBackBtn?.addEventListener('click', showEntryModeSelection);
modeFixedRadio.addEventListener('change', updateQuestionModeUI);
modeUnlimitedRadio.addEventListener('change', updateQuestionModeUI);

if (languageSelect) {
  languageSelect.addEventListener('change', () => {
    setLanguage(languageSelect.value, { updateSelect: false });
  });
}

if (questionCatalogSelect) {
  questionCatalogSelect.addEventListener('change', updateQuestionCatalogUI);
}

if (addCustomQuestionBtn) {
  addCustomQuestionBtn.addEventListener('click', () => {
    createCustomQuestionRow();
  });
}

answerInput.addEventListener('blur', () => {
  const activeLanguage = lobbyLanguage || currentLanguage;
  const normalized = normalizeNumericString(answerInput.value, activeLanguage);
  if (!normalized) {
    answerInput.value = '';
    return;
  }

  const parsed = Number(normalized);
  if (Number.isFinite(parsed)) {
    const formatted = formatNumericValue(parsed, { language: activeLanguage });
    if (formatted) {
      answerInput.value = formatted;
    }
  }
});

answerForm.addEventListener('submit', event => {
  event.preventDefault();
  if (answerSubmitted) return;
  const rawAnswer = answerInput.value;
  const activeLanguage = lobbyLanguage || currentLanguage;
  const normalized = normalizeNumericString(rawAnswer, activeLanguage);
  if (!normalized) {
    answerHint.textContent = t('answerRequired');
    return;
  }
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    answerHint.textContent = t('answerInvalid');
    return;
  }
  const formatted = formatNumericValue(numericValue, { language: activeLanguage });
  if (formatted) {
    answerInput.value = formatted;
  }
  socket.emit('submitAnswer', numericValue);
  answerSubmitted = true;
  answerInput.disabled = true;
  answerHint.textContent = t('answerSent');
});

readyBtn.addEventListener('click', () => {
  if (readySent) return;
  socket.emit('playerReady');
  readySent = true;
  readyBtn.disabled = true;
  readyBtn.textContent = t('readyConfirmed');
});

leaveBtn.addEventListener('click', () => {
  clearLobbySession();
  currentLobbyCode = null;
  currentPlayerId = null;
  if (socket.connected) {
    const reloadTimer = window.setTimeout(() => window.location.reload(), 500);
    socket.emit('leaveLobby', () => {
      window.clearTimeout(reloadTimer);
      window.location.reload();
    });
  } else {
    window.location.reload();
  }
});

voteBtn.addEventListener('click', () => {
  if (voteBtn.disabled) return;
  voteBtn.disabled = true;
  socket.emit('voteEndGame', response => {
    if (!response?.success) {
      voteBtn.disabled = false;
    }
  });
});

highscoreBtn.addEventListener('click', () => {
  if (!pendingSummary) return;
  renderSummary(pendingSummary);
});

socket.on('connect_error', () => {
  errorEl.textContent = t('connectionFailed');
  joinBtn.disabled = false;
  createBtn.disabled = false;
});

socket.on('connect', () => {
  resumeLobbyConnection();
});

window.addEventListener('pageshow', resumeLobbyConnection);
window.addEventListener('focus', resumeLobbyConnection);
window.addEventListener('online', resumeLobbyConnection);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resumeLobbyConnection();
  }
});

socket.on('lobbyUpdate', state => {
  applyLobbyState(state);
});

socket.on('playersUpdate', players => {
  updatePlayers(players || []);
});

socket.on('roundStarted', payload => {
  questionText.textContent = payload.question;
  resetRoundUI();
  currentLobbyStatus = 'collecting';
  document.body.classList.add('round-active');
  lobbyScreen.classList.add('round-active');
  renderPlayers();
});

socket.on('answerReceived', ({ playerId }) => {
  if (!playerId) return;
  latestPlayers = latestPlayers.map(player =>
    player.id === playerId ? { ...player, hasSubmitted: true } : player
  );
  renderPlayers();
});

socket.on('roundResults', payload => {
  displayResults(payload);
  currentLobbyStatus = 'results';
  document.body.classList.remove('round-active');
  lobbyScreen.classList.remove('round-active');
  renderPlayers();
});

socket.on('gameSummary', summary => {
  currentLobbyStatus = 'finished';
  prepareSummary(summary);
  document.body.classList.remove('round-active');
  lobbyScreen.classList.remove('round-active');
  renderPlayers();
});

updateQuestionCatalogUI();
setLanguage(languageSelect?.value || currentLanguage);
updateQuestionModeUI();
showEntry();

const savedLobbySession = getSavedLobbySession();
if (savedLobbySession) {
  currentLobbyCode = savedLobbySession.code;
  currentPlayerId = savedLobbySession.playerId;
  nameInput.value = savedLobbySession.name;
  codeInput.value = savedLobbySession.code;
  joinBtn.disabled = true;
  createBtn.disabled = true;
  resumeLobbyConnection();
}
