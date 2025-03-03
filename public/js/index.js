
// Class Definitions
class Station {
  constructor(station_number, station_name ,operator,requiredOperators = 1, activities) {
      this.station_number = station_number;
      this.station_name = station_name;
      this.operator = operator;
      this.activities = activities;
      this.requiredOperators =requiredOperators ;
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
    return this.stations.findIndex(station => {
        return station.station_number === station_number;
    });
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


const teamInput=document.getElementById("teamInput");

loginButton.addEventListener("click", function () {
  window.location.href = '/login';
});

let user_name ="";
let team_name="";
let shift_name="";



// Data Storage
let days = [];
// Global variable to store teams
let teams = [];

// Async function to fetch teams from server using GET
async function fetchTeams() {
    try {
        const response = await fetch('/teams', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json(); // Parse the JSON response
            teams = data; // Assign the received array of team names
            populateTeams(teams); // Populate the datalist with fetched teams
        } else {
            const errorData = await response.json(); // Try to get error details
            alert(`Error fetching teams: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while fetching the teams.');
    }

}

// Function to populate the datalist
function populateTeams(teams) {
    const datalist = document.getElementById("teams");
    datalist.innerHTML = ''; // Clear existing options
    
    // Assuming teams is an array of strings
    teams.forEach(team => {
        const option = document.createElement("option");
        option.value = team.teamName+"-"+team.shiftName;
        datalist.appendChild(option);
    });

    fetchDaysOfTeam(teams[0].teamName,teams[0].shiftName);
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
    await fetchTeams(); // Fetch teams when page loads
});

teamInput.addEventListener("change", function(event) {
  const selectedTeam = event.target.value; // Get the selected value
  if (selectedTeam) { // Only proceed if something is selected
      let team_name = selectedTeam.slice(0, 2);
      let shift_name = selectedTeam.slice(3, 4);
      fetchDaysOfTeam(team_name, shift_name);
  }
});



async function fetchDaysOfTeam(teamName, shiftName) {
   team_name=teamName;
   shift_name=shiftName;
  try {
    // Validate inputs before making the request
    if (!teamName || !shiftName) {
      throw new Error("Team name and shift name are required.");
    }

    const response = await fetch('/daysOfTeam', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamName: teamName,
        shiftName: shiftName,
      }),
    });

    if (response.ok) {
      const days = await response.json(); // Parse the JSON response (array of day names)
      populateDays(days,teamName,shiftName); // Populate the datalist with fetched days
    } else {
      const errorData = await response.json(); // Try to get error details
      alert(`Error fetching days: ${errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert(`An error occurred while fetching the days: ${error.message}`);
  }
}

// Function to populate the datalist
function populateDays(days,team_name,shift_name) {
  const datalist = document.getElementById("days");
  datalist.innerHTML = ''; // Clear existing options

  // Expecting days to be an array of strings
  days.forEach(day => {
    const option = document.createElement("option");
    option.value = day; // Directly use the string
    datalist.appendChild(option);
  });
 if(days.length>0){
  fetchOneDay(days[0],team_name,shift_name);
 }else{
  alert("no days found");
  fetchTeams();
 }
   
}

// Event Listener to choose a specific day
document.getElementById("dayInput").addEventListener("change", function (e) {
  const selectedDay = e.target.value; // Get the selected value
  if (selectedDay) { // Only proceed if something is selected
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teamName: teamName,
        shiftName: shiftName,
        day_id: day_id,
      }),
    });

    if (response.ok) {
      const dayData = await response.json(); // Parse the JSON response (single day object)
      if (!dayData) {
        throw new Error("No day data returned.");
      }
      drawTable(dayData);
    } else {
      const errorData = await response.json();
      alert(`Error fetching day: ${errorData.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error:', error);
    alert(`An error occurred while fetching the day: ${error.message}`);
  }
}



// Clear the table and reset UI
function clearTable() {
  // Reset menu background colors
  const menuItems = Array.from(document.querySelectorAll(".menu-item"));
  menuItems.forEach(item => (item.style.backgroundColor = "white"));

  // Clear table rows

  while (tab.rows.length > 0) {
    tab.deleteRow(0);
  }


  // Clear extra info and hide the container
  const extraInfo = document.getElementById("liextra");
  extraInfo.innerHTML = ''; // Clear existing options;
  const extraContainer = document.getElementById("divextra");
  extraContainer.style.display = "none";
}


// Draw the table for a specific day
function drawTable(day) {
  clearTable();
  teamname_title.textContent = team_name+"-"+shift_name;
  datum.textContent = `Dag: ${day.id.slice(4, 5)} Week: ${day.id.slice(2, 4)}`;

  // Check if any post has an opleiding
  const hasTraining = day.stations.some(station => station.training);

  // Create table header
  const headerRow = tab.insertRow(0);
  const headers = ["werkpost nummer", "werkpost", "operator"];
  if (hasTraining) headers.push("opleiding");

  headers.forEach(headerText => {
    const cell = headerRow.insertCell();
    cell.textContent = headerText;
  });

  // Populate table rows
  day.stations.forEach((station, index) => {
    const row = tab.insertRow(index + 1);
    const cells = [station.stationNumber, station.stationName, station.operator];

    if (hasTraining) cells.push(station.training);

    cells.forEach((cellText, cellIndex) => {
      const cell = row.insertCell(cellIndex);
      cell.textContent = cellText || "post niet gedekt !"; // Handle empty operator
      if (!station.operator) row.style.background = "red"; // Highlight undefended posts
    });
  });

  // Display extra operators if available
  const extraInfo = document.getElementById("liextra");
  const extraContainer = document.getElementById("divextra");
  if (day.extra.length > 0) {
    day.extra.forEach(info => {
      const listItem = document.createElement("li");
      listItem.textContent = info;
      extraInfo.appendChild(listItem);
    });
    extraContainer.style.display = "block";
  }

document.getElementById("teamInput").setAttribute('value', '');
document.getElementById("dayInput").setAttribute('value', '');
}



function storedUser() {
  // Retrieve user from localStorage
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const userData = JSON.parse(storedUser);
    return userData;
  }
  return "no user stored";    
}



async function logout() {
  try {
    // Send a request to the server to log out
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include', // Include cookies in the request
    });

    if (response.ok) {
      // Clear JWT token cookie (if applicable)
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Remove user data from localStorage
      localStorage.removeItem("user");

      // Redirect to home page
      window.location.href = '/'; 
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}



async function checkAuth() {
  try {
    const response = await fetch('/check-auth', {
      credentials: 'include', // Include cookies in the request
    });

    if (response.ok) {
      const data = await response.json();

      if (data.isAuthenticated) {
        // User is logged in
        loggedin();

      } else {
        // User is not logged in
        NOT_loggedin();
      }
    } else {
      console.error('Failed to check authentication status:', response.statusText);
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
  }
}



function NOT_loggedin() {
  menu.style.display = "none";
  loginButton.value = "Aanmelden";
  creatnewteam.style.display = "block";

  loginButton.addEventListener("click", function () {
    window.location.href = '/'; 
  });
}
 function loggedin() {
  menu.style.display = "block";
  creatnewteam.style.display = "none";

  loginButton.value = "Uitloggen";
  loginButton.onclick = logout;
  user_name = storedUser().name ;
  team_name =storedUser().shift.slice(0, 2);
  shift_name = storedUser().shift.slice(3, 4);
  userName.innerText=storedUser().name ;
  teamName.innerText=storedUser().shift; 
  document.getElementById("user_team").style.display = "block";
  teamInput.style.display = "none";
  
  fetchDaysOfTeam(team_name, shift_name);

 }




// Call checkAuth when the page loads
window.onload = checkAuth;
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    // Page was loaded from the cache, force a reload
    window.location.reload();
  }
});
