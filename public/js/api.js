/* =========================================================
   REST API 클라이언트 (기획서 6장 API 명세)
   응답 형식: 성공 { data: ... } / 실패 { error: "메시지" } + HTTP 상태 코드
   프론트와 API가 같은 Express 서버에서 서빙되므로 상대 경로로 호출한다.
   ========================================================= */
function toQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin', // httpOnly JWT 쿠키 전송
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('서버에 연결할 수 없습니다.');
  }
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(payload.error || `요청에 실패했습니다 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return payload.data;
}

const API = {
  // 플레이어
  getPlayers: (params) => request('GET', `/api/players${toQuery(params)}`),
  getPlayer: (id) => request('GET', `/api/players/${encodeURIComponent(id)}`),
  createPlayer: (data) => request('POST', '/api/players', data),
  updatePlayer: (id, data) => request('PATCH', `/api/players/${id}`, data),
  deletePlayer: (id) => request('DELETE', `/api/players/${id}`),

  // 팀 구성
  balance: (playerIds, shuffle = false) => request('POST', '/api/teams/balance', { playerIds, shuffle }),

  // 경기
  getMatches: (page = 1) => request('GET', `/api/matches${toQuery({ page })}`),
  getMatch: (id) => request('GET', `/api/matches/${encodeURIComponent(id)}`),
  createMatch: (players, memo) => request('POST', '/api/matches', { players, memo }),
  setResult: (id, winnerTeam) => request('PATCH', `/api/matches/${id}/result`, { winnerTeam }),
  deleteMatch: (id) => request('DELETE', `/api/matches/${id}`),

  // 랭킹
  getRanking: (sort = 'score') => request('GET', `/api/ranking${toQuery({ sort })}`),

  // 인증
  login: (password) => request('POST', '/api/auth/login', { password }),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'), // httpOnly 쿠키는 JS로 못 읽으므로 서버에 확인

  backupUrl: '/api/admin/backup',
};
