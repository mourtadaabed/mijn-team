const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs"); // Switch to bcryptjs
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Import your custom modules
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

// MongoDB Connection
let db;
async function startServer() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined");
    const client = await MongoClient.connect(uri);
    db = client.db(); // Add your DB name if needed, e.g., client.db("team")
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
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

// API Endpoints (keeping your original routes)
// Fetch team-shift names
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

// Select team and shift
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

// Create a new team
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

// Fetch days of a team-shift
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

// Fetch a single day
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

// Login
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

// Register
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

// Create new shift
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

// Stations Endpoints
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

// ... (rest of your routes remain the same: checkStationInDB, create-station, update-station, delete-station, operators, etc.)

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

app.use((req, res) => {
  res.status(404).sendFile("404.html", { root: "public" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));