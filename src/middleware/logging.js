const pool = require('../config/database');

/**
 * Request logging middleware
 */
const logger = async (req, res, next) => {
  const startTime = Date.now();
  
  // Capture response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    
    // Log to database if user is authenticated
    if (req.user) {
      pool.execute(
        'INSERT INTO logs (user_id, action, ip_address) VALUES (?, ?, ?)',
        [req.user.id, `${req.method} ${req.path}`, req.ip]
      ).catch(err => {
        // Silently fail if logging table has issues - don't block request
        // console.error('Database logging error:', err);
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Global error handling middleware
 * Must be placed after all other middleware and routes
 */
const errorHandler = (err, req, res, next) => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const timestamp = new Date().toISOString();
  
  // Log error
  console.error(`[${timestamp}] ERROR:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  // Determine status code
  let statusCode = err.statusCode || err.status || 500;
  if (statusCode < 400) statusCode = 500;
  
  // Sanitize error message for production
  let errorMessage = err.message;
  if (NODE_ENV === 'production') {
    errorMessage = statusCode === 500 ? 'Internal server error' : err.message;
  }
  
  // Send error response
  res.status(statusCode).json({
    error: errorMessage,
    errorCode: err.code || 'INTERNAL_ERROR',
    timestamp,
    path: req.path,
    ...(NODE_ENV === 'development' && { stack: err.stack, details: err.details })
  });
};

module.exports = { logger, errorHandler };
