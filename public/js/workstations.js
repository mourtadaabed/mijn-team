class Station {
  constructor(station_number, station_name, requiredOperators = 1, description) {
      this.station_number = station_number;
      this.station_name = station_name;
      this.description = description;
      this.requiredOperators = requiredOperators;
  }
}

let user_name = storedUser()?.name || "Unknown";
let team_name = storedUser()?.shift?.slice(0, 2) || "No Team";
let shift_name = storedUser()?.shift?.slice(3, 4) || "No Shift";
var table = document.getElementById("maintable");
let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
const adminMenu = document.getElementById("admin_menu");
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const logoutButton = document.getElementById("logout");

userName.innerText = user_name;
teamName.innerText = team_name + "-" + shift_name;

fetchStations();

function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
      return JSON.parse(storedUser);
  }
  return null;
}

function clear() {
  for (let i = table.rows.length - 1; i > 0; i--) {
      table.deleteRow(i);
  }
  document.getElementById('station_number').value = '';
  document.getElementById('station_name').value = '';
  document.getElementById('description').value = '';
  document.getElementById('requiredOperators').value = '';
}

function drawtable(stations) {
  clear();
  for (let i = 0; i < stations.length; i++) {
      var row = table.insertRow(i + 1);
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);
      cell1.innerHTML = stations[i].station_number;
      cell2.innerHTML = stations[i].station_name;
      cell3.innerHTML = stations[i].description;
      cell4.innerHTML = stations[i].requiredOperators;
      cell1.setAttribute("class", "d_en_v");
      cell1.onmouseenter = function(e) {
          this.innerHTML = "Delete ?";
      };
      cell1.onmouseleave = function(e) {
          this.innerHTML = stations[i].station_number;
      };
      cell1.onclick = function(e) {
          deleteStation(stations[i].station_number, team_name);
      };
  }
}

async function fetchStations() {
  try {
      const response = await fetch('/stations', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              team: team_name,
          }),
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

async function deleteStation(station_number, teamName) {
  const isConfirmed = confirm(`Are you sure you want to delete station ${station_number}?`);
  if (!isConfirmed) return;

  try {
      const response = await fetch('/delete-station', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              station_number,
              team: teamName
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
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

document.getElementById("edit_form").addEventListener("submit", async function (e) {
  e.preventDefault();
  await getData(e.target);
});

async function getData(form) {
  const formData = new FormData(form);
  const station_name = formData.get("station_name");
  const station_number = formData.get("station_number");
  const description = formData.get("description");
  const requiredOperators = formData.get("requiredOperators") || 1;
  const team_name = storedUser()?.shift?.slice(0, 2) || "No Team";

  const newStation = new Station(station_number, station_name, requiredOperators, description);

  if (!await isexist_in_db(station_number, team_name)) {
      await create_new_station(newStation, team_name);
  } else {
      const result = confirm("The station already exists. Do you want to update it?");
      if (result) {
          const updateResult = await update_station_in_db(station_number, station_name, requiredOperators, description, team_name);
          if (updateResult.success) {
              console.log('Station updated successfully!');
          } else {
              alert('Failed to update station.');
          }
      } else {
          console.log('Update canceled.');
      }
  }
}

async function isexist_in_db(station_number, team_name) {
  try {
      const response = await fetch('/check-station', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ station_number, team_name }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.exists;
  } catch (error) {
      console.error('Error checking station:', error);
      return false;
  }
}

async function create_new_station(newStation, team_name) {
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
              team_name: team_name,
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedStations = await response.json();
      drawtable(updatedStations);
      return true;
  } catch (error) {
      console.error('Error creating station:', error);
      return false;
  }
}

async function update_station_in_db(station_number, station_name, requiredOperators, description, team_name) {
  try {
      const response = await fetch('/update-station', {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              station_number,
              station_name,
              requiredOperators,
              description,
              team_name,
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      drawtable(data.stations);
      return data;
  } catch (error) {
      console.error('Error updating station:', error);
      return { success: false, message: 'Failed to update station' };
  }
}

async function logout() {
  console.log('Logout button clicked');
  try {
      const response = await fetch('/logout', {
          method: 'POST',
          credentials: 'include',
      });

      if (response.ok) {
          localStorage.removeItem("user");
          document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          console.log('Logout successful, redirecting to homepage');
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
          credentials: 'include',
      });

      if (response.ok) {
          const data = await response.json();
          console.log('Auth response:', data);
          if (data.isAuthenticated) {
              console.log('User is authenticated, showing admin features');
              showAdminFeatures();
          } else {
              console.log('User is not authenticated, redirecting to login page...');
              window.location.href = '/login';
          }
      } else {
          const errorData = await response.json();
          console.error('Authentication check failed:', errorData.message);
          if (response.status === 401) {
              console.log('No token provided or token is invalid. Redirecting to login page...');
              window.location.href = '/login';
          }
      }
  } catch (error) {
      console.error('Error checking authentication status:', error);
      window.location.href = '/login';
  }
}

function showAdminFeatures() {
  adminMenu.style.display = "block";
  newPlanButtonDiv.style.display = "block";

  if (newPlanButton) {
      newPlanButton.addEventListener("click", function () {
          console.log('New Plan button clicked, redirecting to /proposal');
          window.location.href = '/proposal';
      });
  } else {
      console.log("New Plan button not found in DOM");
  }

  logoutButton.onclick = logout;
}

// Call checkAuth when the page loads
window.onload = checkAuth;

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
      window.location.reload();
  }
});