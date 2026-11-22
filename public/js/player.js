/* 플레이어 상세 (F-04): 전적, 포지션별 승률, 최근 10경기 */
const detailEl = document.getElementById('player-detail');

async function loadDetail() {
  const id = qs('id');
  if (!id) {
    detailEl.innerHTML = emptyHtml('플레이어가 지정되지 않았습니다.', '!');
    return;
  }
  detailEl.innerHTML = LOADING_HTML;
  try {
    const p = await API.getPlayer(id);
    render(p);
  } catch (e) {
    detailEl.innerHTML = emptyHtml(e.message, '!');
  }
}

function render(p) {
  const s = p.stats;
  const tier = TIERS[p.tier] || { color: '#888', short: '?' };
  document.title = `롤 내전 · ${p.summonerName}#${p.tagLine}`;

  const posRows = s.byPosition
    .map((x) => `
      <div class="pos-stat">
        ${posBadge(x.position)}
        ${wrBar(x.wins, x.losses)}
        <span class="num" style="text-align:right">
          ${x.games ? `${x.winRate}% <span class="muted">(${x.games})</span>` : '<span class="muted">-</span>'}
        </span>
      </div>`).join('');

  const recent = s.recent.length
    ? s.recent.map((r) => `
        <a class="recent-item ${r.result === 'WIN' ? 'w' : 'l'}" href="matches.html#match-${r.matchId}" style="color:inherit">
          <span class="result-label ${r.result === 'WIN' ? 'win-label' : 'loss-label'}">${r.result === 'WIN' ? '승리' : '패배'}</span>
          <span>
            <span class="${r.team === 'BLUE' ? 'win' : 'loss'}" style="font-weight:700">${r.team === 'BLUE' ? '블루' : '레드'}</span>
            · ${esc(POS_LABEL[r.position])}
            <span class="muted hide-mobile"> · ${fmtDate(r.playedAt, false)}</span>
          </span>
          <span class="muted hide-mobile">#${r.matchId}</span>
          <span class="num">${fmtDelta(r.scoreDelta)}</span>
        </a>`).join('')
    : emptyHtml('아직 완료된 경기가 없습니다.');

  detailEl.innerHTML = `
    <section class="card">
      <div class="profile">
        <div class="profile-icon" style="color:${tier.color}"><b>${tier.short}</b></div>
        <div>
          <div class="profile-name">${esc(p.summonerName)}<span class="player-tag" style="font-size:18px">#${esc(p.tagLine)}</span></div>
          <div class="profile-meta">
            ${tierBadge(p)}
            ${posBadge(p.mainPosition)} ${posBadge(p.subPosition, true)}
            ${p.isActive ? '' : '<span class="status-badge status-inactive">비활성</span>'}
          </div>
        </div>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="stat-label">내전 점수</div><div class="stat-value gold">${playerScore(p).toLocaleString()}</div></div>
        <div class="stat"><div class="stat-label">전적</div><div class="stat-value"><span class="win">${s.wins}승</span> <span class="loss">${s.losses}패</span></div></div>
        <div class="stat"><div class="stat-label">승률</div><div class="stat-value">${s.games ? `${s.winRate}%` : '-'}</div></div>
        <div class="stat"><div class="stat-label">내전 보정</div><div class="stat-value">${fmtDelta(p.scrimScore)}</div></div>
      </div>
    </section>

    <div class="grid-2" style="margin-top:20px">
      <section class="card">
        <div class="card-title">포지션별 승률</div>
        ${posRows}
      </section>
      <section class="card">
        <div class="card-title">최근 경기 <small>최대 10경기</small></div>
        ${recent}
      </section>
    </div>`;
}

initPage('players').then(loadDetail);
