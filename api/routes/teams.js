// api/routes/teams.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDB } = require("../utils/db");
const Team = require("../../modules/Team");
const User = require("../../modules/User");
const Shift = require("../../modules/Shift");
const authenticate = require("../middleware/auth");

router.get("/teams", async (req, res) => {
  try {
    const db = getDB();
    const teams = await db.collection("teams").find().toArray();
    const teamShifts = teams.flatMap((team) =>
      team.shifts.map((shift) => ({
        teamName: team.teamName,
        shiftName: shift.name,
      }))
    );
    res.json(teamShifts);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/selectTeam", async (req, res) => {
  const { teamName, shiftName } = req.body;
  try {
    const db = getDB();
    const team = await db.collection("teams").findOne({ teamName });
    if (!team) return res.status(404).json({ error: "Team not found" });

    const shiftExists = team.shifts.some((shift) => shift.name === shiftName);
    if (!shiftExists) return res.status(404).json({ error: "Shift not found" });

    res.json({ success: true, message: "Team and shift selected!", team });
  } catch (error) {
    console.error("Error selecting team:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/createTeam", async (req, res) => {
  const { admin, teamname, shift, email, password } = req.body;
  if (!admin || !teamname || !shift || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  try {
    const db = getDB();
    const normalizedAdmin = admin.trim().toLowerCase();
    const teamShiftKey = `${teamname}-${shift}`;

    const existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (existingTeam) {
      return res.status(400).json({ success: false, message: `Team '${teamname}' exists` });
    }

    const existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedAdmin}$`, "i") },
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists. Use /createTeamForExistingUser if authenticated.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(normalizedAdmin, email, hashedPassword, teamname, shift, "admin"); // Set role to admin
    const newTeam = new Team(teamname, shift);

    await db.collection("users").insertOne(newUser); // Insert the User instance directly
    await db.collection("teams").insertOne(newTeam);

    res.status(201).json({
      success: true,
      message: `Team '${teamname}' and new admin user created`,
      team: newTeam,
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/daysOfTeam", async (req, res) => {
  try {
    const { teamName, shiftName } = req.body;
    if (!teamName || !shiftName) {
      return res.status(400).json({ success: false, message: "Team and shift required" });
    }

    const db = getDB();
    const teamData = await db.collection("teams").findOne({ teamName });
    if (!teamData) return res.status(404).json({ success: false, message: "Team not found" });

    const shiftData = teamData.shifts.find((s) => s.name === shiftName);
    if (!shiftData) return res.status(404).json({ success: false, message: "Shift not found" });

    const dayIds = (shiftData.days || []).map((day) => day.id);
    res.json(dayIds);
  } catch (error) {
    console.error("Error fetching days:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/oneDay", async (req, res) => {
  try {
    const { day_id, teamName, shiftName } = req.body;
    if (!day_id || !teamName || !shiftName) {
      return res.status(400).json({ success: false, message: "day_id, teamName, shiftName required" });
    }

    const db = getDB();
    const teamData = await db.collection("teams").findOne({ teamName });
    if (!teamData) return res.status(404).json({ success: false, message: "Team not found" });

    const shiftData = teamData.shifts.find((s) => s.name === shiftName);
    if (!shiftData) return res.status(404).json({ success: false, message: "Shift not found" });

    const day = shiftData.days.find((s) => s.id === day_id);
    if (!day) return res.status(404).json({ success: false, message: "Day not found" });

    res.json(day);
  } catch (error) {
    console.error("Error fetching day:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/newShift", authenticate, async (req, res) => {
  try {
    const { username, password, email, teamname, shiftname } = req.body;
    if (!username || !password || !email || !teamname || !shiftname) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const db = getDB();
    const normalizedUsername = username.trim().toLowerCase();
    const teamShiftObj = { team_shift: `${teamname}-${shiftname}`, role: "user" }; // Default role

    let existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    if (existingUser) {
      const shiftExists = existingUser.team_shifts.some(ts => ts.team_shift === teamShiftObj.team_shift);
      if (!shiftExists) {
        await db.collection("users").updateOne(
          { _id: existingUser._id },
          { $push: { team_shifts: teamShiftObj } }
        );
      }
    } else {
      const newUser = new User(normalizedUsername, email, hashedPassword, teamname, shiftname, "user");
      await db.collection("users").insertOne(newUser); // Use User instance directly
    }

    let existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (existingTeam) {
      const shiftExists = existingTeam.shifts.some((shift) => shift.name === shiftname);
      if (!shiftExists) {
        await db.collection("teams").updateOne(
          { _id: existingTeam._id },
          { $push: { shifts: new Shift(shiftname) } }
        );
      }
    } else {
      return res.status(400).json({ success: false, message: `Team '${teamname}' does not exist` });
    }

    res.status(201).json({
      success: true,
      message: existingUser
        ? "Team-shift added to existing user successfully"
        : "New user and team-shift created successfully",
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});


router.post("/createTeamForExistingUser", authenticate, async (req, res) => {
  const { username, teamname, shiftname } = req.body;
  if (!username || !teamname || !shiftname) {
    return res.status(400).json({ success: false, message: "Username, teamname, and shiftname required" });
  }

  try {
    const db = getDB();
    const normalizedUsername = username.trim().toLowerCase();
    const teamShiftObj = { team_shift: `${teamname}-${shiftname}`, role: "admin" };

    const existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (existingTeam) {
      return res.status(400).json({ success: false, message: `Team '${teamname}' exists` });
    }

    const existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
    });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const shiftExists = existingUser.team_shifts.some(ts => ts.team_shift === teamShiftObj.team_shift);
    if (!shiftExists) {
      await db.collection("users").updateOne(
        { _id: existingUser._id },
        { $push: { team_shifts: teamShiftObj } }
      );
    }

    const newTeam = new Team(teamname, shiftname);
    await db.collection("teams").insertOne(newTeam);

    res.status(201).json({
      success: true,
      message: `Team '${teamname}' created and user updated with admin role`,
      team: newTeam,
    });
  } catch (error) {
    console.error("Error creating team for existing user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
module.exports = router;