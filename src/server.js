require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const prisma = require('./lib/prisma');
const { getSecret } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

// 필수 환경변수 확인 (없으면 바로 실패시켜 배포 단계에서 알아차리게 함)
for (const key of ['DATABASE_URL', 'ADMIN_PASSWORD', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`[환경변수 누락] ${key} 를 설정하세요. (.env.example 참고)`);
    process.exit(1);
  }
}
getSecret();

const app = express();
app.set('trust proxy', 1); // Railway 프록시 뒤에서 실제 IP 인식 (rate limit용)
app.disable('x-powered-by');

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public'))); // 프론트 서빙

app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/admin', require('./routes/admin'));
app.get('/api/health', (req, res) => res.json({ data: { ok: true } }));

app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000; // Railway가 PORT를 주입
const server = app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));

// 재배포 시 깔끔하게 종료 (SQLite 연결 정리)
async function shutdown() {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
