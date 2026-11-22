// 관리자 인증 (F-18, F-19): JWT를 httpOnly 쿠키로 주고받는다
const jwt = require('jsonwebtoken');
const HttpError = require('../lib/httpError');

const COOKIE_NAME = 'scrim_token';
const TOKEN_TTL_SEC = 60 * 60 * 24 * 7; // 7일

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  return secret;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // Railway는 HTTPS
    path: '/',
  };
}

function issueToken(res) {
  const token = jwt.sign({ role: 'admin' }, getSecret(), { expiresIn: TOKEN_TTL_SEC });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: TOKEN_TTL_SEC * 1000 });
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

/** 쿠키의 토큰이 유효한 관리자 토큰인지 */
function isAdminRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return false;
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/** 관리자 전용 API 앞에 붙이는 미들웨어 */
function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) return next(new HttpError(401, '관리자 로그인이 필요합니다.'));
  next();
}

module.exports = { requireAdmin, isAdminRequest, issueToken, clearToken, getSecret };
