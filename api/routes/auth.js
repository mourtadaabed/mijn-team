const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getDB } = require("../utils/db");
const User = require("../../modules/User");
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET;
const COOKIE_NAME = "jwt_token";

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDB();
    const user = await db.collection("users").findOne({ name: username });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.name, 
        team_shifts: user.team_shifts // Include the full team_shifts array
      },
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
      user: { 
        name: user.name, 
        team_shifts: user.team_shifts // Return team_shifts array
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, team, shift, role = "user" } = req.body; // Added role parameter
    const db = getDB();
    const findUser = await db.collection("users").findOne({ name: username });
    if (findUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(username, email, hashedPassword, team, shift, role);

    await db.collection("users").insertOne({
      name: username,
      email,
      password: hashedPassword,
      team_shifts: newUser.team_shifts, // Store as array of objects
    });

    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Logout Route
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Match production setting
    sameSite: "strict",
    path: "/",
  });

  const token = req.cookies[COOKIE_NAME];
  if (token) {
    // Optionally blacklist token here if needed
  }

  res.status(200).json({ message: "Logout successful" });
});

router.post("/verify-user", require("../middleware/auth"), (req, res) => {
  try {

    const { name, team_shift, role } = req.body;

    // Verify the data against the authenticated user's data
    const isValidName = name === req.user.username;  // Use username instead of name

    // Check if team_shifts array exists and contains the matching team_shift and role
    const isValidTeamShiftAndRole = Array.isArray(req.user.team_shifts) &&
      req.user.team_shifts.some(shift => 
        shift.team_shift === team_shift && shift.role === role
      );

    const isValid = isValidName && isValidTeamShiftAndRole;



    res.status(200).json({ 
      isValid: isValid
    });
  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({ 
      isValid: false,
      error: 'Server error during verification'
    });
  }
});

module.exports = router;