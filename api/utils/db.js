// api/utils/db.js
const { MongoClient } = require("mongodb");
require("dotenv").config();

let db;

async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not defined");
    console.log("Attempting to connect to MongoDB...");
    const client = await MongoClient.connect(uri);
    db = client.db(); // Add your DB name if needed, e.g., client.db("team")
    console.log("Connected to MongoDB Atlas");
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    throw err;
  }
}

function getDB() {
  if (!db) throw new Error("Database not initialized");
  return db;
}

module.exports = { connectDB, getDB };