// api/routes/dayplan.js
const express = require("express");
const router = express.Router();
const { getDB } = require("../utils/db");
const Operator = require("../../modules/Operator");
const Station = require("../../modules/Station");
const DayStation = require("../../modules/DayStation");
const Day = require("../../modules/Day");
const authenticate = require("../middleware/auth");

router.post("/day-plan", authenticate, async (req, res) => {
  const { attendees, id, team, shift } = req.body;
  if (!attendees || !id || !team || !shift) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = getDB();
    const dayPlan = await findoperator(attendees, id, team, shift, db);
    res.status(200).json(dayPlan);
  } catch (error) {
    console.error("Error generating day plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/dayplan", authenticate, async (req, res) => {
  try {
    const { dayplan, team, shift } = req.body;
    const db = getDB();
    const result = await db.collection("teams").updateOne(
      { teamName: team, "shifts.name": shift },
      { $push: { "shifts.$.days": dayplan } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Team or shift not found" });

    res.status(200).json({ message: "Dayplan submitted successfully" });
  } catch (error) {
    console.error("Error in /dayplan route:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

async function findoperator(attendees, id, team, shift, db) {
  try {
    const teamDoc = await db.collection("teams").findOne({ teamName: team });
    if (!teamDoc) throw new Error(`Team ${team} not found`);

    const shiftData = teamDoc.shifts.find((s) => s.name === shift);
    if (!shiftData) throw new Error(`Shift ${shift} not found`);

    const operators_db = shiftData.operators
      .filter((operator) => attendees.includes(operator.name))
      .map((op) => new Operator(op.name, op.number, op.rol));
    operators_db.forEach((op) => {
      op.stations = shiftData.operators.find((o) => o.name === op.name).stations;
    });

    if (operators_db.length === 0) throw new Error("No matching operators found");

    const stations_db = teamDoc.stations.map(
      (station) => new Station(station.station_number, station.station_name, station.requiredOperators, station.description)
    );

    const proposal = await proposaldayplan(id, stations_db, operators_db, team, shift);
    return proposal;
  } catch (error) {
    console.error("Error in findoperator:", error.message);
    throw error;
  }
}

async function proposaldayplan(id, stations, attendees, team, shift) {
  const dayStations = [];
  const dayExtra = [];
  const assignedOperators = [];

  for (let i = 0; i < stations.length; i++) {
    let operatorsNeeded = stations[i].requiredOperators;
    const operatorsForStation = [];

    for (let j = 0; j < attendees.length && operatorsNeeded > 0; j++) {
      if (
        attendees[j].stations.includes(stations[i].station_number) &&
        !assignedOperators.includes(attendees[j].name)
      ) {
        operatorsForStation.push(attendees[j].name);
        assignedOperators.push(attendees[j].name);
        operatorsNeeded--;
      }
    }

    dayStations.push(
      new DayStation(
        stations[i].station_number,
        stations[i].station_name,
        operatorsForStation.length > 0 ? operatorsForStation : null,
        null,
        stations[i].requiredOperators
      )
    );
  }

  attendees.forEach((attendee) => {
    if (!assignedOperators.includes(attendee.name)) {
      dayExtra.push(attendee.name);
    }
  });

  const dayplan = new Day(id, dayStations, dayExtra);
  return dayplan;
}

module.exports = router;