
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

  const extraContainer = document.getElementById("divextra");
  extraContainer.style.display = "none";
  const liextra = document.getElementById("liextra");
  liextra.innerHTML = ''; // Clear existing options
}


function drawTable(day) {
  clearTable(); // Assuming this clears the existing table
  datum.textContent = "week " + day.id.slice(2, 4) + " Day " + day.id.slice(4, 5);
  teamname_title.textContent = team_name + "-" + shift_name;

  // Create table header 

  const headerRow = tab.insertRow(0);
  const headers = ["werkpost nummer", "werkpost", "operator", "opleiding"];
  headers.forEach(headerText => {
      const cell = headerRow.insertCell();
      cell.textContent = headerText;
  });

  // Populate table rows
  for (let i = 0; i < day.stations.length; i++) {
      var row = tab.insertRow(i + 1);
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);

      cell1.innerHTML = day.stations[i].stationNumber;
      cell2.innerHTML = day.stations[i].stationName;

      // Handle operators display similar to first function
      if (day.stations[i].operators && Array.isArray(day.stations[i].operators)) {
          cell3.innerHTML = "";
          const ul = document.createElement("ul");
          day.stations[i].operators.forEach((operator) => {
              const li = document.createElement("li");
              li.textContent = operator;
              ul.appendChild(li);
          });
          cell3.appendChild(ul);
      } else {
          cell3.innerHTML = "No operators assigned";
      }

      cell4.innerHTML = day.stations[i].training || "";

      // Highlight rows with no operators
      if (day.stations[i].operators == null || day.stations[i].operators.length === 0) {
          cell3.innerHTML = "post niet gedekt !";
          row.style.background = "red";
      }
  }

  // Display extra information
  const extraInfo = document.getElementById("liextra");
  const extraContainer = document.getElementById("divextra");
  extraInfo.innerHTML = ""; // Clear existing items
  
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
      console.log('Failed to check authentication status:', response.statusText);
    }
  } catch (error) {
    console.log('Error checking authentication status:', error);
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
