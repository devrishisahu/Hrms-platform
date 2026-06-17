class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
  static badRequest(msg) { return new ApiError(400, msg); }
  static unauthorized(msg = 'Not authorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden: insufficient permissions') { return new ApiError(403, msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}
module.exports = ApiError;
