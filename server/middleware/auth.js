const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from header or query parameter (for iframe requests)
  let token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;

  // Check if no token
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

module.exports = auth;

