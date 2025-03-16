// workstation.js 

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
const adminMenu = document.getElementById("admin_menu");
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const logoutButton = document.getElementById("logout");

// Get stored user data from localStorage (kept in page for local use)
function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser); // Expecting { name, team, shift, role }
  }
  return null;
}

// Handle logged-in state
function loggedin(userData) {
  userName.innerText = userData.name || "Unknown";
  const teamShift = `${userData.team}-${userData.shift}`; // Construct team_shift
  teamName.innerText = `${userData.team} - Shift: ${userData.shift}`;

  // Show admin features if role is admin
  if (userData.role === "admin") {
    adminMenu.style.display = "block";
    newPlanButtonDiv.style.display = "block";
    if (newPlanButton) {
      newPlanButton.addEventListener("click", () => {
        console.log('New Plan button clicked, redirecting to /proposal');
        window.location.href = '/proposal';
      });
    }
  } else {
    adminMenu.style.display = "none";
    newPlanButtonDiv.style.display = "none";
  }

  logoutButton.onclick = logout;
  fetchStations(teamShift); // Fetch stations using constructed team_shift
}

// Clear table and form
function clear() {
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
  document.getElementById('station_number').value = '';
  document.getElementById('station_name').value = '';
  document.getElementById('description').value = '';
  document.getElementById('requiredOperators').value = '';
}

// Draw table with stations
function drawtable(stations) {
  clear();
  for (let i = 0; i < stations.length; i++) {
    const row = table.insertRow(i + 1);
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);
    const cell4 = row.insertCell(3);
    cell1.innerHTML = stations[i].station_number;
    cell2.innerHTML = stations[i].station_name;
    cell3.innerHTML = stations[i].description || "No description";
    cell4.innerHTML = stations[i].requiredOperators;
    cell1.className = "d_en_v";
    cell1.onmouseenter = function() {
      this.innerHTML = "Delete ?";
    };
    cell1.onmouseleave = function() {
      this.innerHTML = stations[i].station_number;
    };
    cell1.onclick = function() {
      deleteStation(stations[i].station_number, storedUser()?.team && storedUser()?.shift 
        ? `${storedUser().team}-${storedUser().shift}` 
        : "NoTeam-NoShift");
    };
  }
}

// Fetch stations for a team_shift
async function fetchStations(team_shift) {
  try {
    const response = await fetch('/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: team_shift }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const stations = await response.json();
    drawtable(stations);
  } catch (error) {
    console.error('Error fetching stations:', error);
  }
}

// Delete a station
async function deleteStation(station_number, team_shift) {
  if (!confirm(`Are you sure you want to delete station ${station_number}?`)) return;

  try {
    const response = await fetch('/delete-station', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number, team: team_shift }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      drawtable(data.stations);
    } else {
      alert('Failed to delete station.');
    }
  } catch (error) {
    console.error('Error deleting station:', error);
    alert('An error occurred while deleting the station.');
  }
}

// Handle form submission
document.getElementById("edit_form").addEventListener("submit", async function(e) {
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
  const team_shift = userData?.team && userData?.shift 
    ? `${userData.team}-${userData.shift}` 
    : "NoTeam-NoShift";

  const newStation = new Station(station_number, station_name, requiredOperators, description);

  if (!(await isexist_in_db(station_number, team_shift))) {
    await create_new_station(newStation, team_shift);
  } else {
    if (confirm("The station already exists. Do you want to update it?")) {
      const updateResult = await update_station_in_db(station_number, station_name, requiredOperators, description, team_shift);
      if (!updateResult.success) {
        alert('Failed to update station.');
      } 
    } 
  }
}

// Check if station exists
async function isexist_in_db(station_number, team_shift) {
  try {
    const response = await fetch('/check-station', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number, team: team_shift }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking station:', error);
    return false;
  }
}

// Create a new station
async function create_new_station(newStation, team_shift) {
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
        team_name: team_shift,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const updatedStations = await response.json();
    drawtable(updatedStations);
    return true;
  } catch (error) {
    console.error('Error creating station:', error);
    return false;
  }
}

// Update an existing station
async function update_station_in_db(station_number, station_name, requiredOperators, description, team_shift) {
  try {
    const response = await fetch('/update-station', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        station_number,
        station_name,
        requiredOperators,
        description,
        team_name: team_shift,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    drawtable(data.stations);
    return data;
  } catch (error) {
    console.error('Error updating station:', error);
    return { success: false, message: 'Failed to update station' };
  }
}

// Logout function
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

// Initialize page
window.onload = () => checkAuth(loggedin);

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});