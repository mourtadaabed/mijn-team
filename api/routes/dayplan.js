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

    // Check if the day id already exists
    const teamDoc = await db.collection("teams").findOne({ teamName: team });
    if (!teamDoc) return res.status(404).json({ error: "Team not found" });

    const shiftData = teamDoc.shifts.find((s) => s.name === shift);
    if (!shiftData) return res.status(404).json({ error: "Shift not found" });

    const dayExists = shiftData.days.some((day) => day.id === id);
    if (dayExists) {
      return res.status(409).json({ error: `Day with ID ${id} already exists for this team and shift` });
    }

    const dayPlan = await findoperator(attendees, id, team, shift, db);
    res.status(200).json(dayPlan);
  } catch (error) {
    console.error("Error generating day plan:", error.message);
    if (error.message === "Database not initialized") {
      res.status(503).json({ error: "Database unavailable, please try again later" });
    } else if (error.message.includes("already exists")) {
      res.status(409).json({ error: error.message });
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
    
    const db = getDB();
    const teamDoc = await db.collection("teams").findOne({ teamName: team });
    if (!teamDoc) return res.status(404).json({ message: "Team not found" });

    const shiftData = teamDoc.shifts.find((s) => s.name === shift);
    if (!shiftData) return res.status(404).json({ message: "Shift not found" });

    // Check if the day id already exists
    const dayExists = shiftData.days.some((day) => day.id === dayplan.id);
    if (dayExists) {
      return res.status(409).json({ error: `Day with ID ${dayplan.id} already exists for this team and shift` });
    }

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
            const stationNumber = dayStation.stationNumber;
            if (stationNumber != null) {
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
    } else if (error.message.includes("already exists")) {
      res.status(409).json({ error: error.message });
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



  //console.log(stations);
  //console.log(attendees);
  //console.log(op_history);
  

const new_operators = [];
for (let i = 0; i < attendees.length; i++) {
  
  let find = false;
    for (let j = 0; j < op_history.length; j++) {
      if (attendees[i].name===op_history[j].name){
        const stat_hist =  stat_hist_maker(attendees[i].stations,op_history[j].stations);
        new_operators.push({"operator_name":attendees[i].name,
          "operator_number":attendees[i].number,
          stat_hist
        });
        find= true;
        break;
      }
  }
    if (!find){

      const stat_hist =  stat_hist_maker(attendees[i].stations,[]);
      new_operators.push({"operator_name":attendees[i].name,
        "operator_number":attendees[i].number,
        stat_hist
    });
  }

}




finale_table_maker(stations,new_operators);


/////////////////
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

/////////////////////





  const dayplan = new Day(id, dayStations, dayExtra);
  return dayplan;
}


function stat_hist_maker(stat, his) {
  const stat_hist = {};
  
 
  for (let i = 0; i < stat.length; i++) {
      if (!his.includes(stat[i])) {
          stat_hist[stat[i]] = 0;
      }
  }
  
  
  const hasElements = Object.keys(stat_hist).length > 0;
  
 
  for (let i = 0; i < his.length; i++) {
      if (hasElements) {
          stat_hist[his[i]] = i + 1;    
      } else {
          stat_hist[his[i]] = i;        
      }
  }
  
  return stat_hist;
}

function finale_table_maker(stat, oper) {
  const newstations = [];
  console.log("*****************");
  for (let i = 0; i < stat.length; i++) {
    let newstat = {};
    newstat["number"] = stat[i].station_number;
    newstat["oper_req"] = stat[i].requiredOperators;
    let possible_operators = {};
    for (let j = 0; j < oper.length; j++) {
        if (stat[i].station_number in oper[j].stat_hist) {
          //console.log(stat[i].station_name, oper[j].operator_name, oper[j].stat_hist[stat[i].station_number]);
          possible_operators[oper[j].operator_name] = oper[j].stat_hist[stat[i].station_number];                 
      }
    }

    newstat["possible_operators"] = possible_operators;
    newstations.push(newstat);
  }
  best_possible_assignment(newstations,0);
}

function best_possible_assignment(main_table,btc) {

  console.log(btc);
  console.log(main_table);
  
}

module.exports = router;