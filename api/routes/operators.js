// api/routes/operators.js
const express = require("express");
const router = express.Router();
const { getDB } = require("../utils/db");
const Operator = require("../../modules/Operator");
const authenticate = require("../middleware/auth");

router.post("/operators", authenticate, async (req, res) => {
  const { team, shift } = req.body;
  if (!team || !shift) return res.status(400).json({ error: "Team and shift required" });

  try {
    const db = getDB();
    const teamDocument = await db.collection("teams").findOne({ teamName: team });
    if (!teamDocument || !teamDocument.shifts) return res.status(404).json({ error: "Team or shift not found" });

    const shiftData = teamDocument.shifts.find((s) => s.name === shift);
    if (!shiftData) return res.status(404).json({ error: "Shift not found" });

    const operators = shiftData.operators || [];
    res.json(operators);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/check-operator", authenticate, async (req, res) => {
  try {
    const { operator_number, team_name, shift_name } = req.body;
    const db = getDB();
    const operatorData = await checkOperatorInDB(operator_number, team_name, shift_name, db);
    const exists = !!operatorData;
    res.json({ exists, operator: operatorData });
  } catch (error) {
    res.status(500).json({ exists: false, error: "Internal Server Error", operator: null });
  }
});

router.post("/create-operator", authenticate, async (req, res) => {
  try {
    const { newOperator: { name, number, rol }, team_name, shift_name } = req.body;
    const db = getDB();
    const result = await createNewOperator(name, number, rol, team_name, shift_name, db);

    if (!result.success) return res.status(400).json({ error: result.message });

    const teamDocument = await db.collection("teams").findOne({ teamName: team_name });
    const shiftData = teamDocument.shifts.find((s) => s.name === shift_name);
    const operators = shiftData?.operators || [];
    res.json(operators);
  } catch (error) {
    console.error("Error in /create-operator:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/update-operator", authenticate, async (req, res) => {
  try {
    const { number, name, rol, team_name, shift_name } = req.body;
    if (!number || !team_name || !shift_name) {
      return res.status(400).json({ error: "number, team_name, shift_name required" });
    }

    const db = getDB();
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team || !Array.isArray(team.shifts)) return res.status(404).json({ error: "Team not found" });

    const shift = team.shifts.find((s) => s.name === shift_name);
    if (!shift || !Array.isArray(shift.operators)) return res.status(404).json({ error: "Shift not found" });

    const operatorIndex = shift.operators.findIndex((op) => op.number === number);
    if (operatorIndex === -1) return res.status(404).json({ error: "Operator not found" });

    const updateFields = {
      "shifts.$[shift].operators.$[operator].name": name || shift.operators[operatorIndex].name,
      "shifts.$[shift].operators.$[operator].rol": rol || shift.operators[operatorIndex].rol,
    };

    await db.collection("teams").updateOne(
      { teamName: team_name },
      { $set: updateFields },
      { arrayFilters: [{ "shift.name": shift_name }, { "operator.number": number }] }
    );

    const updatedTeam = await db.collection("teams").findOne({ teamName: team_name });
    const updatedShift = updatedTeam.shifts.find((s) => s.name === shift_name);
    res.status(200).json({ success: true, message: "Operator updated", operators: updatedShift.operators });
  } catch (err) {
    console.error("Error updating operator:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete-operator", authenticate, async (req, res) => {
  const { operator_number, team_name, shift_name } = req.body;
  try {
    const db = getDB();
    const result = await db.collection("teams").updateOne(
      { teamName: team_name, "shifts.name": shift_name },
      { $pull: { "shifts.$.operators": { number: operator_number } } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ success: false, message: "Operator not found" });

    const updatedTeam = await db.collection("teams").findOne({ teamName: team_name });
    const updatedShift = updatedTeam.shifts.find((s) => s.name === shift_name);
    res.json({ success: true, operators: updatedShift?.operators || [] });
  } catch (error) {
    console.error("Error deleting operator:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.put("/add-station-to-operator", authenticate, async (req, res) => {
  const { station_number, operator_number, team_name, shift_name } = req.body;
  try {
    const db = getDB();
    const result = await db.collection("teams").updateOne(
      {
        teamName: team_name,
        "shifts.name": shift_name,
        "shifts.operators.number": operator_number,
      },
      { $addToSet: { "shifts.$[shift].operators.$[op].stations": station_number } },
      { arrayFilters: [{ "shift.name": shift_name }, { "op.number": operator_number }] }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Operator or shift not found" });

    const updatedTeam = await db.collection("teams").findOne({ teamName: team_name });
    const updatedShift = updatedTeam.shifts.find((s) => s.name === shift_name);
    res.json({ operators: updatedShift.operators });
  } catch (error) {
    console.error("Error adding station:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/delete-station-from-operator", authenticate, async (req, res) => {
  const { station_number, operator_number, team_name, shift_name } = req.body;
  try {
    const db = getDB();
    const result = await db.collection("teams").updateOne(
      {
        teamName: team_name,
        "shifts.name": shift_name,
        "shifts.operators.number": operator_number,
      },
      { $pull: { "shifts.$[shift].operators.$[op].stations": station_number } },
      { arrayFilters: [{ "shift.name": shift_name }, { "op.number": operator_number }] }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Station or operator not found" });

    const updatedTeam = await db.collection("teams").findOne({ teamName: team_name });
    const updatedShift = updatedTeam.shifts.find((s) => s.name === shift_name);
    res.json({ operators: updatedShift.operators });
  } catch (error) {
    console.error("Error deleting station:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

async function checkOperatorInDB(operator_number, team_name, shift_name, db) {
  try {
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team || !Array.isArray(team.shifts)) return null;

    const shift = team.shifts.find((s) => s.name === shift_name);
    if (!shift || !Array.isArray(shift.operators)) return null;

    return shift.operators.find((operator) => operator.number === operator_number) || null;
  } catch (err) {
    console.error("Error checking operator:", err);
    throw err;
  }
}

async function createNewOperator(name, number, rol, team_name, shift_name, db) {
  try {
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team) return { success: false, message: "Team not found" };

    const shiftIndex = team.shifts.findIndex((s) => s.name === shift_name);
    if (shiftIndex === -1) return { success: false, message: "Shift not found" };

    if (!Array.isArray(team.shifts[shiftIndex].operators)) team.shifts[shiftIndex].operators = [];

    const newOperator = new Operator(name, number, rol);
    await db.collection("teams").updateOne(
      { teamName: team_name, "shifts.name": shift_name },
      { $push: { "shifts.$.operators": newOperator } }
    );

    return { success: true, message: "Operator created successfully" };
  } catch (err) {
    console.error("Error creating operator:", err);
    return { success: false, message: "Internal Server Error" };
  }
}

module.exports = router;