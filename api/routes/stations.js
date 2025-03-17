// api/routes/stations.js
const express = require("express");
const router = express.Router();
const { getDB } = require("../utils/db");
const Station = require("../../modules/Station");
const authenticate = require("../middleware/auth");

router.post("/stations", authenticate, async (req, res) => {
  const { teamName } = req.body;
  if (!teamName) return res.status(400).json({ error: "Team is required" });

  try {
    const db = getDB();
    const teamDocument = await db.collection("teams").findOne({ teamName: teamName });
    if (!teamDocument) return res.status(404).json({ error: "Team not found" });
    const stations = teamDocument.stations || [];
    res.json(stations);
  } catch (error) {
    console.error("Error fetching stations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/check-station", authenticate, async (req, res) => {
  try {
    const { station_number, teamName } = req.body;
    const db = getDB();
    const exists = await checkStationInDB(station_number, teamName, db);
    res.json({ exists });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/create-station", authenticate, async (req, res) => {
  try {
    const { newStation: { station_number, station_name, requiredOperators = 1, description }, teamName } = req.body;
    const db = getDB();
    const result = await createNewStation(station_number, station_name, requiredOperators, description, teamName, db);

    if (!result.success) return res.status(400).json({ error: result.message });

    const teamDocument = await db.collection("teams").findOne({ teamName: teamName });
    const stations = teamDocument.stations || [];
    res.json(stations);
  } catch (error) {
    console.error("Error in /create-station:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/update-station", authenticate, async (req, res) => {
  try {
    const { station_number, station_name, requiredOperators, description, teamName } = req.body;
    if (!station_number || !teamName) {
      return res.status(400).json({ error: "station_number and team_name required" });
    }

    const db = getDB();
    const team = await db.collection("teams").findOne({ teamName: teamName });
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
      { teamName: teamName },
      { $set: { stations: team.stations } }
    );

    res.status(200).json({ success: true, message: "Station updated", stations: team.stations });
  } catch (err) {
    console.error("Error updating station:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/delete-station", authenticate, async (req, res) => {
  console.log(req.body);
  const { station_number, teamName } = req.body;
  try {
    const db = getDB();
    const result = await db.collection("teams").updateOne(
      { teamName: teamName },
      { $pull: { stations: { station_number } } }
    );

    if (result.modifiedCount === 0) return res.status(404).json({ success: false, message: "Station not found" });

    const updatedTeam = await db.collection("teams").findOne({ teamName: teamName });
    const updatedStations = updatedTeam.stations || [];
    res.json({ success: true, stations: updatedStations });
  } catch (error) {
    console.error("Error deleting station:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

async function checkStationInDB(station_number, teamName, db) {
  try {
    const team = await db.collection("teams").findOne({ teamName: teamName });
    if (!team || !Array.isArray(team.stations)) return false;
    return team.stations.some((station) => station.station_number === station_number);
  } catch (err) {
    console.error("Error checking station:", err);
    throw err;
  }
}

async function createNewStation(station_number, station_name, requiredOperators, description, team_name, db) {
  try {
    const team = await db.collection("teams").findOne({ teamName: team_name });
    if (!team) return { success: false, message: "Team not found" };

    if (!Array.isArray(team.stations)) team.stations = [];
    const exists = await checkStationInDB(station_number, team_name, db);
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

module.exports = router;