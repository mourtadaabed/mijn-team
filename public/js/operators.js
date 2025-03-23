// Import checkAuth from checkAuth.js
import { checkAuth } from './checkAuth.js';

// Class Definitions
class Workstation {
  constructor(name, number, description) {
    this.name = name;
    this.number = number;
    this.bes = description; // Assuming 'bes' is intentional
  }
}

class Operator {
  constructor(name, number, rol = "teammember") {
    this.name = name;
    this.number = number;
    this.posten = [];
    this.rol = rol;
  }
}

// Global Variables
let activeoplist = [];
let teamleden = [];
let reserven = [];
let jobsudenten = [];
let stations = [];
let operators = [];

let user_name = storedUser()?.name || "Unknown";
let team_name = storedUser()?.team || "No Team";
let shift_name = storedUser()?.shift || "No Shift";
let role = storedUser()?.role || "teammember";

// DOM Elements
const userName = document.getElementById("username");
const teamName = document.getElementById("teamname");
const adminItems = document.querySelectorAll(".admin-item"); // Select all admin menu items
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const logoutButton = document.getElementById("logout");
const table = document.getElementById("maintable");
const form = document.getElementById("newoperator");

// Initial Setup
userName.innerText = user_name;
teamName.innerText = `${team_name}-${shift_name}`;

// Utility Functions
function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
}

// Handle Logged-In State
function loggedin(userData) {
  user_name = userData.name;
  team_name = userData.team;
  shift_name = userData.shift;
  role = userData.role;
  userName.innerText = user_name;
  teamName.innerText = `${team_name}-${shift_name}`;
  
  showAdminFeatures(userData.role);
  initializeTable(team_name, shift_name);
}

// Show Admin Features and Always Show Big Button
function showAdminFeatures(userRole) {
  // Show/hide admin menu items
  adminItems.forEach(item => {
    item.style.display = userRole === "admin" ? "inline-block" : "none";
  });
  
  // Always show the New Plan button
  newPlanButtonDiv.style.display = "block";
  
  if (newPlanButton) {
    newPlanButton.addEventListener("click", () => {
      window.location.href = '/proposal';
    });
  }
  
  logoutButton.onclick = logout;
}

// Initialize Table Data
async function initializeTable(teamName, shiftName) {
  try {
    await Promise.all([
      fetchStations(teamName),
      fetchOperators(teamName, shiftName)
    ]);
    drawtable();
  } catch (error) {
    console.error('Failed to initialize table:', error);
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

// Form Submission Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await getData(e.target);
});

async function getData(form) {
  const formData = new FormData(form);
  const { number, name, rol } = Object.fromEntries(formData);
  const newOperator = new Operator(name, number, rol);

  const result = await isexist_in_db(newOperator.number, team_name, shift_name);
  if (!result.exists) {
    await create_new_operator(newOperator, team_name, shift_name);
  } else if (confirm(`The Operator ${result.operatorName} already exists. Do you want to update them?`)) {
    await updating_operator(newOperator.number, result.operatorName, result.operatorRol);
  } else {
    console.log('Update canceled.');
    form.reset();
  }
}

// Database Interaction Functions
async function isexist_in_db(operator_number, team_name, shift_name) {
  try {
    const response = await fetch('/check-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_number, team_name, shift_name }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return {
      exists: data.exists,
      operatorName: data.operator?.name || null,
      operatorRol: data.operator?.rol || null
    };
  } catch (error) {
    console.error('Error checking operator:', error);
    return { exists: false, operatorName: null, operatorRol: null };
  }
}

async function create_new_operator(newOperator, team_name, shift_name) {
  try {
    const response = await fetch('/create-operator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newOperator: { number: newOperator.number, name: newOperator.name, rol: newOperator.rol },
        team_name,
        shift_name,
      }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const updatedOperators = await response.json();
    drawtable(updatedOperators);
    return true;
  } catch (error) {
    console.error('Error creating operator:', error);
    return false;
  }
}

async function updating_operator(number, name, rol) {
  document.getElementById("addingoperator_div").style.display = "none";
  document.getElementById("modify_div").style.display = "block";
  document.getElementById("oldname_s").innerHTML = name + " - ";
  document.getElementById("oldrol_s").innerHTML = rol;
  document.getElementById("oldnumber_s").innerHTML = "-" + number;

  const oldOperatorForm = document.getElementById("oldoperator");
  const newForm = oldOperatorForm.cloneNode(true);
  oldOperatorForm.parentNode.replaceChild(newForm, oldOperatorForm);

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await getData2(e.target, number);
    document.getElementById("addingoperator_div").style.display = "block";
    document.getElementById("modify_div").style.display = "none";
  });
}

async function getData2(form, number) {
  const formData = new FormData(form);
  const name = Object.fromEntries(formData)["name"]?.trim() || '';
  const rol = Object.fromEntries(formData)["rol"] || '';
  if (!name) {
    alert("De naam mag niet leeg zijn");
    return;
  }
  try {
    const response = await fetch('/update-operator', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, name, rol, team_name, shift_name }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const updatedOperators = await response.json();
    drawtable(updatedOperators.operators);
    return true;
  } catch (error) {
    console.error('Error updating operator:', error);
    return false;
  }
}

async function fetchOperators(teamName, shiftName) {
  try {
    const response = await fetch('/operators', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team: teamName, shift: shiftName }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const fetchedOperators = await response.json();
    if (!Array.isArray(fetchedOperators)) throw new Error('Invalid response format');
    operators = fetchedOperators;
    return operators;
  } catch (error) {
    console.error('Error fetching operators:', error);
    operators = [];
    throw error;
  }
}

async function fetchStations(teamName) {
  try {
    const response = await fetch('/stations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName }),
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    stations = await response.json();
    return stations;
  } catch (error) {
    console.error('Error fetching stations:', error);
    stations = [];
    throw error;
  }
}

// Table Drawing Functions
function clear() {
  form.reset();
  for (let i = table.rows.length - 1; i > 0; i--) {
    table.deleteRow(i);
  }
}

function drawtable(operatorslist = operators) {
  clear();
  const row1 = table.insertRow(1);
  stations.forEach((station, ix) => {
    row1.insertCell(ix).innerHTML = station.station_name;
  });

  operatorslist.forEach((operator, i) => {
    const row = table.insertRow(i + 2);
    const cell0 = row.insertCell(0);
    cell0.innerHTML = operator.name;
    cell0.className = "cell";
    cell0.title = `Click to remove operator\nName: ${operator.name} Number: ${operator.number} Rol: ${operator.rol}`;
    cell0.onmouseenter = () => cell0.innerHTML = "Delete ?";
    cell0.onmouseleave = () => cell0.innerHTML = operator.name;
    cell0.onclick = async () => {
      if (confirm(`Are you sure you want to delete: ${operator.name}? number: ${operator.number}`)) {
        try {
          const updatedOperators = await deleteOperator(operator.number, team_name, shift_name);
          operators = updatedOperators;
          drawtable(updatedOperators);
        } catch (error) {
          console.error('Deletion failed:', error);
          alert('Failed to delete operator: ' + error.message);
        }
      }
    };

    stations.forEach((station, index) => {
      const cell = row.insertCell(index + 1);
      const stationNumber = station.station_number;
      cell.innerHTML = stationNumber;
      cell.className = "cell";
      cell.title = "Click to change the status of station";
      const isAssigned = operator.stations.includes(stationNumber);

      cell.style.backgroundColor = isAssigned ? "rgb(158, 219, 185)" : "rgb(254, 65, 65)";
      cell.onclick = async () => {
        try {
          const updatedOperators = isAssigned
            ? await delete_station_from_operator(stationNumber, operator.number, team_name, shift_name)
            : await add_station_to_operator(stationNumber, operator.number, team_name, shift_name);
          operators = updatedOperators;
          drawtable(updatedOperators);
        } catch (error) {
          console.error('Action failed:', error);
          alert('Failed to update operator: ' + error.message);
        }
      };
    });
  });
}

async function add_station_to_operator(stationNumber, operatorNumber, team, shift) {
  try {
    const response = await fetch('/add-station-to-operator', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number: stationNumber, operator_number: operatorNumber, team_name: team, shift_name: shift }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to add station');
    return data.operators;
  } catch (error) {
    console.error('Error adding station:', error);
    throw error;
  }
}

async function delete_station_from_operator(stationNumber, operatorNumber, team, shift) {
  try {
    const response = await fetch('/delete-station-from-operator', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ station_number: stationNumber, operator_number: operatorNumber, team_name: team, shift_name: shift }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Failed to delete station');
    return data.operators;
  } catch (error) {
    console.error('Error deleting station:', error);
    throw error;
  }
}

async function deleteOperator(operatorNumber, teamName, shiftName) {
  try {
    const response = await fetch('/delete-operator', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator_number: operatorNumber, team_name: teamName, shift_name: shiftName }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete operator');
    return data.operators;
  } catch (error) {
    console.error('Error deleting operator:', error);
    throw error;
  }
}

// Filter Button Handlers
document.getElementById("bt-res").onclick = () => drawtable(operators.filter(op => op.rol === "reserve"));
document.getElementById("bt-tea").onclick = () => drawtable(operators.filter(op => op.rol === "teammember"));
document.getElementById("bt-job").onclick = () => drawtable(operators.filter(op => op.rol === "jobstudent"));
document.getElementById("bt-all").onclick = () => drawtable(operators);

// Page Load and Event Listeners
window.onload = () => checkAuth(loggedin);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) window.location.reload();
});
document.getElementById("addingoperator_div").setAttribute("title", "Als je de naam en/of titel wil wijzigen, geef de huidige naam in");