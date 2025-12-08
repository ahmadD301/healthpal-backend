// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('[authorize] Checking role:', req.user?.role, 'against allowed roles:', roles);
    if (!roles.includes(req.user.role)) {
      console.log('[authorize] Access denied - role not in allowed list');
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    console.log('[authorize] Access granted');
    next();
  };
};

module.exports = authorize;
