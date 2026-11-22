/* 팀 구성 (F-05 참가자 선택, F-06 자동 밸런싱, F-07 포지션, F-08 수동 조정, F-09 다시 섞기, F-10 확정) */
const pickListEl = document.getElementById('pick-list');
const pickSearchEl = document.getElementById('pick-search');
const pickCountEl = document.getElementById('pick-count');
const buildBtn = document.getElementById('btn-build');
const resultEl = document.getElementById('result');

const TEAM_SIZE = 5;
const TOTAL = TEAM_SIZE * 2;

let allPlayers = [];
const selected = new Set();
// teams.BLUE / teams.RED : 포지션 순서대로 [{ position, player }]
let teams = null;
let selectedSlot = null; // { team, index }
let busy = false;

/* ---------- 참가자 선택 ---------- */
async function loadPlayers() {
  pickListEl.innerHTML = LOADING_HTML;
  try {
    allPlayers = (await API.getPlayers()).filter((p) => p.isActive);
    renderPickList();
  } catch (e) {
    pickListEl.innerHTML = emptyHtml(e.message, '!');
  }
}

function renderPickList() {
  const q = pickSearchEl.value.trim().toLowerCase();
  const list = allPlayers.filter((p) => !q || `${p.summonerName}#${p.tagLine}`.toLowerCase().includes(q));
  const full = selected.size >= TOTAL;

  pickListEl.innerHTML = list.length
    ? list.map((p) => {
        const checked = selected.has(p.id);
        const disabled = full && !checked;
        return `
          <label class="pick-item ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}">
            <input type="checkbox" value="${p.id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} />
            ${tierIcon(p.tier)}
            <span class="info">
              <span class="player-name">${esc(p.summonerName)}<span class="player-tag">#${esc(p.tagLine)}</span></span>
              <small>${esc(tierLabel(p))} · ${esc(POS_LABEL[p.mainPosition])}${p.subPosition ? ` / ${esc(POS_LABEL[p.subPosition])}` : ''}</small>
            </span>
            <span class="score">${playerScore(p).toLocaleString()}</span>
          </label>`;
      }).join('')
    : emptyHtml(allPlayers.length ? '검색 결과가 없습니다.' : '활성 플레이어가 없습니다. 플레이어를 먼저 등록하세요.');

  pickCountEl.textContent = selected.size;
  pickCountEl.classList.toggle('full', selected.size === TOTAL);
  buildBtn.disabled = selected.size !== TOTAL || busy;
}

pickListEl.addEventListener('change', (e) => {
  if (e.target.type !== 'checkbox') return;
  const id = Number(e.target.value);
  if (e.target.checked) selected.add(id);
  else selected.delete(id);
  renderPickList();
});
pickSearchEl.addEventListener('input', renderPickList);
document.getElementById('btn-clear').addEventListener('click', () => {
  selected.clear();
  renderPickList();
});

/* ---------- 자동 밸런싱 ---------- */
async function build(shuffle = false) {
  if (selected.size !== TOTAL || busy) return;
  busy = true;
  buildBtn.disabled = true;
  if (!teams) resultEl.innerHTML = LOADING_HTML;
  try {
    const res = await API.balance([...selected], shuffle);
    const toSlots = (list) => list.map((p) => ({ position: p.position, player: p }));
    teams = { BLUE: toSlots(res.blue.players), RED: toSlots(res.red.players) };
    selectedSlot = null;
    renderResult();
  } catch (e) {
    toast(e.message, 'error');
    if (!teams) resultEl.innerHTML = emptyHtml(e.message, '!');
  } finally {
    busy = false;
    renderPickList();
  }
}
buildBtn.addEventListener('click', () => build(false));

/* ---------- 결과 표시 ---------- */
const teamTotal = (team) => teams[team].reduce((s, slot) => s + playerScore(slot.player), 0);

function fitMark(slot) {
  if (slot.player.mainPosition === slot.position) return '<span class="fit fit-main" title="주 포지션">●</span>';
  if (slot.player.subPosition === slot.position) return '<span class="fit fit-sub" title="부 포지션">●</span>';
  return '<span class="fit fit-off" title="주/부 포지션 아님">●</span>';
}

function teamCard(team) {
  const isBlue = team === 'BLUE';
  return `
    <div class="team-card ${team.toLowerCase()}">
      <div class="team-card-head"><span>${isBlue ? '블루팀' : '레드팀'}</span><span>${teamTotal(team).toLocaleString()}</span></div>
      ${teams[team].map((slot, i) => {
        const p = slot.player;
        const sel = selectedSlot && selectedSlot.team === team && selectedSlot.index === i;
        return `
          <div class="slot ${sel ? 'selected' : ''}" data-team="${team}" data-index="${i}">
            <span class="pos">${esc(POS_LABEL[slot.position])}${fitMark(slot)}</span>
            <span class="who">
              <span class="player-name">${esc(p.summonerName)}<span class="player-tag">#${esc(p.tagLine)}</span></span>
              <small>${esc(tierLabel(p))} · ${esc(POS_LABEL[p.mainPosition])}${p.subPosition ? `/${esc(POS_LABEL[p.subPosition])}` : ''}</small>
            </span>
            <span class="score">${playerScore(p).toLocaleString()}</span>
          </div>`;
      }).join('')}
    </div>`;
}

function renderResult() {
  const blue = teamTotal('BLUE');
  const red = teamTotal('RED');
  const diff = Math.abs(blue - red);
  const cls = diff <= 100 ? 'diff-good' : diff <= 300 ? 'diff-ok' : 'diff-bad';

  resultEl.innerHTML = `
    <div class="diff-banner">
      <span class="side blue">${blue.toLocaleString()}</span>
      <span class="diff-value"><small>점수 차이</small><strong class="${cls}">${diff.toLocaleString()}</strong></span>
      <span class="side red">${red.toLocaleString()}</span>
    </div>
    <div class="grid-2">${teamCard('BLUE')}${teamCard('RED')}</div>
    <p class="hint">
      두 플레이어를 차례로 클릭하면 자리를 바꿉니다. (다른 팀끼리 → 팀 교체, 같은 팀끼리 → 포지션 교체)<br />
      <span class="fit-main">●</span> 주 포지션 &nbsp; <span class="fit-sub">●</span> 부 포지션 &nbsp; <span class="fit-off">●</span> 그 외
    </p>
    <div class="builder-actions">
      <button class="btn" id="btn-shuffle">다시 섞기</button>
      <button class="btn btn-gold" id="btn-confirm">팀 확정</button>
    </div>`;
}

resultEl.addEventListener('click', (e) => {
  const slotEl = e.target.closest('.slot');
  if (slotEl && teams) {
    const cur = { team: slotEl.dataset.team, index: Number(slotEl.dataset.index) };
    if (!selectedSlot) {
      selectedSlot = cur;
    } else if (selectedSlot.team === cur.team && selectedSlot.index === cur.index) {
      selectedSlot = null;
    } else {
      // 두 슬롯의 플레이어 교체 (포지션 슬롯은 그대로)
      const a = teams[selectedSlot.team][selectedSlot.index];
      const b = teams[cur.team][cur.index];
      [a.player, b.player] = [b.player, a.player];
      selectedSlot = null;
    }
    renderResult();
    return;
  }
  if (e.target.id === 'btn-shuffle') build(true);
  if (e.target.id === 'btn-confirm') confirmTeams();
});

/* ---------- 팀 확정 → 경기 생성 ---------- */
async function confirmTeams() {
  if (!teams || busy) return;
  const diff = Math.abs(teamTotal('BLUE') - teamTotal('RED'));
  if (!confirm(`이 구성으로 경기를 시작할까요? (점수 차이 ${diff})`)) return;

  const players = ['BLUE', 'RED'].flatMap((team) =>
    teams[team].map((slot) => ({ playerId: slot.player.id, team, position: slot.position })));
  busy = true;
  document.getElementById('btn-confirm').disabled = true;
  try {
    const match = await API.createMatch(players);
    toast(`경기 #${match.id} 가 생성되었습니다.`, 'success');
    setTimeout(() => { location.href = `matches.html#match-${match.id}`; }, 600);
  } catch (e) {
    toast(e.message, 'error');
    busy = false;
    document.getElementById('btn-confirm').disabled = false;
  }
}

/* ---------- 시작 ---------- */
initPage('builder').then((isAdmin) => {
  if (!isAdmin) {
    document.getElementById('need-login').hidden = false;
    return;
  }
  document.getElementById('builder').hidden = false;
  loadPlayers();
});
