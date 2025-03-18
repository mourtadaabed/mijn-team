const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDB } = require("../utils/db");
const User = require("../../modules/User");
const Shift = require("../../modules/Shift");
const authenticate = require("../middleware/auth");

// POST /newShift - Create a new shift for an existing team
router.post("/newShift", authenticate, async (req, res) => {
  try {
    const { username, password, email, teamname, shiftname } = req.body;

    // Validate required fields
    if (!username || !password || !email || !teamname || !shiftname) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const db = getDB();
    const normalizedUsername = username.trim().toLowerCase();

    // Check if team exists
    let existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (!existingTeam) {
      return res.status(404).json({ success: false, message: `Team '${teamname}' does not exist` });
    }

    // Check if shift already exists for this team
    const shiftExists = existingTeam.shifts.some((shift) => shift.name === shiftname);
    if (shiftExists) {
      return res.status(400).json({ success: false, message: `Shift '${shiftname}' already exists for team '${teamname}'` });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    let existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
    });

    const teamShiftObj = { team_shift: `${teamname}-${shiftname}`, role: "user" };

    if (existingUser) {
      // Add team-shift to existing user if not already present
      const userShiftExists = existingUser.team_shifts.some(ts => ts.team_shift === teamShiftObj.team_shift);
      if (!userShiftExists) {
        await db.collection("users").updateOne(
          { _id: existingUser._id },
          { $push: { team_shifts: teamShiftObj } }
        );
      }
    } else {
      // Create new user with the team-shift
      const newUser = new User(normalizedUsername, email, hashedPassword, teamname, shiftname, "user");
      await db.collection("users").insertOne(newUser);
    }

    // Add new shift to the team
    const newShift = new Shift(shiftname);
    await db.collection("teams").updateOne(
      { _id: existingTeam._id },
      { $push: { shifts: newShift } }
    );

    // Response matching your frontend expectation
    res.status(201).json({
      success: true,
      message: existingUser
        ? "Shift added to existing user and team successfully"
        : "New user and shift created successfully",
    });
  } catch (error) {
    console.error("Error creating shift:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;