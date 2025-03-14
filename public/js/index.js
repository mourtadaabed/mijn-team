// Class Definitions
class Station {
  constructor(station_number, station_name, operator, requiredOperators = 1, activities) {
    this.station_number = station_number;
    this.station_name = station_name;
    this.operator = operator;
    this.activities = activities;
    this.requiredOperators = requiredOperators;
  }
}

class Day {
  constructor(name, stations, opleiding, extra) {
    this.name = name;
    this.stations = stations;
    this.extra = extra;
    this.opleiding = opleiding;
  }

  indexOfStation(station_number) {
    return this.stations.findIndex(station => station.station_number === station_number);
  }
}

// DOM Elements
const ex = document.getElementById("liextra");
const tab = document.getElementById("maintable");
const teamname_title = document.getElementById("team_name");
const datum = document.getElementById("date");
const divextra = document.getElementById("divextra");
const loginButton = document.getElementById("login");
const menu = document.getElementById("menu");
const creatnewteam = document.getElementById("newteam");
const chooseTeam = document.getElementById("chooseTeam");
const userName = document.getElementById("usernameDisplay");
const teamName = document.getElementById("teamname");
const teamInput = document.getElementById("teamInput");

let user_name = "";
let team_name = "";
let shift_name = "";

// Data Storage
let days = [];
let teams = [];

async function fetchTeams() {
  try {
    const response = await fetch('/teams', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      teams = data;
      populateTeams(teams);
    } else {
      const errorData = await response.json();
      console.log(`Error fetching teams: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
    console.log('An error occurred while fetching the teams.');
  }
}

function populateTeams(teams) {
  const datalist = document.getElementById("teams");
  datalist.innerHTML = '';
  teams.forEach(team => {
    const option = document.createElement("option");
    option.value = team.teamName + "-" + team.shiftName;
    datalist.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchTeams();

  // Add event listener for New Plan button
  const newPlanButton = document.querySelector("#new_plan_button .big-button");
  if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
      window.location.href = '/proposal';
    });
  } else {
    console.log("New Plan button not found in DOM");
  }
});

teamInput.addEventListener("change", function(event) {
  const selectedTeam = event.target.value;
  if (selectedTeam) {
    let team_name = selectedTeam.slice(0, 2);
    let shift_name = selectedTeam.slice(3, 4);
    fetchDaysOfTeam(team_name, shift_name);
  }
});

async function fetchDaysOfTeam(teamName, shiftName) {
  team_name = teamName;
  shift_name = shiftName;
  try {
    if (!teamName || !shiftName) {
      throw new Error("Team name and shift name are required.");
    }
    const response = await fetch('/daysOfTeam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, shiftName }),
    });

    if (response.ok) {
      const days = await response.json();
      populateDays(days, teamName, shiftName);
    } else {
      const errorData = await response.json();
      console.log(`Error fetching days: ${errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
    console.log(`An error occurred while fetching the days: ${error.message}`);
  }
}

function populateDays(days, team_name, shift_name) {
  const datalist = document.getElementById("days");
  datalist.innerHTML = '';
  days.forEach(day => {
    const option = document.createElement("option");
    option.value = day;
    datalist.appendChild(option);
  });
}

document.getElementById("dayInput").addEventListener("change", function (e) {
  const selectedDay = e.target.value;
  if (selectedDay) {
    fetchOneDay(selectedDay, team_name, shift_name);
  }
});

async function fetchOneDay(day_id, teamName, shiftName) {
  try {
    if (!teamName || !shiftName || !day_id) {
      throw new Error("day_id, teamName, and shiftName are required.");
    }
    const response = await fetch('/oneDay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, shiftName, day_id }),
    });

    if (response.ok) {
      const dayData = await response.json();
      if (!dayData) throw new Error("No day data returned.");
      drawTable(dayData);
    } else {
      const errorData = await response.json();
      console.log(`Error fetching day: ${errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
    console.log(`An error occurred while fetching the day: ${error.message}`);
  }
}

function clearTable() {
  const menuItems = Array.from(document.querySelectorAll(".menu-item"));
  menuItems.forEach(item => (item.style.backgroundColor = "white"));
  while (tab.rows.length > 0) {
    tab.deleteRow(0);
  }
  const extraContainer = document.getElementById("divextra");
  extraContainer.style.display = "none";
  const liextra = document.getElementById("liextra");
  liextra.innerHTML = '';
}

function drawTable(day) {
  clearTable();
  datum.textContent = "week " + day.id.slice(2, 4) + " Day " + day.id.slice(4, 5);
  teamname_title.textContent = team_name + "-" + shift_name;

  const headerRow = tab.insertRow(0);
  const headers = ["werkpost nummer", "werkpost", "operator", "opleiding"];
  headers.forEach(headerText => {
    const cell = headerRow.insertCell();
    cell.textContent = headerText;
  });

  for (let i = 0; i < day.stations.length; i++) {
    var row = tab.insertRow(i + 1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);

    cell1.innerHTML = day.stations[i].stationNumber;
    cell2.innerHTML = day.stations[i].stationName;

    if (day.stations[i].operators && Array.isArray(day.stations[i].operators)) {
      cell3.innerHTML = "";
      const ul = document.createElement("ul");
      day.stations[i].operators.forEach(operator => {
        const li = document.createElement("li");
        li.textContent = operator;
        ul.appendChild(li);
      });
      cell3.appendChild(ul);
    } else {
      cell3.innerHTML = "No operators assigned";
    }

    cell4.innerHTML = day.stations[i].training || "";

    if (day.stations[i].operators == null || day.stations[i].operators.length === 0) {
      cell3.innerHTML = "post niet gedekt !";
      row.style.background = "red";
    }
  }

  const extraInfo = document.getElementById("liextra");
  const extraContainer = document.getElementById("divextra");
  extraInfo.innerHTML = "";

  for (let index = 0; index < day.extra.length; index++) {
    let el = document.createElement("li");
    el.innerHTML = day.extra[index];
    extraInfo.appendChild(el);
  }

  if (day.extra.length > 0) {
    extraContainer.style.display = "block";
  } else {
    extraContainer.style.display = "none";
  }
}

function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return "no user stored";
}

async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("user");
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

async function checkAuth() {
  console.log('Checking auth status...');
  try {
    const response = await fetch('/check-auth', {
      method: 'GET', // Explicitly specify method
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Auth response:', data);
      if (data.isAuthenticated) {
        console.log('User is authenticated, running loggedin()');
        loggedin();
      } else {
        console.log('User is not authenticated, running NOT_loggedin()');
        NOT_loggedin();
      }
    } else {
      console.log('Failed to check auth:', response.statusText);
      NOT_loggedin();
    }
  } catch (error) {
    console.log('Error checking auth:', error);
    NOT_loggedin();
  }
}

function NOT_loggedin() {
  console.log('Running NOT_loggedin()');
  menu.style.display = "none";
  loginButton.value = "Aanmelden";
  creatnewteam.style.display = "block";
  document.getElementById("user_team").style.display = "none";
  document.getElementById("admin_menu").style.display = "none";
  document.getElementById("new_plan_button").style.display = "none";

  // Remove existing listeners to avoid duplicates
  loginButton.removeEventListener("click", loginHandler);
  loginButton.addEventListener("click", loginHandler);
}

function loginHandler() {
  console.log('Login button clicked, redirecting to /login');
  window.location.href = '/login';
}

function loggedin() {
  console.log('Running loggedin()');
  menu.style.display = "block";
  creatnewteam.style.display = "none";
  loginButton.value = "Uitloggen";
  loginButton.onclick = logout;
  user_name = storedUser().name;
  team_name = storedUser().shift.slice(0, 2);
  shift_name = storedUser().shift.slice(3, 4);
  userName.innerText = storedUser().name;
  teamName.innerText = storedUser().shift;
  document.getElementById("user_team").style.display = "block";
  teamInput.style.display = "none";
  document.getElementById("admin_menu").style.display = "block";
  document.getElementById("new_plan_button").style.display = "block";

  fetchDaysOfTeam(team_name, shift_name);
}

// Call checkAuth when the page loads
window.onload = checkAuth;
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});