const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();
const { connectDB } = require("./utils/db");

const app = express();
app.use(express.json());
app.use(cookieParser());

// Log the path for debugging
console.log("Serving static files from:", path.join(__dirname, "../public"));
app.use(express.static(path.join(__dirname, "../public")));

// Routes
const authRoutes = require("./routes/auth");
const teamRoutes = require("./routes/teams");
const stationRoutes = require("./routes/stations");
const operatorRoutes = require("./routes/operators");
const dayplanRoutes = require("./routes/dayplan");
const shiftRoutes = require("./routes/shifts"); 
const userRoutes = require("./routes/users");

app.use("/", shiftRoutes);
app.use("/", userRoutes); 
app.use("/", authRoutes);
app.use("/", teamRoutes);
app.use("/", stationRoutes);
app.use("/", operatorRoutes);
app.use("/", dayplanRoutes);

// Frontend Routes
app.get("/", (req, res) => {
  res.sendFile("html/index.html", { root: path.join(__dirname, "../public") });
});

app.get("/operators", require("./middleware/auth"), (req, res) => {
  res.sendFile("html/operators.html", { root: path.join(__dirname, "../public") });
});

app.get("/workstations", require("./middleware/auth"), (req, res) => {
  res.sendFile("html/workstations.html", { root: path.join(__dirname, "../public") });
});

app.get("/proposal", require("./middleware/auth"), (req, res) => {
  res.sendFile("html/proposal.html", { root: path.join(__dirname, "../public") });
});

app.get("/users", require("./middleware/auth"), (req, res) => {
  res.sendFile("html/users.html", { root: path.join(__dirname, "../public") });
});

app.get("/shifts", require("./middleware/auth"), (req, res) => {
  res.sendFile("html/shifts.html", { root: path.join(__dirname, "../public") });
});

app.get("/newteam", (req, res) => {
  res.sendFile("html/newteam.html", { root: path.join(__dirname, "../public") });
});

app.get("/login", (req, res) => {
  res.sendFile("html/login.html", { root: path.join(__dirname, "../public") });
});

app.get("/notAuthorized", (req, res) => {
  res.sendFile("html/notAuthorized.html", { root: path.join(__dirname, "../public") });
});



// Contact Us Route
app.get("/contact", (req, res) => {
  res.sendFile("html/contact.html", { root: path.join(__dirname, "../public") });
});

// API Endpoint for Contact Form Submission (No Email)
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;

  // Log the contact form data
  console.log(`New contact form submission: Name: ${name}, Email: ${email}, Message: ${message}`);

  res.json({ message: "Thank you for contacting us! We will get back to you soon." });
});

// Cookie Policy Route
app.get("/cookie-policy", (req, res) => {
  res.sendFile("cookie-policy.html", { root: path.join(__dirname, "../public") });
});

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Custom 404 Handler
app.use((req, res, next) => {
  if (req.method === "GET" && !req.originalUrl.startsWith("/api")) {
    return res.status(404).sendFile("html/404.html", { root: path.join(__dirname, "../public") });
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