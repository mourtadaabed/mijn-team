const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDB } = require("../utils/db");
const User = require("../../modules/User");
const authenticate = require("../middleware/auth");

// POST /register - Create a new user
router.post("/register", authenticate, async (req, res) => {
  try {
    const { username, password, email, teamname, shift } = req.body;

    // Validate required fields
    if (!username || !password || !teamname || !shift) {
      return res.status(400).json({ success: false, message: "Username, password, teamname, and shift are required" });
    }

    const db = getDB();
    const normalizedUsername = username.trim().toLowerCase();
    const teamShift = `${teamname}-${shift}`;

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: `User '${username}' already exists` });
    }

    // Check if team exists
    const existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (!existingTeam) {
      return res.status(404).json({ success: false, message: `Team '${teamname}' does not exist` });
    }

    // Verify shift exists in the team
    const shiftExists = existingTeam.shifts.some(s => s.name === shift);
    if (!shiftExists) {
      return res.status(404).json({ success: false, message: `Shift '${shift}' does not exist in team '${teamname}'` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User(
      normalizedUsername,
      email || "", // Email is optional in your frontend, so default to empty string if not provided
      hashedPassword,
      teamname,
      shift,
      "user" // Default role
    );

    // Insert the new user into the database
    await db.collection("users").insertOne(newUser);

    // Respond with success (frontend expects plain text or JSON with a message)
    res.status(201).json({
      success: true,
      message: "Registration successful!"
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;