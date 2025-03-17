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
    const teamDoc = await db.collection("teams").findOne({ teamName: team });
    if (!teamDoc) {
      return res.status(404).json({ error: "Team not found" });
    }

    const shiftData = teamDoc.shifts.find((s) => s.name === shift);
    if (!shiftData) {
      return res.status(404).json({ error: "Shift not found" });
    }

    shiftData.days = shiftData.days || [];
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

    shiftData.days = shiftData.days || [];
    const dayExists = shiftData.days.some((day) => day.id === dayplan.id);
    if (dayExists) {
      return res.status(409).json({ error: `Day with ID ${dayplan.id} already exists for this team and shift` });
    }

    shiftData.operator_history = shiftData.operator_history || [];

    for (const dayStation of dayplan.stations) {
      if (dayStation.operators && Array.isArray(dayStation.operators)) {
        for (const operatorName of dayStation.operators) {
          const operator = shiftData.operators.find((op) => op.name === operatorName);
          if (operator && operator.number) {
            let historyEntry = shiftData.operator_history.find((h) => h.number === operator.number);
            if (!historyEntry) {
              historyEntry = { name: operator.name, number: operator.number, stations: [] };
              shiftData.operator_history.push(historyEntry);
            }
            const stationNumber = dayStation.stationNumber;
            if (stationNumber != null) {
              const index = historyEntry.stations.indexOf(stationNumber);
              if (index !== -1) historyEntry.stations.splice(index, 1);
              historyEntry.stations.push(stationNumber);
            }
          }
        }
      }
    }

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

    return await proposaldayplan(id, stations_db, operators_db, shiftData.operator_history || [], team, shift);
  } catch (error) {
    console.error("Error in findoperator:", error.message);
    throw error;
  }
}

async function proposaldayplan(id, stations, attendees, op_history, team, shift) {
  const dayStations = [];
  const dayExtra = [];
  const assignedOperators = [];

  const new_operators = attendees.map((attendee) => {
    const history = op_history.find((h) => h.name === attendee.name);
    const stat_hist = stat_hist_maker(attendee.stations, history ? history.stations : []);
    return {
      operator_name: attendee.name,
      operator_number: attendee.number,
      stat_hist
    };
  });

  const bestassigmnt = finale_table_maker(stations, new_operators, attendees);

  // Include all stations, assigned or not
  const assignmentMap = new Map();
  if (bestassigmnt.found && bestassigmnt.combo) {
    bestassigmnt.combo.forEach(assignment => {
      if (!assignmentMap.has(assignment.task)) {
        assignmentMap.set(assignment.task, []);
      }
      assignmentMap.get(assignment.task).push(assignment.operator);
      assignedOperators.push(assignment.operator);
    });
  }

  stations.forEach((station) => {
    const stationNumber = station.station_number;
    const operatorsForStation = assignmentMap.get(stationNumber) || [];
    dayStations.push(
      new DayStation(
        station.station_number,
        station.station_name,
        operatorsForStation.length > 0 ? operatorsForStation : null,
        "",
        station.requiredOperators
      )
    );
  });

  const trainedOperators = new Set();
  attendees.forEach((attendee) => {
    if (!assignedOperators.includes(attendee.name)) {
      const trainingStation = dayStations.find(
        (station) => !attendee.stations.includes(station.stationNumber) && station.training === ""
      );
      if (trainingStation) {
        trainingStation.training = attendee.name;
        trainedOperators.add(attendee.name);
      } else {
        dayExtra.push(attendee.name);
      }
    }
  });

  return new Day(id, dayStations, dayExtra);
}

function stat_hist_maker(stat, his) {
  const stat_hist = {};
  for (const s of stat) {
    if (!his.includes(s)) stat_hist[s] = 0;
  }
  const hasElements = Object.keys(stat_hist).length > 0;
  his.forEach((h, i) => {
    stat_hist[h] = hasElements ? i + 1 : i;
  });
  return stat_hist;
}

function finale_table_maker(stat, oper, attendees) {
  const newstations = stat.map((station) => {
    const possible_operators = {};
    oper.forEach((op) => {
      if (station.station_number in op.stat_hist) {
        possible_operators[op.operator_name] = op.stat_hist[station.station_number];
      }
    });
    return {
      number: station.station_number,
      oper_req: station.requiredOperators,
      possible_operators
    };
  });
  return find_best_assignment(newstations, 0, attendees);
}

function best_possible_assignment(main_table, btc, attendees) {
  const taskOperators = main_table.map(task => ({
    number: task.number,
    oper_req: parseInt(task.oper_req),
    operators: Object.entries(task.possible_operators).map(([name, cost]) => ({ name, cost: parseInt(cost) }))
  }));

  const totalRequiredOperators = taskOperators.reduce((sum, task) => sum + task.oper_req, 0);
  const allOperators = new Set(taskOperators.flatMap(task => task.operators.map(op => op.name)));

  let adjustedTaskOperators = [...taskOperators];
  let ignoredTasks = [];

  if (allOperators.size > totalRequiredOperators) {
    let requiredOperatorsSoFar = 0;
    adjustedTaskOperators = [];
    for (const task of taskOperators) {
      requiredOperatorsSoFar += task.oper_req;
      if (requiredOperatorsSoFar <= allOperators.size) {
        adjustedTaskOperators.push(task);
      } else {
        ignoredTasks = taskOperators.slice(taskOperators.indexOf(task)).map(t => t.number);
        break;
      }
    }
  } else if (allOperators.size < totalRequiredOperators) {
    let remainingOperatorsNeeded = totalRequiredOperators - allOperators.size;
    for (let i = taskOperators.length - 1; i >= 0 && remainingOperatorsNeeded > 0; i--) {
      if (adjustedTaskOperators[i].oper_req > 0) {
        const reduction = Math.min(adjustedTaskOperators[i].oper_req, remainingOperatorsNeeded);
        adjustedTaskOperators[i].oper_req -= reduction;
        remainingOperatorsNeeded -= reduction;
        if (adjustedTaskOperators[i].oper_req === 0) {
          ignoredTasks.push(adjustedTaskOperators[i].number);
        }
      }
    }
  }

  function* generateCombinations(tasks, currentCombo = [], taskIndex = 0, currentCost = 0, usedOperators = new Set()) {
    if (currentCost > btc) return;
    if (taskIndex === tasks.length) {
      yield { combo: currentCombo, cost: currentCost };
      return;
    }
    const task = tasks[taskIndex];
    if (task.oper_req === 0) {
      yield* generateCombinations(tasks, currentCombo, taskIndex + 1, currentCost, usedOperators);
    } else if (task.oper_req === 1) {
      for (const op of task.operators) {
        if (!usedOperators.has(op.name)) {
          const newCost = currentCost + op.cost;
          if (newCost <= btc) {
            const newCombo = [...currentCombo, { task: task.number, operator: op.name, cost: op.cost }];
            const newUsedOperators = new Set(usedOperators).add(op.name);
            yield* generateCombinations(tasks, newCombo, taskIndex + 1, newCost, newUsedOperators);
          }
        }
      }
    } else if (task.oper_req === 2) {
      for (let i = 0; i < task.operators.length; i++) {
        for (let j = 0; j < task.operators.length; j++) {
          const op1 = task.operators[i];
          const op2 = task.operators[j];
          if (i !== j && !usedOperators.has(op1.name) && !usedOperators.has(op2.name)) {
            const newCost = currentCost + op1.cost + op2.cost;
            if (newCost <= btc) {
              const newCombo = [
                ...currentCombo,
                { task: task.number, operator: op1.name, cost: op1.cost },
                { task: task.number, operator: op2.name, cost: op2.cost }
              ];
              const newUsedOperators = new Set(usedOperators);
              newUsedOperators.add(op1.name);
              newUsedOperators.add(op2.name);
              yield* generateCombinations(tasks, newCombo, taskIndex + 1, newCost, newUsedOperators);
            }
          }
        }
      }
    }
  }

  const combinationIterator = generateCombinations(adjustedTaskOperators);
  let bestCombo = null;
  let bestCost = -1;
  let found = false;

  for (const { combo, cost } of combinationIterator) {
    if (combo.length > 0 && cost <= btc && cost > bestCost) {
      bestCombo = combo;
      bestCost = cost;
      found = true;
    }
  }

  return { found, combo: bestCombo, totalCost: bestCost, ignoredTasks };
}

function find_best_assignment(main_table, initialBtc = 0, attendees = []) {
  const maxBtc = initialBtc + 100;
  let btc = initialBtc;

  while (btc <= maxBtc) {
    const result = best_possible_assignment(main_table, btc, attendees);
    if (result.found || result.combo !== null) {
      return result;
    }
    btc += 1;
  }

  return { found: false, combo: null, totalCost: null, ignoredTasks: main_table.map(t => t.number) };
}

module.exports = router;