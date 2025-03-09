// api/middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
const COOKIE_NAME = "jwt_token";

function authenticate(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ isAuthenticated: false, message: "No token provided" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ isAuthenticated: false, message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

module.exports = authenticate;