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
const userName = document.getElementById("usernameDisplay");
const teamName = document.getElementById("teamname");
const teamInput = document.getElementById("teamInput");
const usersLink = document.getElementById("users-link");
const shiftsLink = document.getElementById("shifts-link");

let user_name = "";
let team_name = "";
let shift_name = "";
let teams = []; // Declare teams globally

async function fetchTeams() {
  try {
    const response = await fetch('/teams', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      teams = data; // Assign to global variable
      populateTeams(teams);
    } else {
      const errorData = await response.json();
      console.log(`Error fetching teams: ${errorData.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
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
  const newPlanButton = document.querySelector("#new_plan_button .big-button");
  if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
      window.location.href = '/proposal';
    });
  } 
});

teamInput.addEventListener("change", function(event) {
  const selectedTeam = event.target.value;
  if (selectedTeam) {
    let team_name = selectedTeam.split('-')[0];
    let shift_name = selectedTeam.split('-')[1];
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
  const userData = JSON.parse(localStorage.getItem('user')) || {};
  const { name = '', team = '', shift = '', role = '' } = userData;
  const team_shift = team + '-' + shift;
  try {
    const response = await fetch('/verify-user', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, team_shift, role })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isValid) {
        loggedin();
      } else {
        NOT_loggedin();
      }
    } else {
      console.log('Failed to verify user:', response.statusText);
      NOT_loggedin();
    }
  } catch (error) {
    console.log('Error verifying user:', error);
    NOT_loggedin();
  }
}

function NOT_loggedin() {
  menu.style.display = "none";
  loginButton.value = "Aanmelden";
  creatnewteam.style.display = "block";
  document.getElementById("user_team").style.display = "none";
  usersLink.style.display = "none";
  shiftsLink.style.display = "none";
  document.getElementById("new_plan_button").style.display = "none";

  loginButton.removeEventListener("click", loginHandler);
  loginButton.addEventListener("click", loginHandler);
}

function loginHandler() {
  window.location.href = '/login';
}

function loggedin() {
  menu.style.display = "block";
  creatnewteam.style.display = "none";
  loginButton.value = "Uitloggen";
  loginButton.onclick = logout;

  const userData = storedUser();
  if (userData === "no user stored") {
    NOT_loggedin();
    return;
  }

  user_name = userData.name;
  team_name = userData.team;
  shift_name = userData.shift;
  const teamShift = `${team_name}-${shift_name}`;

  userName.innerText = userData.name;
  teamName.innerText = teamShift;
  document.getElementById("user_team").style.display = "block";
  teamInput.style.display = "none";
  
  // Show admin items only if user has admin role
  if (userData.role === 'admin') {
    usersLink.style.display = "inline";
    shiftsLink.style.display = "inline";
  }
  document.getElementById("new_plan_button").style.display = "block";

  fetchDaysOfTeam(team_name, shift_name);
}

window.onload = checkAuth;
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});