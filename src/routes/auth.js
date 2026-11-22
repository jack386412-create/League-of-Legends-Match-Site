const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/auth');

const router = Router();

// 비밀번호 무차별 대입 방지: 15분에 10회까지
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도하세요.' },
});

router.post('/login', loginLimiter, c.login);
router.post('/logout', c.logout);
router.get('/me', c.me);

module.exports = router;
