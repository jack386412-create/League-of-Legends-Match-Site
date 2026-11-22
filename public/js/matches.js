/* 경기 기록 (F-11 결과 입력, F-12 경기 목록, F-14 경기 삭제) */
const listEl = document.getElementById('match-list');
const pagerEl = document.getElementById('pagination');
let currentPage = 1;

async function loadMatches(page = 1) {
  currentPage = page;
  listEl.innerHTML = LOADING_HTML;
  try {
    const res = await API.getMatches(page);
    document.getElementById('match-count').textContent = `총 ${res.total}경기`;
    render(res.items);
    renderPager(res.page, res.totalPages);
    scrollToHash();
  } catch (e) {
    listEl.innerHTML = emptyHtml(e.message, '!');
  }
}

function teamCol(match, team) {
  const list = match.players.filter((p) => p.team === team);
  const isWinner = match.winnerTeam === team;
  const finished = match.status === 'FINISHED';
  const label = team === 'BLUE' ? '블루팀' : '레드팀';
  const result = finished ? (isWinner ? ' · 승리' : ' · 패배') : '';
  return `
    <div class="match-team ${team.toLowerCase()} ${isWinner ? 'winner' : ''}">
      <div class="match-team-head">${label}${result}</div>
      <ul>
        ${list.map((p) => `
          <li>
            <span class="pos">${esc(POS_LABEL[p.position])}</span>
            ${playerNameHtml(p)}
            ${finished ? `<span style="font-size:12px">${fmtDelta(p.scoreDelta)}</span>` : ''}
          </li>`).join('')}
      </ul>
    </div>`;
}

function render(items) {
  if (!items.length) {
    listEl.innerHTML = `<div class="card">${emptyHtml('아직 기록된 경기가 없습니다.')}</div>`;
    return;
  }
  listEl.innerHTML = items.map((m) => {
    const inProgress = m.status === 'IN_PROGRESS';
    return `
      <article class="match-card ${inProgress ? 'in-progress' : ''}" id="match-${m.id}">
        <div class="match-head">
          <div class="meta">
            <b>#${m.id}</b>
            <span class="muted">${fmtDate(m.playedAt)}</span>
            ${m.memo ? `<span class="muted">· ${esc(m.memo)}</span>` : ''}
          </div>
          <span class="status-badge ${inProgress ? 'status-progress' : 'status-finished'}">${inProgress ? '진행중' : '완료'}</span>
        </div>
        <div class="match-body">
          ${teamCol(m, 'BLUE')}
          <div class="match-vs">VS</div>
          ${teamCol(m, 'RED')}
        </div>
        <div class="match-actions admin-only">
          ${inProgress ? `
            <button class="btn btn-sm btn-blue" data-action="win" data-team="BLUE" data-id="${m.id}">블루 승리</button>
            <button class="btn btn-sm btn-red" data-action="win" data-team="RED" data-id="${m.id}">레드 승리</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-action="delete" data-id="${m.id}">경기 삭제</button>
        </div>
      </article>`;
  }).join('');
}

function renderPager(page, totalPages) {
  if (totalPages <= 1) { pagerEl.innerHTML = ''; return; }
  let html = `<button class="btn btn-sm" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button class="btn btn-sm ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="btn btn-sm" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>›</button>`;
  pagerEl.innerHTML = html;
}

function scrollToHash() {
  if (!location.hash) return;
  const el = document.querySelector(location.hash);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

pagerEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-page]');
  if (btn && !btn.disabled) {
    loadMatches(Number(btn.dataset.page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.dataset.action === 'win') {
    const teamName = btn.dataset.team === 'BLUE' ? '블루팀' : '레드팀';
    if (!confirm(`경기 #${id} 의 승리팀을 ${teamName}으로 기록할까요?`)) return;
    btn.disabled = true;
    try {
      await API.setResult(id, btn.dataset.team);
      toast(`경기 #${id} 결과가 기록되었습니다.`, 'success');
      loadMatches(currentPage);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
    }
  }

  if (btn.dataset.action === 'delete') {
    if (!confirm(`경기 #${id} 를 삭제할까요?\n이 경기로 바뀐 점수도 함께 되돌려집니다.`)) return;
    try {
      await API.deleteMatch(id);
      toast(`경기 #${id} 를 삭제했습니다.`, 'success');
      loadMatches(currentPage);
    } catch (err) {
      toast(err.message, 'error');
    }
  }
});

initPage('matches').then(() => loadMatches(1));
