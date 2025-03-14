class DayStation {
  constructor(stationNumber, stationName, operators, requiredOperators = 1, training = "") {
    this.stationNumber = stationNumber;
    this.stationName = stationName;
    this.operators = operators;
    this.training = training;
    this.requiredOperators = requiredOperators;
  }
}

class Day {
  constructor(id, stations, extra) {
    this.id = id;
    this.stations = stations; // a list that contains DayStation objects
    this.extra = extra; // a list that contains names (strings)
  }
}

let dayplan;
let copyday;
var date = "";
let teammembers = [];
let Reserves = [];
let Jobstudenten = [];
let attendees_list = [];

let user_name = storedUser().name;
let team_name = storedUser().shift.slice(0, 2);
let shift_name = storedUser().shift.slice(3, 4);
let team_title = document.getElementById("team_naam");
let team = document.getElementById("plogdiv");
team.textContent = team_name + "-" + shift_name;
let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
team_title.innerText = team_name + "-" + shift_name;
userName.innerText = user_name;
teamName.innerText = team_name + "-" + shift_name;

let teammembers_div = document.getElementById("teammembers_div");
let reserves_div = document.getElementById("reserves_div");
let jobstunds_div = document.getElementById("jobstunds_div");
var date = document.getElementById("date");
var tab = document.getElementById("maintable");
var ext_list = document.getElementById("liextra");
var aanwezigen = document.getElementById("aanwezigen-dd");

fetchOperators(team_name, shift_name)
  .then((fetchedOperators) => {
    filter_operators(fetchedOperators);
  })
  .catch((error) => {
    console.error("Failed to fetch operators:", error);
    console.log("Failed to load operators. Please try again later.");
  });

async function fetchOperators(teamName, shiftName) {
  try {
    const response = await fetch("/operators", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        team: teamName,
        shift: shiftName,
      }),
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
    const la = document.createElement("label"); // Fixed typo from "lable" to "label"
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
    const la = document.createElement("label"); // Fixed typo from "lable" to "label"
    la.innerHTML = jobstunds[index];
    cb.setAttribute("name", jobstunds[index]);
    cb.type = "checkbox";
    const br = document.createElement("br");

    jobstunds_div.appendChild(cb);
    jobstunds_div.appendChild(la);
    jobstunds_div.appendChild(br);
  }
}


//  validation function for 5-digit ID
function validateDayId(id) {
  const idStr = id.toString(); // Convert to string in case it's a number
  const isFiveDigits = /^\d{5}$/.test(idStr); // Regex: exactly 5 digits
  return isFiveDigits;
}


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
// Validate the ID before proceeding
if (!validateDayId(id)) {
  alert("Error: The Day ID must be exactly 5 digits (e.g., 12345).");
  document.getElementById("proposal-div").style.display = "none";
  document.getElementById("aan_div").style.display = "block";
  return; // Stop further processing
}
  fetchAttendees(id, att, team_name, shift_name);
}

async function fetchAttendees(id, attendees, team, shift) {
  let dp;

  try {
    const payload = {
      id: id,
      attendees: attendees,
      team: team,
      shift: shift,
    };

    const response = await fetch("/day-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        console.log(`Error: ${errorData.error}`); // Show error if ID already exists
        document.getElementById("proposal-div").style.display = "none";
        document.getElementById("aan_div").style.display = "block";
        return;
      }
      throw new Error(`HTTP error! Status: ${response.status} - ${errorData.error}`);
    }

    dp = await response.json();
    dayplan = dp;
    copyday = JSON.parse(JSON.stringify(dp)); // Deep copy
    drawtable(dayplan);

    return { original: dayplan, copy: copyday };
  } catch (error) {
    console.error("Error fetching attendees:", error);
    console.log("An error occurred while fetching the day plan. Please try again.");
    throw error;
  }
}

function index_of(p) {
  for (let index = 0; index < dayplan.stations.length; index++) {
    if (dayplan.stations[index].stationName === p) {
      return index;
    }
  }
  console.error("Post not found:", p);
  return null;
}

function clear() {
  for (let i = tab.rows.length - 1; i > 0; i--) {
    tab.deleteRow(i);
  }
  ext_list.innerHTML = "";
  date.innerText = "";
}

function drawtable(dayplan) {
  clear();
  date.innerText = "week " + dayplan.id.slice(2, 4) + " Day " + dayplan.id.slice(4, 5);
  for (let i = 0; i < dayplan.stations.length; i++) {
    var row = tab.insertRow(i + 1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    cell1.innerHTML = dayplan.stations[i].stationNumber;
    cell2.innerHTML = dayplan.stations[i].stationName;

    if (dayplan.stations[i].operators && Array.isArray(dayplan.stations[i].operators)) {
      cell3.innerHTML = "";
      const ul = document.createElement("ul");
      dayplan.stations[i].operators.forEach((operator) => {
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

    cell3.setAttribute("class", "d_en_v");
    cell3.onclick = function () {
      createdropdownlist(dayplan.stations[i].stationName, 3);
    };
    cell4.innerHTML = dayplan.stations[i].training;
    cell4.setAttribute("class", "d_en_v");

    cell4.onclick = function () {
      createdropdownlist(dayplan.stations[i].stationName, 4);
      document.getElementById("dropdown-div").style.top = "100px";
    };
    if (dayplan.stations[i].operators == null || dayplan.stations[i].operators.length === 0) {
      cell3.innerHTML = "post niet gedekt !";
      row.style.background = "red";
    }
  }

  for (let index = 0; index < dayplan.extra.length; index++) {
    let el = document.createElement("li");
    el.innerHTML = dayplan.extra[index];
    ext_list.appendChild(el);
  }
}

function createdropdownlist(station, col, clickedOperator = null) {
  let bg = document.getElementById("bg_dropdown");
  let tdd = document.getElementById("tit-list-anwz");
  let niemand = document.getElementById("niemand");
  let aanwezigen = document.getElementById("aanwezigen-dd");

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
    let li = document.createElement("li");
    li.setAttribute("class", "li-elemt");
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
        let operators = dayplan.stations[p].operators;
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

document.getElementById("bev").addEventListener("click", bevestigen);

async function bevestigen() {
  try {
    await fetchDayplan(dayplan, team_name, shift_name);
    window.location.href = "/";
  } catch (error) {
    console.error("Error in bevestigen:", error);
    console.log("An error occurred while saving the day plan. Please try again.");
  }
}

async function fetchDayplan(dp, team, shift) {
  try {
    const payload = { dayplan: dp, team, shift };

    const response = await fetch("/dayplan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        console.log(`Error: ${errorData.error}`); // Show error if ID already exists
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

async function checkAuth() {
  try {
    const response = await fetch("/check-auth", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.isAuthenticated) {
        console.log("User is not authenticated. Redirecting to login page...");
        window.location.href = "/login";
      }
    } else {
      const errorData = await response.json();
      console.error("Authentication check failed:", errorData.message);
      if (response.status === 401) {
        console.log("No token provided or token is invalid. Redirecting to login page...");
        window.location.href = "/login";
      }
    }
  } catch (error) {
    console.error("Error checking authentication status:", error);
    window.location.href = "/login";
  }
}

function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const userData = JSON.parse(storedUser);
    return userData;
  }
  return "no user stored";
}

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

window.onload = checkAuth;

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});

document.getElementById("logout").addEventListener("click", logout);