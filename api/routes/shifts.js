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





// GET /shifts_of_team - Fetch all shifts for the authenticated user's team
router.get("/shifts_of_team", authenticate, async (req, res) => {
  try {
    const db = getDB();
    const user = req.user; // Assuming authenticate middleware attaches user to req

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch teams the user is part of
    const teams = await db.collection("teams").find({ teamName: req.query.teamname }).toArray();

    if (!teams || teams.length === 0) {
      return res.status(404).json({ success: false, message: "No teams found" });
    }

    // Collect all shifts with associated user info
    const shifts = [];
    for (const team of teams) {
      for (const shift of team.shifts) {
        const user = await db.collection("users").findOne({
          team_shifts: { $elemMatch: { team_shift: `${team.teamName}-${shift.name}` } },
        });
        shifts.push({
          shiftname: shift.name,
          teamname: team.teamName,
          username: user ? user.name : "N/A",
          role: user ? user.team_shifts.find(ts => ts.team_shift === `${team.teamName}-${shift.name}`).role : "N/A", // Add role instead of email
        });
      }
    }

    res.status(200).json({ success: true, shifts });
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});





// DELETE /deleteShift - Delete a shift from a team
router.delete("/deleteShift", authenticate, async (req, res) => {
  try {
    const { shiftname, teamname,role } = req.body;

    // Validate required fields
    if (!shiftname || !teamname) {
      return res.status(400).json({ success: false, message: "Shift name and team name are required" });
    }

    const db = getDB();
    const user = req.user;
    // Check if user is admin
    if (role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can delete shifts" });
    }

    // 1. Check if team exists
    const team = await db.collection("teams").findOne({ teamName: teamname });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    // Check if shift exists in team
    const shiftExists = team.shifts.some((shift) => shift.name === shiftname);
    if (!shiftExists) {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }

    // 2. Remove shift from team's shifts array
    await db.collection("teams").updateOne(
      { teamName: teamname },
      { $pull: { shifts: { name: shiftname } } }
    );

    // 3. Remove team-shift from users and get affected users
    const teamShift = `${teamname}-${shiftname}`;
    const updateResult = await db.collection("users").updateMany(
      { "team_shifts.team_shift": teamShift },
      { $pull: { team_shifts: { team_shift: teamShift } } }
    );

    // 4. Find and delete users with empty team_shifts array
    const usersWithEmptyShifts = await db.collection("users").find(
      { team_shifts: { $size: 0 } }
    ).toArray();

    if (usersWithEmptyShifts.length > 0) {
      // Get IDs of users to delete
      const userIdsToDelete = usersWithEmptyShifts.map(user => user._id);
      
      // Delete users with empty shifts
      await db.collection("users").deleteMany(
        { _id: { $in: userIdsToDelete } }
      );
    }

    // Prepare response message
    let message = "Shift deleted successfully";
    if (usersWithEmptyShifts.length > 0) {
      message += ` and ${usersWithEmptyShifts.length} user(s) with no remaining shifts were also deleted`;
    }

    res.status(200).json({ 
      success: true, 
      message,
      deletedUsersCount: usersWithEmptyShifts.length
    });

  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

module.exports = router;