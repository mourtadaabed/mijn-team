// proposal.js

import { checkAuth } from './checkAuth.js'; 

// Class Definitions
class DayStation {
  constructor(stationNumber, stationName, operators, requiredOperators = 1, training = "") {
    this.stationNumber = stationNumber;
    this.stationName = stationName;
    this.operators = operators; // Can be null, empty array, or array of strings
    this.training = training;
    this.requiredOperators = requiredOperators;
  }
}

class Day {
  constructor(id, stations, extra) {
    this.id = id;
    this.stations = stations;
    this.extra = extra;
  }
}

// Global Variables
let dayplan;
let copyday;
let teammembers = [];
let Reserves = [];
let Jobstudenten = [];
let attendees_list = [];

// DOM Elements
const team_title = document.getElementById("team_naam");
const team = document.getElementById("plogdiv");
const userName = document.getElementById("username");
const teamName = document.getElementById("teamname");
const teammembers_div = document.getElementById("teammembers_div");
const reserves_div = document.getElementById("reserves_div");
const jobstunds_div = document.getElementById("jobstunds_div");
const date = document.getElementById("date");
const tab = document.getElementById("maintable");
const ext_list = document.getElementById("liextra");
const aanwezigen = document.getElementById("aanwezigen-dd");

// Get stored user data from localStorage 
function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return "no user stored";
}

// Handle Logged-In State
function loggedin(userData) {
  const user_name = userData.name;
  const team_name = userData.team;
  const shift_name = userData.shift;

  team.textContent = `${team_name}-${shift_name}`;
  team_title.innerText = `${team_name}-${shift_name}`;
  userName.innerText = user_name;
  teamName.innerText = `${team_name}-${shift_name}`;

  fetchOperators(team_name, shift_name)
    .then((fetchedOperators) => {
      filter_operators(fetchedOperators);
    })
    .catch((error) => {
      console.error("Failed to fetch operators:", error);
    });
}

// Handle Not Logged-In State
function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

// Fetch Operators
async function fetchOperators(teamName, shiftName) {
  try {
    const response = await fetch("/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team: teamName, shift: shiftName }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const fetchedOperators = await response.json();
    if (!Array.isArray(fetchedOperators)) {
      throw new Error("Invalid response format: expected an array of operators");
    }

    return fetchedOperators;
  } catch (error) {
    console.error("Error fetching operators:", error);
    throw error;
  }
}

// Filter Operators into Categories
function filter_operators(operators) {
  teammembers = [];
  Reserves = [];
  Jobstudenten = [];
  for (let index = 0; index < operators.length; index++) {
    switch (operators[index].rol) {
      case "reserve":
        Reserves.push(operators[index].name);
        break;
      case "jobstudent":
        Jobstudenten.push(operators[index].name);
        break;
      default:
        teammembers.push(operators[index].name);
        break;
    }
  }

  fillmaindiv(teammembers, Reserves, Jobstudenten);
}

// Fill Main Div with Operators
function fillmaindiv(teammembers, reserves, jobstunds) {
  for (let index = 0; index < teammembers.length; index++) {
    const cb = document.createElement("input");
    const la = document.createElement("label");
    cb.setAttribute("name", teammembers[index]);
    cb.checked = true;
    cb.type = "checkbox";
    cb.setAttribute("id", teammembers[index]);
    la.innerHTML = teammembers[index];
    const br = document.createElement("br");
    cb.setAttribute("for", teammembers[index]);

    teammembers_div.appendChild(cb);
    teammembers_div.appendChild(la);
    teammembers_div.appendChild(br);
  }

  for (let index = 0; index < reserves.length; index++) {
    const cb = document.createElement("input");
    const la = document.createElement("label");
    la.innerHTML = reserves[index];
    cb.setAttribute("name", reserves[index]);
    cb.type = "checkbox";
    const br = document.createElement("br");

    reserves_div.appendChild(cb);
    reserves_div.appendChild(la);
    reserves_div.appendChild(br);
  }

  for (let index = 0; index < jobstunds.length; index++) {
    const cb = document.createElement("input");
    const la = document.createElement("label");
    la.innerHTML = jobstunds[index];
    cb.setAttribute("name", jobstunds[index]);
    cb.type = "checkbox";
    const br = document.createElement("br");

    jobstunds_div.appendChild(cb);
    jobstunds_div.appendChild(la);
    jobstunds_div.appendChild(br);
  }
}

// Validation function for 5-digit ID
function validateDayId(id) {
  const idStr = id.toString();
  return /^\d{5}$/.test(idStr);
}

// Form Submission Handler
document.getElementById("form").addEventListener("submit", function (e) {
  e.preventDefault();
  document.getElementById("proposal-div").style.display = "block";
  document.getElementById("aan_div").style.display = "none";
  getData(e.target);
});

function getData(form) {
  let id = "";
  let att = [];

  const formData = new FormData(form);
  for (const [key, value] of formData) {
    if (key === "id") {
      id = value;
    } else {
      att.push(key);
    }
  }

  if (!validateDayId(id)) {
    alert("Error: The Day ID must be exactly 5 digits (e.g., 12345).");
    document.getElementById("proposal-div").style.display = "none";
    document.getElementById("aan_div").style.display = "block";
    return;
  }

  const userData = storedUser();
  fetchAttendees(id, att, userData.team, userData.shift);
}

// Fetch Attendees and Day Plan
async function fetchAttendees(id, attendees, team, shift) {
  try {
    const payload = { id, attendees, team, shift };
    const response = await fetch("/day-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        console.log(`Error: ${errorData.error}`);
        document.getElementById("proposal-div").style.display = "none";
        document.getElementById("aan_div").style.display = "block";
        return;
      }
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.error}`);
    }

    const dp = await response.json();
    dayplan = dp;
    copyday = JSON.parse(JSON.stringify(dp)); // Deep copy of original proposal
    drawtable(dayplan);

    return { original: dayplan, copy: copyday };
  } catch (error) {
    console.error("Error fetching attendees:", error);
    throw error;
  }
}

// Find Index of Station
function index_of(p) {
  for (let index = 0; index < dayplan.stations.length; index++) {
    if (dayplan.stations[index].stationName === p) {
      return index;
    }
  }
  console.error("Post not found:", p);
  return null;
}

// Clear Table and Extra List
function clear() {
  for (let i = tab.rows.length - 1; i > 0; i--) {
    tab.deleteRow(i);
  }
  ext_list.innerHTML = "";
  date.innerText = "";
}

// Draw Table with Day Plan
function drawtable(dayplan) {
  clear();
  date.innerText = "week " + dayplan.id.slice(2, 4) + " Day " + dayplan.id.slice(4, 5);
  for (let i = 0; i < dayplan.stations.length; i++) {
    const row = tab.insertRow(i + 1);
    const cell1 = row.insertCell(0);
    const cell2 = row.insertCell(1);
    const cell3 = row.insertCell(2);
    const cell4 = row.insertCell(3);
    cell1.innerHTML = dayplan.stations[i].stationNumber;
    cell2.innerHTML = dayplan.stations[i].stationName;

    const operators = dayplan.stations[i].operators;
    if (operators && Array.isArray(operators) && operators.length > 0) {
      cell3.innerHTML = "";
      const ul = document.createElement("ul");
      operators.forEach((operator) => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = operator;
        span.style.cursor = "pointer";
        span.onclick = function (e) {
          e.stopPropagation();
          createdropdownlist(dayplan.stations[i].stationName, 3, operator);
        };
        li.appendChild(span);
        ul.appendChild(li);
      });
      cell3.appendChild(ul);
    } else {
      cell3.innerHTML = "No operators assigned";
    }

    cell3.className = "d_en_v";
    cell3.onclick = function () {
      createdropdownlist(dayplan.stations[i].stationName, 3);
    };
    cell4.innerHTML = dayplan.stations[i].training || "";
    cell4.className = "d_en_v";
    cell4.onclick = function () {
      createdropdownlist(dayplan.stations[i].stationName, 4);
      document.getElementById("dropdown-div").style.top = "100px";
    };

    if (!operators || operators.length === 0) {
      cell3.innerHTML = "post niet gedekt !";
      row.style.background = "red";
    }
  }

  for (let index = 0; index < dayplan.extra.length; index++) {
    const el = document.createElement("li");
    el.innerHTML = dayplan.extra[index];
    ext_list.appendChild(el);
  }
}

// Create Dropdown List for Operators/Training
function createdropdownlist(station, col, clickedOperator = null) {
  const bg = document.getElementById("bg_dropdown");
  const tdd = document.getElementById("tit-list-anwz");
  const niemand = document.getElementById("niemand");
  const aanwezigen = document.getElementById("aanwezigen-dd");

  if (!bg || !tdd || !niemand || !aanwezigen) {
    console.error("One or more dropdown elements not found:", { bg, tdd, niemand, aanwezigen });
    return;
  }

  niemand.onclick = function () {
    const p = index_of(station);
    if (p === null || !dayplan.stations[p]) {
      console.error("Station not found in Stations");
      return;
    }
    let clicked = col === 3 ? dayplan.stations[p].operators : dayplan.stations[p].training;
    if (col === 3 && Array.isArray(clicked)) {
      if (clicked.length > 1 && clickedOperator) {
        dayplan.stations[p].operators = clicked.filter((op) => op !== clickedOperator);
        if (clickedOperator && !dayplan.extra.includes(clickedOperator)) {
          dayplan.extra.push(clickedOperator);
        }
      } else {
        clicked.forEach((item) => {
          if (item && !dayplan.extra.includes(item)) {
            dayplan.extra.push(item);
          }
        });
        dayplan.stations[p].operators = [];
      }
    } else if (clicked && !dayplan.extra.includes(clicked)) {
      dayplan.extra.push(clicked);
      dayplan.stations[p].training = "";
    }
    bg.style.display = "none";
    clear();
    drawtable(dayplan);
  };

  bg.onclick = function () {
    bg.style.display = "none";
  };

  tdd.innerHTML = station;
  aanwezigen.innerHTML = "";
  bg.style.display = "block";

  const ol = document.createElement("ol");
  for (let index = 0; index < dayplan.extra.length; index++) {
    const li = document.createElement("li");
    li.className = "li-elemt";
    li.innerHTML = dayplan.extra[index];
    ol.appendChild(li);
    li.onclick = function () {
      bg.style.display = "none";
      const p = index_of(station);
      if (p === null || !dayplan.stations[p]) {
        console.error("Post not found in dag.posten");
        return;
      }

      if (col === 3) {
        let operators = dayplan.stations[p].operators || [];
        if (!Array.isArray(operators)) {
          operators = operators ? [operators] : [];
        }

        if (operators.length < dayplan.stations[p].requiredOperators && !clickedOperator) {
          if (!operators.includes(dayplan.extra[index])) {
            operators.push(dayplan.extra[index]);
          }
        } else if (clickedOperator) {
          if (clickedOperator && !dayplan.extra.includes(clickedOperator)) {
            dayplan.extra.push(clickedOperator);
          }
          operators = operators.filter((op) => op !== clickedOperator);
          if (!operators.includes(dayplan.extra[index])) {
            operators.push(dayplan.extra[index]);
          }
        } else {
          console.warn(`Cannot add operator to ${station}: limit reached, click an operator to replace`);
          return;
        }
        dayplan.stations[p].operators = operators;
      } else {
        let clicked = dayplan.stations[p].training;
        if (clicked && !dayplan.extra.includes(clicked)) {
          dayplan.extra.push(clicked);
        }
        dayplan.stations[p].training = dayplan.extra[index];
      }

      dayplan.extra = dayplan.extra.filter((item) => item !== dayplan.extra[index]);
      drawtable(dayplan);
    };
  }
  aanwezigen.appendChild(ol);
}

// Confirm and Save Day Plan
document.getElementById("bev").addEventListener("click", bevestigen);

async function bevestigen() {
  try {
    const userData = storedUser();
    await fetchDayplan(dayplan, userData.team, userData.shift);
    window.location.href = "/";
  } catch (error) {
    console.error("Error in bevestigen:", error);
  }
}

async function fetchDayplan(dp, team, shift) {
  try {
    const payload = { dayplan: dp, team, shift };
    const response = await fetch("/dayplan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        console.log(`Error: ${errorData.error}`);
        return;
      }
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dayplan:", error);
    throw error;
  }
}

// Logout Function
async function logout() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      localStorage.removeItem("user");
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/";
    } else {
      console.error("Logout failed:", response.statusText);
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

// Reset to Original Proposal on "Ververs" Click
document.getElementById("ver").addEventListener("click", function () {
  if (copyday) {
    console.log("Resetting to copyday:", copyday); // Debug: Check copyday content
    dayplan = JSON.parse(JSON.stringify(copyday)); // Reset to original proposal
    drawtable(dayplan);
  } else {
    console.error("No original proposal available to revert to.");
    alert("Geen origineel voorstel beschikbaar om te herstellen.");
  }
});

// Initialize Page
window.onload = () => checkAuth(loggedin, NOT_loggedin);

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});

document.getElementById("logout").addEventListener("click", logout);