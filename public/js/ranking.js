/* 메인 / 랭킹 화면 (F-15, F-16) */
const rankingEl = document.getElementById('ranking');
const recentEl = document.getElementById('recent-matches');

async function loadRanking(sort) {
  rankingEl.innerHTML = LOADING_HTML;
  try {
    const rows = await API.getRanking(sort);
    if (!rows.length) {
      rankingEl.innerHTML = emptyHtml('아직 랭킹에 오른 플레이어가 없습니다. 경기를 3판 이상 진행해 보세요.');
      return;
    }
    rankingEl.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>순위</th><th>플레이어</th><th class="hide-mobile">티어</th>
            <th class="num">점수</th><th class="num">승/패</th><th>승률</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="clickable rank-${r.rank}" data-id="${r.id}">
              <td class="rank-cell"><span class="rank-medal">${r.rank}</span></td>
              <td>${playerNameHtml(r)}</td>
              <td class="hide-mobile">${tierBadge(r)}</td>
              <td class="num gold"><b>${playerScore(r).toLocaleString()}</b></td>
              <td class="num"><span class="win">${r.wins}</span> / <span class="loss">${r.losses}</span></td>
              <td><div class="wr-cell">${wrBar(r.wins, r.losses)}<span>${r.winRate}%</span></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    rankingEl.innerHTML = emptyHtml(e.message, '!');
  }
}

function miniTeam(match, team) {
  const list = match.players.filter((p) => p.team === team);
  const isWinner = match.winnerTeam === team;
  return `
    <div class="mini-team ${team.toLowerCase()} ${isWinner ? 'winner' : ''}">
      <strong>${team === 'BLUE' ? '블루' : '레드'}${isWinner ? ' · 승리' : ''}</strong>
      ${list.map((p) => `<div>${esc(p.summonerName)}</div>`).join('')}
    </div>`;
}

async function loadRecent() {
  recentEl.innerHTML = LOADING_HTML;
  try {
    const { items } = await API.getMatches(1);
    const recent = items.slice(0, 3);
    if (!recent.length) {
      recentEl.innerHTML = emptyHtml('아직 경기가 없습니다.');
      return;
    }
    recentEl.innerHTML = recent.map((m) => `
      <div class="mini-match">
        <div class="mini-match-head">
          <span>#${m.id} · ${fmtDate(m.playedAt)}</span>
          <span class="status-badge ${m.status === 'IN_PROGRESS' ? 'status-progress' : 'status-finished'}">
            ${m.status === 'IN_PROGRESS' ? '진행중' : '완료'}
          </span>
        </div>
        <div class="mini-teams">${miniTeam(m, 'BLUE')}${miniTeam(m, 'RED')}</div>
      </div>`).join('');
  } catch (e) {
    recentEl.innerHTML = emptyHtml(e.message, '!');
  }
}

document.getElementById('sort-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-sort]');
  if (!btn) return;
  document.querySelectorAll('#sort-tabs button').forEach((b) => b.classList.toggle('active', b === btn));
  loadRanking(btn.dataset.sort);
});

rankingEl.addEventListener('click', (e) => {
  if (e.target.closest('a')) return;
  const tr = e.target.closest('tr[data-id]');
  if (tr) location.href = `player.html?id=${tr.dataset.id}`;
});

initPage('ranking').then(() => {
  loadRanking('score');
  loadRecent();
});
