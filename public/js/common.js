/* =========================================================
   공통: 상수, 표시용 헬퍼, 헤더(내비게이션), 토스트, 관리자 상태
   - 상수 값은 서버의 src/constants.js 와 같게 유지할 것
   ========================================================= */

const TIERS = {
  IRON:     { label: '아이언',   short: 'I',  base: 400,  color: '#8c8c8c' },
  BRONZE:   { label: '브론즈',   short: 'B',  base: 800,  color: '#b07a52' },
  SILVER:   { label: '실버',     short: 'S',  base: 1200, color: '#a9b6c2' },
  GOLD:     { label: '골드',     short: 'G',  base: 1600, color: '#e0b34a' },
  PLATINUM: { label: '플래티넘', short: 'P',  base: 2000, color: '#45c4b0' },
  EMERALD:  { label: '에메랄드', short: 'E',  base: 2400, color: '#2ecc71' },
  DIAMOND:  { label: '다이아',   short: 'D',  base: 2800, color: '#6aa0ff' },
  MASTER:   { label: '마스터+',  short: 'M',  base: 3200, color: '#c070f5' },
};
const TIER_KEYS = Object.keys(TIERS);

const POSITIONS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const POS_LABEL = { TOP: '탑', JUNGLE: '정글', MID: '미드', ADC: '원딜', SUPPORT: '서폿' };

const DIV_LABEL = { 4: 'IV', 3: 'III', 2: 'II', 1: 'I' };

/* ---------- 점수 ---------- */
// 최종 점수 = 티어 기본 점수 + 디비전 보정 + 내전 보정 점수 (기획서 4.1)
// 서버가 score 필드를 내려주면 그 값을 우선 사용한다.
function divisionBonus(tier, division) {
  if (tier === 'MASTER') return 0;
  return (4 - Number(division || 4)) * 100;
}
function playerScore(p) {
  if (typeof p.score === 'number') return p.score;
  const t = TIERS[p.tier];
  return (t ? t.base : 0) + divisionBonus(p.tier, p.division) + (p.scrimScore || 0);
}

/* ---------- 표시용 헬퍼 ---------- */
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function tierLabel(p) {
  const t = TIERS[p.tier];
  if (!t) return p.tier || '-';
  return p.tier === 'MASTER' ? t.label : `${t.label} ${DIV_LABEL[p.division] || ''}`;
}
function tierIcon(tier) {
  const t = TIERS[tier] || { short: '?', color: '#888' };
  return `<span class="tier-icon" style="color:${t.color}"><b>${t.short}</b></span>`;
}
function tierBadge(p) {
  const t = TIERS[p.tier] || { color: '#888' };
  return `<span class="tier-badge" style="color:${t.color}">${tierIcon(p.tier)}<span>${esc(tierLabel(p))}</span></span>`;
}
function posBadge(pos, sub = false) {
  if (!pos) return '';
  return `<span class="pos-badge${sub ? ' sub' : ''}">${esc(POS_LABEL[pos] || pos)}</span>`;
}
function playerNameHtml(p, link = true) {
  const inner = `<span class="player-name">${esc(p.summonerName)}</span><span class="player-tag">#${esc(p.tagLine)}</span>`;
  const id = p.id ?? p.playerId;
  return link && id != null ? `<a href="player.html?id=${encodeURIComponent(id)}">${inner}</a>` : inner;
}
function winRate(wins, losses) {
  const g = wins + losses;
  return g === 0 ? 0 : Math.round((wins / g) * 1000) / 10;
}
function wrBar(wins, losses) {
  const g = wins + losses;
  const pct = g === 0 ? 50 : (wins / g) * 100;
  const bg = g === 0 ? 'style="background:var(--border)"' : '';
  return `<div class="wr-bar" ${bg}><span style="width:${g === 0 ? 0 : pct}%"></span></div>`;
}
function fmtDate(iso, withTime = true) {
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}
function fmtDelta(n) {
  if (!n) return '<span class="muted">±0</span>';
  return n > 0 ? `<span class="win">+${n}</span>` : `<span class="loss">${n}</span>`;
}
function qs(name) {
  return new URLSearchParams(location.search).get(name);
}
function emptyHtml(msg, icon = '◇') {
  return `<div class="empty"><div class="big">${icon}</div>${esc(msg)}</div>`;
}
const LOADING_HTML = '<div class="loading">불러오는 중...</div>';

/* ---------- 토스트 ---------- */
function toast(message, type = 'info') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

/* ---------- 헤더 & 관리자 상태 ---------- */
const NAV_ITEMS = [
  { href: 'index.html', key: 'ranking', label: '랭킹' },
  { href: 'players.html', key: 'players', label: '플레이어' },
  { href: 'team-builder.html', key: 'builder', label: '팀 구성' },
  { href: 'matches.html', key: 'matches', label: '경기 기록' },
  { href: 'admin.html', key: 'admin', label: '관리자' },
];

let IS_ADMIN = false;

function renderHeader(activeKey) {
  const header = document.getElementById('site-header');
  if (!header) return;
  header.className = 'site-header';
  header.innerHTML = `
    <div class="container">
      <a class="logo" href="index.html"><span class="logo-mark"><span>내</span></span>롤 내전</a>
      <nav class="nav" id="nav">
        ${NAV_ITEMS.map((n) => `<a href="${n.href}" class="${n.key === activeKey ? 'active' : ''}">${n.label}</a>`).join('')}
      </nav>
      <div class="nav-right">
        <span class="admin-pill admin-only">관리자</span>
        <button class="nav-toggle" id="nav-toggle" aria-label="메뉴">☰</button>
      </div>
    </div>`;
  document.getElementById('nav-toggle').addEventListener('click', () => {
    document.getElementById('nav').classList.toggle('open');
  });
}

function setAdmin(value) {
  IS_ADMIN = !!value;
  document.body.classList.toggle('is-admin', IS_ADMIN);
}

/** 모든 페이지 진입 시 호출: 헤더 렌더 + 관리자 여부 확인 */
async function initPage(activeKey) {
  renderHeader(activeKey);
  try {
    const me = await API.me();
    setAdmin(me && me.isAdmin);
  } catch {
    setAdmin(false);
  }
  return IS_ADMIN;
}

/* ---------- 모달 ---------- */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-backdrop')) e.target.classList.remove('open');
  const closer = e.target.closest && e.target.closest('[data-close-modal]');
  if (closer) closeModal(closer.dataset.closeModal);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.open').forEach((m) => m.classList.remove('open'));
});
