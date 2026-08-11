/* ===========================
   STATE
=========================== */
const state = {
  scoreA: 0,
  scoreB: 0,
  nameA: 'Đội A',
  nameB: 'Đội B',
  step: 1,
  running: false,
  paused: false,
  ended: false,
  timerSeconds: 0,
  timerInterval: null,
  log: [],
};

/* ===========================
   DOM REFS
=========================== */
const $ = (id) => document.getElementById(id);

const els = {
  scoreA:       () => $('scoreA'),
  scoreB:       () => $('scoreB'),
  nameA:        () => $('nameA'),
  nameB:        () => $('nameB'),
  badgeA:       () => $('badgeA'),
  badgeB:       () => $('badgeB'),
  labelA:       () => $('labelA'),
  labelB:       () => $('labelB'),
  historyA:     () => $('historyA'),
  historyB:     () => $('historyB'),
  timerDisplay: () => $('timerDisplay'),
  matchStatus:  () => $('matchStatus'),
  inputNameA:   () => $('inputNameA'),
  inputNameB:   () => $('inputNameB'),
  pointStep:    () => $('pointStep'),
  btnStart:     () => $('btnStart'),
  btnPause:     () => $('btnPause'),
  eventLog:     () => $('eventLog'),
  resultModal:  () => $('resultModal'),
  modalTitle:   () => $('modalTitle'),
  modalResult:  () => $('modalResult'),
  modalNameA:   () => $('modalNameA'),
  modalNameB:   () => $('modalNameB'),
  modalScoreA:  () => $('modalScoreA'),
  modalScoreB:  () => $('modalScoreB'),
  modalIcon:    () => $('modalIcon'),
  cardA:        () => document.querySelector('.card-a'),
  cardB:        () => document.querySelector('.card-b'),
};

/* ===========================
   TIMER
=========================== */
function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    if (state.running && !state.paused) {
      state.timerSeconds++;
      els.timerDisplay().textContent = formatTime(state.timerSeconds);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

/* ===========================
   SETUP HELPERS
=========================== */
function readSetup() {
  const rawA = els.inputNameA().value.trim();
  const rawB = els.inputNameB().value.trim();

  state.nameA = rawA || 'Bên A';
  state.nameB = rawB || 'Bên B';
  state.step = Math.max(1, parseInt(els.pointStep().value, 10) || 1);
}

function applyNames() {
  els.nameA().textContent  = state.nameA;
  els.nameB().textContent  = state.nameB;
  els.labelA().textContent = state.nameA;
  els.labelB().textContent = state.nameB;
}

function lockSetup(locked) {
  els.inputNameA().disabled = locked;
  els.inputNameB().disabled = locked;
  els.pointStep().disabled  = locked;
}

/* ===========================
   SCORE DISPLAY
=========================== */
function updateScoreDisplay() {
  els.scoreA().textContent = state.scoreA;
  els.scoreB().textContent = state.scoreB;
  els.badgeA().textContent = state.scoreA;
  els.badgeB().textContent = state.scoreB;

  // Leading highlight
  const cardA = els.cardA();
  const cardB = els.cardB();
  cardA.classList.remove('leading');
  cardB.classList.remove('leading');

  if (state.scoreA > state.scoreB) cardA.classList.add('leading');
  else if (state.scoreB > state.scoreA) cardB.classList.add('leading');

  // History
  updateScoreHistory();
}

function updateScoreHistory() {
  // state.log is newest-first (unshift), so reverse to get chronological order
  const logsA = state.log.filter(l => l.side === 'A' && l.type === 'score').reverse();
  const logsB = state.log.filter(l => l.side === 'B' && l.type === 'score').reverse();

  const summarize = (logs) => {
    if (!logs.length) return '—';
    // Show last 5 changes in chronological order
    const recent = logs.slice(-5);
    return recent.map(l => (l.delta > 0 ? `+${l.delta}` : `${l.delta}`)).join('  ');
  };

  els.historyA().textContent = summarize(logsA);
  els.historyB().textContent = summarize(logsB);
}

/* ===========================
   BUMP ANIMATION
=========================== */
function bump(el) {
  el.classList.remove('bump');
  void el.offsetWidth; // reflow to restart animation
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 200);
}

/* ===========================
   EVENT LOG
=========================== */
function addLog(side, text, type = 'score', delta = 0) {
  const entry = {
    side,
    text,
    type,
    delta,
    time: formatTime(state.timerSeconds),
  };
  state.log.unshift(entry);

  const logEl = els.eventLog();

  // Remove empty placeholder
  const empty = logEl.querySelector('.log-empty');
  if (empty) empty.remove();

  const dotClass = side === 'A' ? 'log-dot-a' : side === 'B' ? 'log-dot-b' : 'log-dot-sys';
  const itemClass = side === 'A' ? 'log-a' : side === 'B' ? 'log-b' : 'log-system';
  const dot = side === 'A' ? '●' : side === 'B' ? '●' : '◆';

  const li = document.createElement('li');
  li.className = `log-item ${itemClass}`;
  li.innerHTML = `
    <span class="log-time">${entry.time}</span>
    <span class="${dotClass}">${dot}</span>
    <span class="log-text">${text}</span>
  `;

  logEl.prepend(li);

  // Keep max 50 items
  while (logEl.children.length > 50) {
    logEl.removeChild(logEl.lastChild);
  }
}

function clearLog() {
  state.log = [];
  const logEl = els.eventLog();
  logEl.innerHTML = '<li class="log-empty">Chưa có sự kiện nào.</li>';
  els.historyA().textContent = '';
  els.historyB().textContent = '';
}

/* ===========================
   MATCH CONTROLS
=========================== */
function startMatch() {
  readSetup();
  applyNames();
  lockSetup(true);

  state.running = true;
  state.paused  = false;
  state.ended   = false;

  setStatus('Đang thi đấu', 'running');

  els.btnStart().disabled = true;
  els.btnPause().disabled = false;

  startTimer();
  setScoreBtnsEnabled(true);
  addLog('sys', `⚡ Trận đấu bắt đầu — ${state.nameA} vs ${state.nameB}`, 'system');
}

function pauseMatch() {
  if (!state.running || state.ended) return;

  state.paused = !state.paused;

  if (state.paused) {
    setStatus('Tạm dừng', 'paused');
    els.btnPause().textContent = '▶ Tiếp tục';
    setScoreBtnsEnabled(false);
    addLog('sys', '⏸ Trận đấu tạm dừng', 'system');
  } else {
    setStatus('Đang thi đấu', 'running');
    els.btnPause().textContent = '⏸ Tạm dừng';
    setScoreBtnsEnabled(true);
    addLog('sys', '▶ Trận đấu tiếp tục', 'system');
  }
}

function resetMatch() {
  stopTimer();
  closeModal();

  state.scoreA       = 0;
  state.scoreB       = 0;
  state.running      = false;
  state.paused       = false;
  state.ended        = false;
  state.timerSeconds = 0;
  state.log          = [];

  // Reset UI
  els.timerDisplay().textContent = '00:00';
  setStatus('Chưa bắt đầu', '');

  els.btnStart().disabled = false;
  els.btnPause().disabled = true;
  els.btnPause().textContent = '⏸ Tạm dừng';

  els.inputNameA().value = '';
  els.inputNameB().value = '';

  lockSetup(false);
  setScoreBtnsEnabled(false);

  state.nameA = 'Đội A';
  state.nameB = 'Đội B';
  applyNames();
  updateScoreDisplay();
  clearLog();

  els.cardA().classList.remove('leading');
  els.cardB().classList.remove('leading');
}

function endMatch() {
  if (!state.running) {
    alert('Vui lòng bắt đầu trận đấu trước!');
    return;
  }

  state.running = false;
  state.ended   = true;
  stopTimer();
  setStatus('Kết thúc', 'ended');
  els.btnPause().disabled = true;
  setScoreBtnsEnabled(false);

  addLog('sys', `🏁 Trận đấu kết thúc — ${formatTime(state.timerSeconds)}`, 'system');
  showResult();
}

/* ===========================
   CHANGE SCORE
=========================== */
function changeScore(side, direction) {
  if (!state.running || state.paused || state.ended) return;

  const delta = direction * state.step;

  if (side === 'A') {
    state.scoreA = Math.max(0, state.scoreA + delta);
    bump(els.scoreA());
    bump(els.badgeA());
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    addLog('A', `${state.nameA}  ${sign} điểm  →  ${state.scoreA}`, 'score', delta);
  } else {
    state.scoreB = Math.max(0, state.scoreB + delta);
    bump(els.scoreB());
    bump(els.badgeB());
    const sign = delta > 0 ? `+${delta}` : `${delta}`;
    addLog('B', `${state.nameB}  ${sign} điểm  →  ${state.scoreB}`, 'score', delta);
  }

  updateScoreDisplay();
}

/* ===========================
   STATUS
=========================== */
function setStatus(text, cls) {
  const el = els.matchStatus();
  el.textContent = text;
  el.className = 'match-status';
  if (cls) el.classList.add(cls);
}

/* ===========================
   RESULT MODAL
=========================== */
function showResult() {
  const { scoreA, scoreB, nameA, nameB } = state;

  let icon   = '🏆';
  let result = '';

  if (scoreA > scoreB) {
    result = `🥇 ${nameA} chiến thắng!`;
    icon   = '🏆';
  } else if (scoreB > scoreA) {
    result = `🥇 ${nameB} chiến thắng!`;
    icon   = '🏆';
  } else {
    result = '🤝 Hòa nhau!';
    icon   = '🤝';
  }

  els.modalIcon().textContent   = icon;
  els.modalTitle().textContent  = 'Kết thúc trận đấu!';
  els.modalResult().textContent = result;
  els.modalNameA().textContent  = nameA;
  els.modalNameB().textContent  = nameB;
  els.modalScoreA().textContent = scoreA;
  els.modalScoreB().textContent = scoreB;

  els.resultModal().hidden = false;
}

function closeModal() {
  els.resultModal().hidden = true;
}

/* ===========================
   KEYBOARD SHORTCUTS
=========================== */
document.addEventListener('keydown', (e) => {
  // Ignore when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

  switch (e.key) {
    case 'q': case 'Q': changeScore('A', +1); break;
    case 'a': case 'A': changeScore('A', -1); break;
    case 'p': case 'P': changeScore('B', +1); break;
    case 'l': case 'L': changeScore('B', -1); break;
    case ' ':
      e.preventDefault();
      if (!state.running && !state.ended) startMatch();
      else if (state.running) pauseMatch();
      break;
    case 'Escape':
      closeModal();
      break;
  }
});

/* ===========================
   SCORE BUTTONS ENABLE/DISABLE
=========================== */
function setScoreBtnsEnabled(enabled) {
  document.querySelectorAll('.score-btn').forEach(btn => {
    btn.disabled = !enabled;
  });
}

/* ===========================
   INIT
=========================== */
updateScoreDisplay();
setStatus('Chưa bắt đầu', '');
setScoreBtnsEnabled(false); // disabled until match starts
