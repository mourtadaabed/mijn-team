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
    console.error("Error generating day plan:", error.message);
    if (error.message === "Database not initialized") {
      res.status(503).json({ error: "Database unavailable, please try again later" });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

router.post("/dayplan", authenticate, async (req, res) => {
  try {
    const { dayplan, team, shift } = req.body;
    if (!dayplan || !team || !shift || !dayplan.stations) {
      return res.status(400).json({ error: "Invalid dayplan data" });
    }
    console.log("Received dayplan:", JSON.stringify(dayplan, null, 2));

    const db = getDB();
    const teamDoc = await db.collection("teams").findOne({ teamName: team });
    if (!teamDoc) return res.status(404).json({ message: "Team not found" });

    const shiftData = teamDoc.shifts.find((s) => s.name === shift);
    if (!shiftData) return res.status(404).json({ message: "Shift not found" });

    // Initialize operator_history if it doesn't exist
    if (!shiftData.operator_history) {
      shiftData.operator_history = [];
    }

    // Update operator_history for each operator in the dayplan
    for (const dayStation of dayplan.stations) {
      console.log("Processing dayStation:", dayStation);
      if (dayStation.operators && Array.isArray(dayStation.operators)) {
        for (const operatorName of dayStation.operators) {
          const operator = shiftData.operators.find((op) => op.name === operatorName);
          if (operator && operator.number) {
            let historyEntry = shiftData.operator_history.find((h) => h.number === operator.number);
            if (!historyEntry) {
              historyEntry = {
                name: operator.name,
                number: operator.number,
                stations: []
              };
              shiftData.operator_history.push(historyEntry);
            }
            // Ensure stationNumber exists and is valid
            const stationNumber = dayStation.stationNumber; // Match your DayStation model
            if (stationNumber != null) {
              // Remove existing occurrence if you don’t want duplicates
              const index = historyEntry.stations.indexOf(stationNumber);
              if (index !== -1) {
                historyEntry.stations.splice(index, 1);
                console.log(`Removed existing station ${stationNumber} from history for ${operatorName}`);
              }
              historyEntry.stations.push(stationNumber);
              console.log(`Added station ${stationNumber} to history for ${operatorName}`);
            } else {
              console.warn(`Skipping invalid stationNumber for ${operatorName}:`, stationNumber);
            }
          } else {
            console.warn(`Operator ${operatorName} not found or missing number`);
          }
        }
      }
    }

    // Update the team document with the new dayplan and operator_history
    const result = await db.collection("teams").updateOne(
      { teamName: team, "shifts.name": shift },
      {
        $set: { "shifts.$.operator_history": shiftData.operator_history },
        $push: { "shifts.$.days": dayplan }
      }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ message: "Team or shift not found" });

    res.status(200).json({ message: "Dayplan submitted successfully", operator_history: shiftData.operator_history });
  } catch (error) {
    console.error("Error in /dayplan route:", error.message);
    if (error.message === "Database not initialized") {
      res.status(503).json({ error: "Database unavailable, please try again later" });
    } else {
      res.status(500).json({ message: "Internal server error" });
    }
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

    const proposal = await proposaldayplan(id, stations_db, operators_db, shiftData.operator_history || [], team, shift);
    return proposal;
  } catch (error) {
    console.error("Error in findoperator:", error.message);
    throw error;
  }
}

async function proposaldayplan(id, stations, attendees, op_history, team, shift) {
  const dayStations = [];
  const dayExtra = [];
  const assignedOperators = [];

  console.log("Operator history for this shift:", op_history);

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
        stations[i].station_number, // Ensure this matches your model
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