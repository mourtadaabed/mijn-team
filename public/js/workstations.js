// Import checkAuth from checkAuth.js
import { checkAuth } from './checkAuth.js';

// Class Definitions
class Station {
  constructor(station_number, station_name, requiredOperators = 1, description) {
    this.station_number = station_number;
    this.station_name = station_name;
    this.description = description;
    this.requiredOperators = requiredOperators;
  }
}

// DOM Elements
const table = document.getElementById("maintable");
const userName = document.getElementById("username");
const teamName = document.getElementById("teamname");
const menu = document.getElementById("menu");
const adminLinks = document.getElementsByClassName("admin-link");
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const logoutButton = document.getElementById("logout");

// Utility Functions
function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null; // Expecting { name, team, shift, role }
}

// Handle Logged-In State
function loggedin(userData) {
  userName.innerText = userData.name || "Unknown";
  const team_n = userData.team;
  teamName.innerText = `${userData.team} - Shift: ${userData.shift}`;

  // Show/hide admin links based on role
  const isAdmin = userData.role === "admin";
  for (let link of adminLinks) {
    link.style.display = isAdmin ? "inline" : "none";
  }
  
  newPlanButtonDiv.style.display = "block";
  
  if (newPlanButton) {
    newPlanButton.addEventListener("click", () => {
      console.log('New Plan button clicked, redirecting to /proposal');
      window.location.href = '/proposal';
    });
  }

  logoutButton.onclick = logout;
  fetchStations(team_n);
}

// Clear Table and Form
function clear() {
  while (table.rows.length > 1) table.deleteRow(1);
  document.getElementById('station_number').value = '';
  document.getElementById('station_name').value = '';
  document.getElementById('description').value = '';
  document.getElementById('requiredOperators').value = '';
}

// Draw Table with Stations
function drawtable(stations) {
  clear();
  stations.forEach((station, i) => {
    const row = table.insertRow(i + 1);
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);
    const cell4 = row.insertCell(3);
    
    cell1.innerHTML = station.station_number;
    cell2.innerHTML = station.station_name;
    cell3.innerHTML = station.description || "No description";
    cell4.innerHTML = station.requiredOperators;
    
    cell1.className = "d_en_v";
    cell1.onmouseenter = () => cell1.innerHTML = "Update?";
    cell1.onmouseleave = () => cell1.innerHTML = station.station_number;
    cell1.onclick = () => showUpdateModal(station);
  });
}

// Add modal handling functions
function showUpdateModal(station) {
  const modal = document.getElementById("stationModal");
  const closeBtn = modal.querySelector(".close");
  const updateForm = document.getElementById("updateForm");
  
  // Fill form with current station data
  document.getElementById("modal_station_number").value = station.station_number;
  document.getElementById("modal_station_name").value = station.station_name;
  document.getElementById("modal_requiredOperators").value = station.requiredOperators;
  document.getElementById("modal_description").value = station.description || "";
  
  modal.style.display = "block";
  
  // Close modal when clicking X
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };
  
  // Close modal when clicking outside
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
  
  // Handle update form submission
  updateForm.onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(updateForm);
    const station_number = formData.get("modal_station_number");
    const station_name = formData.get("modal_station_name");
    const requiredOperators = formData.get("modal_requiredOperators");
    const description = formData.get("modal_description");
    const teamName = storedUser().team;
    
    const result = await update_station_in_db(station_number, station_name, requiredOperators, description, teamName);
    if (result.success) {
      modal.style.display = "none";
    }
  };
  
  // Handle delete button
  document.getElementById("deleteStationBtn").onclick = async () => {
    const station_number = document.getElementById("modal_station_number").value;
    const teamName = storedUser().team;
    await deleteStation(station_number, teamName);
    modal.style.display = "none";
  };
}


// Fetch Stations
async function fetchStations(team_n) {
  try {
    const response = await fetch('/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: team_n }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const stations = await response.json();
    drawtable(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
  }
}

// Delete Station
async function deleteStation(station_number, teamName) {
  if (!confirm(`Are you sure you want to delete station ${station_number}?`)) return;
  
  try {
    const response = await fetch('/delete-station', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number, teamName }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    if (data.success) drawtable(data.stations);
    else alert('Failed to delete station.');
  } catch (error) {
    console.error('Error deleting station:', error);
    alert('An error occurred while deleting the station.');
  }
}

// Handle Form Submission
document.getElementById("edit_form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await getData(e.target);
});

async function getData(form) {
  const formData = new FormData(form);
  const station_number = formData.get("station_number");
  const station_name = formData.get("station_name");
  const description = formData.get("description");
  const requiredOperators = formData.get("requiredOperators") || 1;
  const userData = storedUser();
  const teamName = userData.team;

  const newStation = new Station(station_number, station_name, requiredOperators, description);

  // Check if station exists
  if (await isexist_in_db(station_number, teamName)) {
    alert(`Station ${station_number} already exists! Please use a different station number.`);
    form.reset(); // Reset the form
    return;
  }

  // If it doesn't exist, create new station
  await create_new_station(newStation, teamName);
  form.reset(); // Reset form after successful creation
}

// Check Station Existence
async function isexist_in_db(station_number, teamName) {
  try {
    const response = await fetch('/check-station', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number, teamName }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking station:', error);
    return false;
  }
}

// Create New Station (no changes needed here, but keeping it for reference)
async function create_new_station(newStation, teamName) {
  try {
    const response = await fetch('/create-station', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newStation: {
          station_number: newStation.station_number,
          station_name: newStation.station_name,
          requiredOperators: newStation.requiredOperators,
          description: newStation.description,
        },
        teamName,
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const updatedStations = await response.json();
    drawtable(updatedStations);
    return true;
  } catch (error) {
    console.error('Error creating station:', error);
    return false;
  }
}

// Update Station
async function update_station_in_db(station_number, station_name, requiredOperators, description, teamName) {
  try {
    const response = await fetch('/update-station', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number, station_name, requiredOperators, description, teamName }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    drawtable(data.stations);
    return { success: true, stations: data.stations };
  } catch (error) {
    console.error('Error updating station:', error);
    alert('Failed to update station');
    return { success: false, message: 'Failed to update station' };
  }
}

// Logout Function
async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) {
      localStorage.removeItem("user");
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Handle Not Logged In
function notLoggedIn() {
  window.location.href = '/login';
}

// Page Initialization
window.onload = () => checkAuth(loggedin, notLoggedIn);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) checkAuth(loggedin, notLoggedIn);
});