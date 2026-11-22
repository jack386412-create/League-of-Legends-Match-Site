// 관리자 로그인 / 로그아웃 (F-18)
const crypto = require('crypto');
const HttpError = require('../lib/httpError');
const { issueToken, clearToken, isAdminRequest } = require('../middlewares/auth');

// 길이가 달라도 시간 차이로 비밀번호가 새지 않도록 해시 후 비교
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// POST /api/auth/login  body: { password }
async function login(req, res) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new HttpError(500, 'ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.');

  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) throw new HttpError(400, '비밀번호를 입력하세요.');
  if (!safeEqual(password, expected)) throw new HttpError(401, '비밀번호가 올바르지 않습니다.');

  issueToken(res);
  res.json({ data: { isAdmin: true } });
}

// POST /api/auth/logout
async function logout(req, res) {
  clearToken(res);
  res.json({ data: { isAdmin: false } });
}

// GET /api/auth/me — httpOnly 쿠키는 JS에서 읽을 수 없으므로 서버가 관리자 여부를 알려준다
async function me(req, res) {
  res.json({ data: { isAdmin: isAdminRequest(req) } });
}

module.exports = { login, logout, me };
