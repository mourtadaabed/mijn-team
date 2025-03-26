const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDB } = require("../utils/db");
const User = require("../../modules/User");
const authenticate = require("../middleware/auth");


console

router.post("/api/register", authenticate, async (req, res) => {
  try {
    const { username, password, email, teamname, shift, role } = req.body;

    // Validate required fields
    if (!username || !teamname || !shift) {
      return res.status(400).json({ success: false, message: "Username, teamname, and shift are required" });
    }

    const db = getDB();
    const normalizedUsername = username.trim().toLowerCase();
    const teamShift = `${teamname}-${shift}`; // e.g., "TeamA-W"

    // Check if team and shift exist
    const existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (!existingTeam) {
      return res.status(404).json({ success: false, message: `Team '${teamname}' does not exist` });
    }

    const shiftExists = existingTeam.shifts.some(s => s.name === shift);
    if (!shiftExists) {
      return res.status(404).json({ success: false, message: `Shift '${shift}' does not exist in team '${teamname}'` });
    }

    // Check if user exists
    const existingUser = await db.collection("users").findOne({
      name: { $regex: new RegExp(`^${normalizedUsername}$`, "i") },
    });

    if (existingUser) {
      // User exists: Update their team_shifts array
      const teamShiftsArray = existingUser.team_shifts || []; // Default to empty array if team_shifts doesn't exist
      const shiftIndex = teamShiftsArray.findIndex(ts => ts.team_shift === teamShift);

      if (shiftIndex >= 0) {
        // team_shift exists: Update the role
        teamShiftsArray[shiftIndex].role = role || teamShiftsArray[shiftIndex].role; // Keep existing role if not provided
      } else {
        // team_shift doesn't exist: Add new entry
        teamShiftsArray.push({
          team_shift: teamShift, // e.g., "TeamA-W"
          role: role || "user"   // Default to "user" if no role provided
        });
      }

      // Update the user document
      const updateResult = await db.collection("users").updateOne(
        { name: normalizedUsername },
        { $set: { team_shifts: teamShiftsArray } }
      );

      if (updateResult.modifiedCount === 0) {
        return res.status(500).json({ success: false, message: "Failed to update user team_shifts" });
      }

      res.status(200).json({
        success: true,
        message: `User '${username}' updated successfully with team_shift '${teamShift}'`
      });
    } else {
      // User doesn't exist: Create new user
      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required for new user" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        name: normalizedUsername,
        email,
        password: hashedPassword,
        team_shifts: [{
          team_shift: teamShift,
          role: role || "user"
        }],
        createdAt: new Date()
      };

      const insertResult = await db.collection("users").insertOne(newUser);

      if (!insertResult.insertedId) {
        return res.status(500).json({ success: false, message: "Failed to create user" });
      }

      res.status(201).json({
        success: true,
        message: `User '${username}' created successfully with team_shift '${teamShift}'`
      });
    }
  } catch (error) {
    console.error("Error processing user:", error.stack);
    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
});




// GET /api/users/shifts - Fetch available shifts
router.get("/shifts_list", authenticate, async (req, res) => {
  
  try {
    const db = getDB();
    const teamName = req.query.team;

    if (!teamName) {
      return res.status(400).json({ success: false, message: "Team name is required" });
    }

    const team = await db.collection("teams").findOne({ teamName: teamName });
    if (!team) {
      return res.status(404).json({ success: false, message: `Team '${teamName}' not found` });
    }

    const shifts = team.shifts.map(shift => shift.name);

    if (!shifts.length) {
      return res.status(404).json({ success: false, message: `No shifts found for team '${teamName}'` });
    }
    res.status(200).json(shifts);
  } catch (error) {
    console.error("Error fetching shifts:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /users_of_team - Fetch users for a specific team
router.get("/users_of_team", authenticate, async (req, res) => {
  try {
    const db = getDB();
    const teamName = req.query.team;

    if (!teamName) {
      return res.status(400).json({
        success: false,
        message: "Team name is required for this endpoint"
      });
    }

    const users = await db.collection("users").find({
      "team_shifts.team_shift": { $regex: new RegExp(`^${teamName}-`) }
    }).toArray();

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No users found for team '${teamName}'`
      });
    }

    const formattedUsers = users.flatMap(user => {
      const matchingTeamShifts = user.team_shifts.filter(ts => 
        ts.team_shift.startsWith(`${teamName}-`)
      );
      
      return matchingTeamShifts.map(ts => {
        const [_, shift] = ts.team_shift.split('-');
        return {
          username: user.name,
          shift: shift || 'N/A',
          role: ts.role || 'N/A',
          email: user.email
        };
      });
    });

    res.status(200).json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error("Error fetching team users:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// DELETE /api/users/team_shift - Remove a specific team_shift from a user
router.delete("/api/users/team_shift", authenticate, async (req, res) => {
  try {
    const db = getDB();
    const { username, team, shift } = req.body;

    if (!username || !team || !shift) {
      return res.status(400).json({
        success: false,
        message: "Username, team, and shift are required"
      });
    }

    const teamShift = `${team}-${shift}`;

    const result = await db.collection("users").updateOne(
      { name: username },
      { $pull: { team_shifts: { team_shift: teamShift } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Team shift '${teamShift}' not found for user '${username}'`
      });
    }

    res.status(200).json({
      success: true,
      message: `Team shift '${teamShift}' removed from user '${username}'`
    });
  } catch (error) {
    console.error("Error deleting team_shift:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// GET /api/users/:username - Fetch a specific user’s data
router.get("/api/users/:username", authenticate, async (req, res) => {
  try {
    const db = getDB();
    const username = req.params.username;

    const user = await db.collection("users").findOne({ name: username });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`
      });
    }

    res.status(200).json({
      success: true,
      user: {
        username: user.name,
        email: user.email,
        team_shifts: user.team_shifts // Return the full team_shifts array
      }
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});




router.put("/api/users/team_shift", authenticate, async (req, res) => {

  try {
    const db = getDB();
    const { username, team, oldShift, newShift, role, email, password } = req.body;

    if (!username || !team || !oldShift || !newShift) {
      return res.status(400).json({
        success: false,
        message: "Username, team, oldShift, and newShift are required"
      });
    }

    const oldTeamShift = `${team}-${oldShift}`; // Team-shift to remove
    const newTeamShift = { team_shift: `${team}-${newShift}`, role: role || 'user' }; // Team-shift to add

    // Step 1: Remove the old team_shift
    const pullResult = await db.collection("users").updateOne(
      { name: username },
      { $pull: { team_shifts: { team_shift: oldTeamShift } } }
    );

    if (pullResult.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`
      });
    }

    // Step 2: Add the new team_shift and update other fields if provided
    const updateFields = {};
    if (email) updateFields.email = email;
    if (password) updateFields.password = await bcrypt.hash(password, 10);

    const pushResult = await db.collection("users").updateOne(
      { name: username },
      {
        $push: { team_shifts: newTeamShift }, // Add new team_shift
        ...(Object.keys(updateFields).length > 0 && { $set: updateFields }) // Update email/password if provided
      }
    );

    if (pushResult.matchedCount === 0) {
      // This shouldn't happen since the first update succeeded, but handle it anyway
      return res.status(500).json({
        success: false,
        message: "Failed to add new team_shift after removing old one"
      });
    }

    if (pullResult.modifiedCount === 0 && pushResult.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Team shift '${oldTeamShift}' not found and '${newTeamShift.team_shift}' not added for user '${username}'`
      });
    }

    res.status(200).json({
      success: true,
      message: `Team shift updated for user '${username}'`
    });
  } catch (error) {
    console.error("Error updating team_shift:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});





module.exports = router;