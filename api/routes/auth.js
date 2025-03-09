// api/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../utils/db");
const User = require("../../modules/User");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
const COOKIE_NAME = "jwt_token";

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDB();
    const user = await db.collection("users").findOne({ name: username });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, username: user.name, teamname: user.teamname, shift: user.shift },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { name: user.name, teamname: user.team_shifts },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { username, password, email, teamname, shift } = req.body;
    const db = getDB();
    const findUser = await db.collection("users").findOne({ name: username });
    if (findUser) return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(username, email, hashedPassword, teamname, shift);

    await db.collection("users").insertOne({
      name: username,
      email,
      password: hashedPassword,
      team_shifts: [teamname + "-" + shift],
    });

    res.status(201).send("Registered successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  const token = req.cookies[COOKIE_NAME];
  if (token) {
    // Optionally blacklist token here if needed
  }

  res.status(200).json({ message: "Logout successful" });
});

router.get("/check-auth", require("../middleware/auth"), (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

module.exports = router;