// 공통 에러 처리: 모든 실패 응답을 { error: "메시지" } + 상태 코드로 통일 (기획서 6장)
const HttpError = require('../lib/httpError');

function notFound(req, res, next) {
  next(new HttpError(404, '존재하지 않는 API입니다.'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = '서버 오류가 발생했습니다.';

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = '요청 본문이 올바른 JSON이 아닙니다.';
  } else if (err.code === 'P2002') {
    status = 409; // Prisma 유니크 제약 위반
    message = '이미 존재하는 데이터입니다.';
  } else if (err.code === 'P2025') {
    status = 404; // Prisma 레코드 없음
    message = '데이터를 찾을 수 없습니다.';
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
