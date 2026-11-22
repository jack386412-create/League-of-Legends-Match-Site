// 관리자 도구: SQLite DB 백업 다운로드
const fs = require('fs');
const os = require('os');
const path = require('path');
const prisma = require('../lib/prisma');

// GET /api/admin/backup
// 사용 중인 DB 파일을 그대로 복사하면 쓰기 도중일 때 깨질 수 있으므로,
// SQLite의 VACUUM INTO 로 일관된 스냅샷을 임시 파일로 만든 뒤 내려준다.
async function backup(req, res, next) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const tmpFile = path.join(os.tmpdir(), `scrim-backup-${stamp}-${process.pid}.db`);
  // 경로는 서버가 만든 값이지만, 작은따옴표는 SQL 문자열 규칙대로 이스케이프
  await prisma.$executeRawUnsafe(`VACUUM INTO '${tmpFile.replace(/'/g, "''")}'`);

  res.download(tmpFile, `scrim-${stamp}.db`, (err) => {
    fs.unlink(tmpFile, () => {});
    if (err && !res.headersSent) next(err);
  });
}

module.exports = { backup };
