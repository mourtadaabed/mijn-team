// api/index.js
const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path"); // Add path module for reliable path resolution
require("dotenv").config();
const { connectDB } = require("./utils/db");

const app = express();
app.use(express.json());
app.use(cookieParser());

// Log the path for debugging
console.log("Serving static files from:", path.join(__dirname, "../public"));
app.use(express.static(path.join(__dirname, "../public"))); // Correct path to public/

// Routes
const authRoutes = require("./routes/auth");
const teamRoutes = require("./routes/teams");
const stationRoutes = require("./routes/stations");
const operatorRoutes = require("./routes/operators");
const dayplanRoutes = require("./routes/dayplan");

app.use("/", authRoutes);
app.use("/", teamRoutes);
app.use("/", stationRoutes);
app.use("/", operatorRoutes);
app.use("/", dayplanRoutes);

// Frontend Routes
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "../public") });
});

app.get("/operators", require("./middleware/auth"), (req, res) => {
  res.sendFile("operators.html", { root: path.join(__dirname, "../public") });
});

app.get("/workstations", require("./middleware/auth"), (req, res) => {
  res.sendFile("workstations.html", { root: path.join(__dirname, "../public") });
});

app.get("/proposal", require("./middleware/auth"), (req, res) => {
  res.sendFile("proposal.html", { root: path.join(__dirname, "../public") });
});

app.get("/newuser", require("./middleware/auth"), (req, res) => {
  res.sendFile("newuser.html", { root: path.join(__dirname, "../public") });
});

app.get("/newshift", require("./middleware/auth"), (req, res) => {
  res.sendFile("newshift.html", { root: path.join(__dirname, "../public") });
});

app.get("/newteam", (req, res) => {
  res.sendFile("newteam.html", { root: path.join(__dirname, "../public") });
});

app.get("/login", (req, res) => {
  res.sendFile("login.html", { root: path.join(__dirname, "../public") });
});

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Custom 404 Handler
app.use((req, res, next) => {
  if (req.method === "GET" && !req.originalUrl.startsWith("/api")) {
    return res.status(404).sendFile("404.html", { root: path.join(__dirname, "../public") });
  }
  res.status(404).json({ error: "Not Found" });
});

// Start Server
async function startServer() {
  try {
    await connectDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();