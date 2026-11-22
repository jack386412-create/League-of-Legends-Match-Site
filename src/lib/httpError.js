// 상태 코드를 가진 에러. 컨트롤러에서 throw 하면 errorHandler가 { error } 로 응답한다.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
