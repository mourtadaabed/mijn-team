const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const Team = require("../modules/Team");
const User = require("../modules/User");
const Shift = require("../modules/Shift");
const Station = require("../modules/Station");
const Operator = require("../modules/Operator");
const DayStation = require("../modules/DayStation");
const Day = require("../modules/Day");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public"));

const SECRET_KEY = process.env.JWT_SECRET;
const COOKIE_NAME = "jwt_token";

let db;
async function startServer() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined");
    console.log("Attempting to connect to MongoDB...");
    const client = await MongoClient.connect(uri);
    db = client.db(); // Add your DB name if needed, e.g., client.db("team")
    console.log("Connected to MongoDB Atlas");

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    console.error("Full error:", err);
    process.exit(1);
  }
}

startServer();

// Frontend Routes
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.get("/operators", authenticate, (req, res) => {
  res.sendFile("operators.html", { root: "public" });
});

app.get("/workstations", authenticate, (req, res) => {
  res.sendFile("workstations.html", { root: "public" });
});

app.get("/proposal", authenticate, (req, res) => {
  res.sendFile("proposal.html", { root: "public" });
});

app.get("/newuser", authenticate, (req, res) => {
  res.sendFile("newuser.html", { root: "public" });
});

app.get("/newshift", authenticate, (req, res) => {
  res.sendFile("newshift.html", { root: "public" });
});

app.get("/newteam", (req, res) => {
  res.sendFile("newteam.html", { root: "public" });
});

app.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "public" });
});

// API Endpoints
app.get("/teams", async (req, res) => {
  try {
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

app.post("/selectTeam", async (req, res) => {
  const { teamName, shiftName } = req.body;
  try {
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

app.post("/createTeam", async (req, res) => {
  const { admin, teamname, shift, email, password } = req.body;
  if (!admin || !teamname || !shift || !email || !password) {
    return res.status(400).json({ success: false, message: "All fields required" });
  }

  try {
    const existingTeam = await db.collection("teams").findOne({ teamName: teamname });
    if (existingTeam) {
      return res.status(400).json({ success: false, message: `Team '${teamname}' exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeam = new Team(teamname, shift);
    const newUser = new User(admin, email, hashedPassword, teamname, shift);
    await db.collection("teams").insertOne(newTeam);
    await db.collection("users").insertOne(newUser);
    res.json({ success: true, message: `Team '${teamname}' created!`, team: newTeam });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/daysOfTeam", async (req, res) => {
  try {
    const { teamName, shiftName } = req.body;
    if (!teamName || !shiftName) {
      return res.status(400).json({ success: false, message: "Team and shift required" });
    }

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

app.post("/oneDay", async (req, res) => {
  try {
    const { day_id, teamName, shiftName } = req.body;
    if (!day_id || !teamName || !shiftName) {
      return res.status(400).json({ success: false, message: "day_id, teamName, shiftName required" });
    }

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

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.collection("users").findOne({ name: username });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, username: user.name, teamname: user.teamname, shift: user.shift },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600000,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { name: user.name, teamname: user.team_shifts },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { username, password, email, teamname, shift } = req.body;
    const findUser = await db.collection("users").findOne({ name: username });
    if (findUser) return res.status(400).send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(username, email, hashedPassword, teamname, shift);

    await db.collection("users").insertOne({
      name: username,
      email,
      password: hashedPassword,
      team_shifts: [teamname + "-" + shift],
    });

    res.status(201).send("Registered successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.post("/newShift", authenticate, async (req, res) => {
  try {
    const { username, password, email, teamname, shiftname } = req.body;
    const teamShiftKey = `${teamname}-${shiftname}`;

    let findUser = await db.collection("users").findOne({ name: username });
    if (findUser) {
      if (!findUser.team_shifts.includes(teamShiftKey)) {
        await db.collection("users").updateOne(
          { _id: findUser._id },
          { $addToSet: { team_shifts: teamShiftKey } }
        );
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
      }
      return res.status(201).send("User and team updated successfully");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User(username, email, hashedPassword, teamname, shiftname);

    await db.collection("users").insertOne({
      name: username,
      email,
      password: hashedPassword,
      team_shifts: [teamShiftKey],
    });

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
      const newTeam = new Team(teamname, shiftname);
      await db.collection("teams").insertOne(newTeam);
    }

    res.status(201).send("User and shift created successfully");
  } catch (err) {
    console.error("Error:", err);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.post("/stations", authenticate, async (req, res) => {
  const { team } = req.body;
  if (!team) return res.status(400).json({ error: "Team is required" });

  try {
    const teamDocument = await db.collection("teams").findOne({ teamName: team });
    if (!teamDocument) return res.status(404).json({ error: "Team not found" });

    const stations = teamDocument.stations || [];
    res.json(stations);
  } catch (error) {
    console.error("Error fetching stations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function checkStationInDB(station_number, team_name) {
  try {
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team || !Array.isArray(team.stations)) return false;
    return team.stations.some((station) => station.station_number === station_number);
  } catch (err) {
    console.error("Error checking station:", err);
    throw err;
  }
}

app.post("/check-station", authenticate, async (req, res) => {
  try {
    const { station_number, team_name } = req.body;
    const exists = await checkStationInDB(station_number, team_name);
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/create-station", authenticate, async (req, res) => {
  try {
    const { newStation: { station_number, station_name, requiredOperators = 1, description }, team_name } = req.body;
    const result = await createNewStation(station_number, station_name, requiredOperators, description, team_name);

    if (!result.success) return res.status(400).json({ error: result.message });

    const teamDocument = await db.collection("teams").findOne({ teamName: team_name });
    const stations = teamDocument.stations || [];
    res.json(stations);
  } catch (error) {
    console.error("Error in /create-station:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function createNewStation(station_number, station_name, requiredOperators, description, team_name) {
  try {
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team) return { success: false, message: "Team not found" };

    if (!Array.isArray(team.stations)) team.stations = [];
    const exists = await checkStationInDB(station_number, team_name);
    if (exists) return { success: false, message: "Station already exists" };

    const newStation = new Station(station_number, station_name, requiredOperators, description);
    await db.collection("teams").updateOne(
      { teamName: team_name },
      { $push: { stations: newStation } }
    );

    return { success: true, message: "Station created successfully" };
  } catch (err) {
    console.error("Error creating station:", err);
    return { success: false, message: "Internal Server Error" };
  }
}

app.put("/update-station", authenticate, async (req, res) => {
  try {
    const { station_number, station_name, requiredOperators, description, team_name } = req.body;
    if (!station_number || !team_name) {
      return res.status(400).json({ error: "station_number and team_name required" });
    }

    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team) return res.status(404).json({ error: "Team not found" });

    const stationIndex = team.stations.findIndex((station) => station.station_number === station_number);
    if (stationIndex === -1) return res.status(404).json({ error: "Station not found" });

    team.stations[stationIndex] = {
      station_number,
      station_name: station_name || team.stations[stationIndex].station_name,
      requiredOperators: requiredOperators || team.stations[stationIndex].requiredOperators,
      description: description || team.stations[stationIndex].description,
    };

    await db.collection("teams").updateOne(
      { teamName: team_name },
      { $set: { stations: team.stations } }
    );

    res.status(200).json({ success: true, message: "Station updated", stations: team.stations });
  } catch (err) {
    console.error("Error updating station:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/delete-station", authenticate, async (req, res) => {
  const { station_number, team } = req.body;
  try {
    const result = await db.collection("teams").updateOne(
      { teamName: team },
      { $pull: { stations: { station_number } } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ success: false, message: "Station not found" });

    const updatedTeam = await db.collection("teams").findOne({ teamName: team });
    const updatedStations = updatedTeam.stations || [];
    res.json({ success: true, stations: updatedStations });
  } catch (error) {
    console.error("Error deleting station:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.post("/operators", authenticate, async (req, res) => {
  const { team, shift } = req.body;
  if (!team || !shift) return res.status(400).json({ error: "Team and shift required" });

  try {
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

async function checkOperatorInDB(operator_number, team_name, shift_name) {
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

app.post("/check-operator", authenticate, async (req, res) => {
  try {
    const { operator_number, team_name, shift_name } = req.body;
    const operatorData = await checkOperatorInDB(operator_number, team_name, shift_name);
    const exists = !!operatorData;
    res.json({ exists, operator: operatorData });
  } catch (error) {
    res.status(500).json({ exists: false, error: "Internal Server Error", operator: null });
  }
});

app.post("/create-operator", authenticate, async (req, res) => {
  try {
    const { newOperator: { name, number, rol }, team_name, shift_name } = req.body;
    const result = await createNewOperator(name, number, rol, team_name, shift_name);

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

async function createNewOperator(name, number, rol, team_name, shift_name) {
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

app.put("/update-operator", authenticate, async (req, res) => {
  try {
    const { number, name, rol, team_name, shift_name } = req.body;
    if (!number || !team_name || !shift_name) {
      return res.status(400).json({ error: "number, team_name, shift_name required" });
    }

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

app.delete("/delete-operator", authenticate, async (req, res) => {
  const { operator_number, team_name, shift_name } = req.body;
  try {
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

app.put("/add-station-to-operator", authenticate, async (req, res) => {
  const { station_number, operator_number, team_name, shift_name } = req.body;
  try {
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

app.delete("/delete-station-from-operator", authenticate, async (req, res) => {
  const { station_number, operator_number, team_name, shift_name } = req.body;
  try {
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

app.post("/day-plan", authenticate, async (req, res) => {
  const { attendees, id, team, shift } = req.body;
  if (!attendees || !id || !team || !shift) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const dayPlan = await findoperator(attendees, id, team, shift);
    res.status(200).json(dayPlan);
  } catch (error) {
    console.error("Error generating day plan:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function findoperator(attendees, id, team, shift) {
  try {
    if (!db) throw new Error("Database not initialized");

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
    const operatorsForStation = []; // Array to hold operators for this station

    // Assign operators to this station until we meet the required number or run out of available operators
    for (let j = 0; j < attendees.length && operatorsNeeded > 0; j++) {
      if (
        attendees[j].stations.includes(stations[i].station_number) && 
        !assignedOperators.includes(attendees[j].name)
      ) {
        operatorsForStation.push(attendees[j].name); // Add operator to this station's list
        assignedOperators.push(attendees[j].name);   // Mark operator as assigned
        operatorsNeeded--;                           // Decrease the count of needed operators
      }
    }

    // Create a single DayStation entry with all assigned operators
    dayStations.push(
      new DayStation(
        stations[i].station_number,
        stations[i].station_name,
        operatorsForStation.length > 0 ? operatorsForStation : null, // Use the array of operators, or null if none assigned
        null,
        stations[i].requiredOperators
      )
    );
  }

  // Add unassigned attendees to dayExtra
  attendees.forEach((attendee) => {
    if (!assignedOperators.includes(attendee.name)) {
      dayExtra.push(attendee.name);
    }
  });

  const dayplan = new Day(id, dayStations, dayExtra);
  return dayplan;
}

async function history_of_operator(operatorName, team, shift) {

}

app.post("/dayplan", authenticate, async (req, res) => {
  try {
    const { dayplan, team, shift } = req.body;
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

app.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  const token = req.cookies[COOKIE_NAME];
  if (token) {
    // Optionally blacklist token here if needed
  }

  res.status(200).json({ message: "Logout successful" });
});

// Authentication Middleware
function authenticate(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ isAuthenticated: false, message: "No token provided" });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(401).json({ isAuthenticated: false, message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

app.get("/check-auth", authenticate, (req, res) => {
  res.status(200).json({ isAuthenticated: true, user: req.user });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Custom 404 Handler
app.use((req, res, next) => {
  if (req.method === "GET" && !req.originalUrl.startsWith("/api")) {
    return res.status(404).sendFile("404.html", { root: "public" });
  }
  res.status(404).json({ error: "Not Found" });
});