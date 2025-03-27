// shifts.js (backend router)
const express = require("express");
const router = express.Router();
const { getDB } = require("../utils/db"); // Assumes a utility to get MongoDB connection
const Shift = require("../../modules/Shift"); // Shift model/class
const authenticate = require("../middleware/auth"); // Authentication middleware

// POST /newShift - Create a new shift
router.post("/newShift", authenticate, async (req, res) => {
    try {

        const { usrname, team, newshift } = req.body;
        // Validate all required fields from the request body
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
            return res.status(400).json({ success: false, message: `Shift '${newshift}' already exists for team '${currentTeam}'` });
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
// GET /shifts_of_team - Fetch all shifts for a team
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
        const teams = await db.collection("teams").find({ teamName: teamname }).toArray();

        if (!teams || teams.length === 0) {
            return res.status(404).json({ success: false, message: "No teams found" });
        }

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
                    role: user ? user.team_shifts.find(ts => ts.team_shift === `${team.teamName}-${shift.name}`).role : "N/A",
                });
            }
        }

        res.status(200).json({ success: true, shifts });
    } catch (error) {
        console.error("Error fetching shifts:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// POST /deleteShift - Delete a shift
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