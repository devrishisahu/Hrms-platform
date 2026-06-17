// Central error handler — consistent { success:false, message } shape.
module.exports = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`;
  }
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid id: ${err.value}`;
  }
  if (err.name === 'JsonWebTokenError') { status = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { status = 401; message = 'Token expired'; }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message });
};
