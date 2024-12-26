const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Yetkilendirme başlığı eksik' });
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>"
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Geçersiz veya süresi dolmuş token' });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz bulunmamaktadır' });
    }
    next();
  };
};

module.exports = { verifyToken, authorize }; 