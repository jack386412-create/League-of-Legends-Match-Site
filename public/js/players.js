/* 플레이어 목록 / 등록·수정·삭제 (F-01 ~ F-03) */
const tableEl = document.getElementById('player-table');
const searchEl = document.getElementById('search');
const tierEl = document.getElementById('filter-tier');
const posEl = document.getElementById('filter-pos');
const inactiveEl = document.getElementById('show-inactive');
const form = document.getElementById('player-form');
const f = {
  name: document.getElementById('f-name'),
  tag: document.getElementById('f-tag'),
  tier: document.getElementById('f-tier'),
  div: document.getElementById('f-div'),
  main: document.getElementById('f-main'),
  sub: document.getElementById('f-sub'),
  active: document.getElementById('f-active'),
  score: document.getElementById('f-score'),
  submit: document.getElementById('f-submit'),
};

let players = [];
let editingId = null;

/* ---------- 필터 / 폼 select 채우기 ---------- */
const tierOptions = TIER_KEYS.map((k) => `<option value="${k}">${TIERS[k].label}</option>`).join('');
const posOptions = POSITIONS.map((p) => `<option value="${p}">${POS_LABEL[p]}</option>`).join('');
tierEl.insertAdjacentHTML('beforeend', tierOptions);
posEl.insertAdjacentHTML('beforeend', posOptions);
f.tier.innerHTML = tierOptions;
f.main.innerHTML = posOptions;
f.sub.insertAdjacentHTML('beforeend', posOptions);

/* ---------- 목록 ---------- */
async function loadPlayers() {
  tableEl.innerHTML = LOADING_HTML;
  try {
    players = await API.getPlayers({ search: searchEl.value.trim(), tier: tierEl.value, position: posEl.value });
    render();
  } catch (e) {
    tableEl.innerHTML = emptyHtml(e.message, '!');
  }
}

function render() {
  const list = inactiveEl.checked ? players : players.filter((p) => p.isActive);
  const activeCount = players.filter((p) => p.isActive).length;
  document.getElementById('player-count').textContent = `검색 결과 ${list.length}명 · 활성 ${activeCount}명`;

  if (!list.length) {
    tableEl.innerHTML = emptyHtml('조건에 맞는 플레이어가 없습니다.');
    return;
  }
  tableEl.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>플레이어</th><th>티어</th><th>포지션</th><th class="num">점수</th>
          <th class="num hide-mobile">내전 보정</th><th class="admin-only"></th>
        </tr>
      </thead>
      <tbody>
        ${list.map((p) => `
          <tr class="clickable ${p.isActive ? '' : 'inactive'}" data-id="${p.id}">
            <td>${playerNameHtml(p)} ${p.isActive ? '' : '<span class="status-badge status-inactive">비활성</span>'}</td>
            <td>${tierBadge(p)}</td>
            <td>${posBadge(p.mainPosition)} ${posBadge(p.subPosition, true)}</td>
            <td class="num gold"><b>${playerScore(p).toLocaleString()}</b></td>
            <td class="num hide-mobile">${fmtDelta(p.scrimScore)}</td>
            <td class="admin-only num">
              <button class="btn btn-sm" data-action="edit" data-id="${p.id}">수정</button>
              <button class="btn btn-sm btn-red" data-action="delete" data-id="${p.id}">삭제</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

let searchTimer;
searchEl.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadPlayers, 250);
});
tierEl.addEventListener('change', loadPlayers);
posEl.addEventListener('change', loadPlayers);
inactiveEl.addEventListener('change', render);

tableEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (btn) {
    const p = players.find((x) => x.id === Number(btn.dataset.id));
    if (btn.dataset.action === 'edit') openForm(p);
    if (btn.dataset.action === 'delete') removePlayer(p);
    return;
  }
  if (e.target.closest('a')) return;
  const tr = e.target.closest('tr[data-id]');
  if (tr) location.href = `player.html?id=${tr.dataset.id}`;
});

/* ---------- 등록 / 수정 ---------- */
function updateScorePreview() {
  const isMaster = f.tier.value === 'MASTER';
  f.div.disabled = isMaster;
  if (isMaster) f.div.value = '1';
  const current = editingId ? players.find((x) => x.id === editingId) : null;
  const s = playerScore({ tier: f.tier.value, division: Number(f.div.value), scrimScore: current ? current.scrimScore : 0 });
  f.score.textContent = s.toLocaleString();
}
f.tier.addEventListener('change', updateScorePreview);
f.div.addEventListener('change', updateScorePreview);

function openForm(p = null) {
  editingId = p ? p.id : null;
  document.getElementById('modal-title').textContent = p ? '플레이어 수정' : '플레이어 등록';
  f.submit.textContent = p ? '저장' : '등록';
  f.name.value = p ? p.summonerName : '';
  f.tag.value = p ? p.tagLine : 'KR1';
  f.tier.value = p ? p.tier : 'GOLD';
  f.div.value = String(p ? p.division : 4);
  f.main.value = p ? p.mainPosition : 'MID';
  f.sub.value = p && p.subPosition ? p.subPosition : '';
  document.getElementById('active-row').hidden = !p;
  f.active.checked = p ? p.isActive : true;
  updateScorePreview();
  openModal('player-modal');
  f.name.focus();
}
document.getElementById('btn-add').addEventListener('click', () => openForm());

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    summonerName: f.name.value.trim(),
    tagLine: f.tag.value.trim().replace(/^#/, ''),
    tier: f.tier.value,
    division: Number(f.div.value),
    mainPosition: f.main.value,
    subPosition: f.sub.value || null,
  };
  if (!body.summonerName || !body.tagLine) return toast('소환사명과 태그를 입력하세요.', 'error');
  if (body.subPosition === body.mainPosition) return toast('부 포지션은 주 포지션과 달라야 합니다.', 'error');
  if (editingId) body.isActive = f.active.checked;

  f.submit.disabled = true;
  try {
    if (editingId) {
      await API.updatePlayer(editingId, body);
      toast('플레이어 정보를 수정했습니다.', 'success');
    } else {
      await API.createPlayer(body);
      toast(`${body.summonerName}#${body.tagLine} 등록 완료`, 'success');
    }
    closeModal('player-modal');
    loadPlayers();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    f.submit.disabled = false;
  }
});

async function removePlayer(p) {
  if (!confirm(`${p.summonerName}#${p.tagLine} 을(를) 삭제할까요?\n경기 기록이 있으면 비활성화됩니다.`)) return;
  try {
    const res = await API.deletePlayer(p.id);
    toast(res && res.deactivated ? '경기 기록이 있어 비활성화 처리했습니다.' : '삭제했습니다.', 'success');
    loadPlayers();
  } catch (err) {
    toast(err.message, 'error');
  }
}

initPage('players').then(loadPlayers);
