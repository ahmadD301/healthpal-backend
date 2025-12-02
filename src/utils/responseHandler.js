/**
 * Standardized API Response Utility
 * Ensures consistent response format across all endpoints
 */

/**
 * Success response wrapper
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {any} data - Response data
 * @returns {object} Standardized response object
 */
const successResponse = (statusCode = 200, message = 'Success', data = null) => {
  return {
    success: true,
    message,
    statusCode,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Error response wrapper
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Error message
 * @param {any} details - Error details
 * @param {string} code - Error code for client handling
 * @returns {object} Standardized error response
 */
const errorResponse = (statusCode = 500, error = 'Internal server error', details = null, code = 'ERROR') => {
  return {
    success: false,
    error,
    errorCode: code,
    statusCode,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  };
};

/**
 * Response middleware factory
 * Adds helper methods to response object
 */
const responseHandler = (req, res, next) => {
  // Success response method
  res.success = (message = 'Success', data = null, statusCode = 200) => {
    const response = successResponse(statusCode, message, data);
    res.status(statusCode).json(response);
  };

  // Created response (201)
  res.created = (message = 'Resource created successfully', data = null) => {
    const response = successResponse(201, message, data);
    res.status(201).json(response);
  };

  // Error response method
  res.error = (message = 'Internal server error', details = null, statusCode = 500, code = 'ERROR') => {
    const response = errorResponse(statusCode, message, details, code);
    res.status(statusCode).json(response);
  };

  // Bad request response (400)
  res.badRequest = (message = 'Bad request', details = null) => {
    const response = errorResponse(400, message, details, 'BAD_REQUEST');
    res.status(400).json(response);
  };

  // Unauthorized response (401)
  res.unauthorized = (message = 'Unauthorized', details = null) => {
    const response = errorResponse(401, message, details, 'UNAUTHORIZED');
    res.status(401).json(response);
  };

  // Forbidden response (403)
  res.forbidden = (message = 'Forbidden', details = null) => {
    const response = errorResponse(403, message, details, 'FORBIDDEN');
    res.status(403).json(response);
  };

  // Not found response (404)
  res.notFound = (message = 'Resource not found', details = null) => {
    const response = errorResponse(404, message, details, 'NOT_FOUND');
    res.status(404).json(response);
  };

  // Conflict response (409)
  res.conflict = (message = 'Conflict', details = null) => {
    const response = errorResponse(409, message, details, 'CONFLICT');
    res.status(409).json(response);
  };

  next();
};

module.exports = {
  successResponse,
  errorResponse,
  responseHandler
};
