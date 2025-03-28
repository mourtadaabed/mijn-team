const express = require("express");
const router = express.Router();
const { getDB } = require("../utils/db"); // Assumes a utility to get MongoDB connection
const Shift = require("../../modules/Shift"); // Shift model/class
const authenticate = require("../middleware/auth"); // Authentication middleware

// POST /newShift - Create a new shift
router.post("/newShift", authenticate, async (req, res) => {
    try {
        const { usrname, team, newshift } = req.body;
        if (!usrname || !team || !newshift) {
            return res.status(400).json({ success: false, message: "All fields (usrname, team, newshift) are required" });
        }

        const db = getDB();

        // Check if team exists
        let existingTeam = await db.collection("teams").findOne({ teamName: team });
        if (!existingTeam) {
            return res.status(404).json({ success: false, message: `Team '${team}' does not exist` });
        }

        // Check if shift already exists
        const shiftExists = existingTeam.shifts.some((shift) => shift.name === newshift);
        if (shiftExists) {
            return res.status(400).json({ success: false, message: `Shift '${newshift}' already exists for team '${team}'` });
        }

        // Create and add new shift
        const newShift = new Shift(newshift);
        await db.collection("teams").updateOne(
            { teamName: team },
            { $push: { shifts: newShift } }
        );

        // Update user's team_shifts
        const teamShiftObj = { team_shift: `${team}-${newshift}`, role: "admin" };
        await db.collection("users").updateOne(
            { name: usrname },
            { 
                $push: { team_shifts: teamShiftObj },
                $setOnInsert: { name: usrname }
            },
            { upsert: true }
        );

        res.status(201).json({
            success: true,
            message: "Shift created and assigned successfully",
        });
    } catch (error) {
        console.error("Error creating shift:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// GET /shifts_of_team - Fetch all shifts for a team, repeated per user
router.get("/shifts_of_team", authenticate, async (req, res) => {
    try {
        const { teamname } = req.query;
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!teamname) {
            return res.status(400).json({ success: false, message: "Team name is required" });
        }

        const db = getDB();
        const team = await db.collection("teams").findOne({ teamName: teamname });

        if (!team) {
            return res.status(404).json({ success: false, message: "No team found" });
        }

        const shifts = [];
        for (const shift of team.shifts) {
            const teamShift = `${team.teamName}-${shift.name}`;
            const users = await db.collection("users").find({
                "team_shifts.team_shift": teamShift
            }).toArray();

            if (users.length === 0) {
                shifts.push({
                    shiftname: shift.name,
                    teamname: team.teamName,
                    username: "N/A",
                    role: "N/A"
                });
            } else {
                users.forEach(user => {
                    const userTeamShift = user.team_shifts.find(ts => ts.team_shift === teamShift);
                    shifts.push({
                        shiftname: shift.name,
                        teamname: team.teamName,
                        username: user.name,
                        role: userTeamShift ? userTeamShift.role : "N/A"
                    });
                });
            }
        }

        res.status(200).json({ success: true, shifts });
    } catch (error) {
        console.error("Error fetching shifts:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

router.post("/deleteShift", authenticate, async (req, res) => {
    try {
        const { shiftname, teamname } = req.body;
        const user = req.user;

        if (!shiftname || !teamname) {
            return res.status(400).json({ success: false, message: "Shift name and team name are required" });
        }

        const db = getDB();

        const team = await db.collection("teams").findOne({ teamName: teamname });
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        const shiftExists = team.shifts.some((shift) => shift.name === shiftname);
        if (!shiftExists) {
            return res.status(404).json({ success: false, message: "Shift not found" });
        }

        await db.collection("teams").updateOne(
            { teamName: teamname },
            { $pull: { shifts: { name: shiftname } } }
        );

        const teamShift = `${teamname}-${shiftname}`;
        await db.collection("users").updateMany(
            { "team_shifts.team_shift": teamShift },
            { $pull: { team_shifts: { team_shift: teamShift } } }
        );

        const usersWithEmptyShifts = await db.collection("users").find(
            { team_shifts: { $size: 0 } }
        ).toArray();

        if (usersWithEmptyShifts.length > 0) {
            const userIdsToDelete = usersWithEmptyShifts.map(user => user._id);
            await db.collection("users").deleteMany(
                { _id: { $in: userIdsToDelete } }
            );
        }

        // Check if team has no shifts remaining and delete it
        const updatedTeam = await db.collection("teams").findOne({ teamName: teamname });
        let teamDeleted = false;
        if (updatedTeam.shifts.length === 0) {
            await db.collection("teams").deleteOne({ teamName: teamname });
            teamDeleted = true;
        }

        let message = "Shift deleted successfully";
        if (usersWithEmptyShifts.length > 0) {
            message += ` and ${usersWithEmptyShifts.length} user(s) with no remaining shifts were also deleted`;
        }
        if (teamDeleted) {
            message += " and the team was deleted as it had no remaining shifts";
        }

        res.status(200).json({ 
            success: true, 
            message,
            deletedUsersCount: usersWithEmptyShifts.length,
            teamDeleted: teamDeleted
        });
    } catch (error) {
        console.error("Error deleting shift:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// POST /updateShift - Update a shift with new name and assign a user with a role (preserve old assignments)
router.post("/updateShift", authenticate, async (req, res) => {
    try {
        const { oldShiftName, teamname, newShiftName, newUsername, newRole } = req.body;
        const user = req.user;

        if (!oldShiftName || !teamname || !newShiftName) {
            return res.status(400).json({ success: false, message: "Old shift name, team name, and new shift name are required" });
        }

        if (!newUsername || !newRole) {
            return res.status(400).json({ success: false, message: "New username and role are required" });
        }

        const db = getDB();

        // Check if team exists
        const team = await db.collection("teams").findOne({ teamName: teamname });
        if (!team) {
            return res.status(404).json({ success: false, message: "Team not found" });
        }

        // Check if old shift exists
        const shiftExists = team.shifts.some((shift) => shift.name === oldShiftName);
        if (!shiftExists) {
            return res.status(404).json({ success: false, message: "Shift not found" });
        }

        // Check if new shift name already exists (and isn’t just the old name)
        if (oldShiftName !== newShiftName) {
            const newShiftNameExists = team.shifts.some((shift) => shift.name === newShiftName);
            if (newShiftNameExists) {
                return res.status(400).json({ success: false, message: `Shift '${newShiftName}' already exists for team '${teamname}'` });
            }

            // Update shift name in teams collection
            await db.collection("teams").updateOne(
                { teamName: teamname, "shifts.name": oldShiftName },
                { $set: { "shifts.$.name": newShiftName } }
            );

            // Update all existing user assignments to reflect the new shift name
            const oldTeamShift = `${teamname}-${oldShiftName}`;
            const newTeamShift = `${teamname}-${newShiftName}`;
            await db.collection("users").updateMany(
                { "team_shifts.team_shift": oldTeamShift },
                { $set: { "team_shifts.$.team_shift": newTeamShift } }
            );
        }

        // Assign or update the new user with the specified role
        const newTeamShift = `${teamname}-${newShiftName}`;
        const userDoc = await db.collection("users").findOne({ name: newUsername });

        if (userDoc && userDoc.team_shifts.some(ts => ts.team_shift === newTeamShift)) {
            // If the user already has this shift, update the role
            await db.collection("users").updateOne(
                { name: newUsername, "team_shifts.team_shift": newTeamShift },
                { $set: { "team_shifts.$.role": newRole } }
            );
        } else {
            // If the user doesn't have this shift, add it
            await db.collection("users").updateOne(
                { name: newUsername },
                { 
                    $push: { team_shifts: { team_shift: newTeamShift, role: newRole } },
                    $setOnInsert: { name: newUsername }
                },
                { upsert: true }
            );
        }

        res.status(200).json({ 
            success: true, 
            message: "Shift updated and user assigned successfully"

        });
    } catch (error) {
        console.error("Error updating shift:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// GET /team_users - Fetch all users in a team
router.get("/team_users", authenticate, async (req, res) => {
    try {
        const { teamname } = req.query;
        if (!teamname) {
            return res.status(400).json({ success: false, message: "Team name is required" });
        }

        const db = getDB();
        const users = await db.collection("users").find({
            "team_shifts.team_shift": { $regex: new RegExp(`^${teamname}-`) }
        }).toArray();

        const userList = users.map(user => ({
            name: user.name
        }));

        res.status(200).json({ success: true, users: userList });
    } catch (error) {
        console.error("Error fetching team users:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

module.exports = router;