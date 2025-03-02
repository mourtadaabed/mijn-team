class Station {
  constructor(station_number, station_name ,requiredOperators = 1, description) {
      this.station_number = station_number;
      this.station_name = station_name;
      this.description = description;
      this.requiredOperators =requiredOperators ;
  }
}
let user_name = storedUser().name ;
let team_name =storedUser().shift.slice(0, 2);
let shift_name = storedUser().shift.slice(3, 4);
var table = document.getElementById("maintable");
let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
userName.innerText=user_name;
teamName.innerText= team_name+"-"+shift_name;


fetchStations();
function storedUser() {
  // Retrieve user from localStorage
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    const userData = JSON.parse(storedUser);
    return userData;
  }
  return "no user stored";    
}

function clear() {
    for(i=table.rows.length-1;i>0;i--){
      table.deleteRow(i);
    }
    document.getElementById('station_number').value = '';
    document.getElementById('station_name').value = '';
    document.getElementById('description').value = '';
    document.getElementById('station_number').value = '';
    document.getElementById('requiredOperators').value = '';
  }


function drawtable(stations) {
  clear();
    for (let i = 0; i < stations.length; i++) {
        var row = table.insertRow(i+1);
        var cell1 = row.insertCell(0);
        var cell2 = row.insertCell(1);
        var cell3 = row.insertCell(2);
        var cell4 = row.insertCell(3);
        cell1.innerHTML = stations[i].station_number;
        cell2.innerHTML = stations[i].station_name;
        cell3.innerHTML = stations[i].description;
        cell4.innerHTML = stations[i].requiredOperators;
        cell1.setAttribute("class","d_en_v");
        cell1.onmouseenter = function(e) {
          this.innerHTML = "Delete ?";
        };
        cell1.onmouseleave = function(e) {
          this.innerHTML = stations[i].station_number;
        };
        cell1.onclick = function(e) {
          deleteStation(stations[i].station_number,team_name); 
        };
        
    }
}
// Function to fetch stations from the database (mock API)
async function fetchStations() {

  try {
    // Send team and shift in the request body
    const response = await fetch('/stations', {
      method: 'POST', // Use POST to send data in the body
      headers: {
        'Content-Type': 'application/json', // Specify the content type as JSON
      },
      body: JSON.stringify({
        team: team_name,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const stations = await response.json(); // Assuming the response is an array of stations

    drawtable(stations); // Draw the table with the fetched stations
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
          //alert('Station deleted successfully!');
          // Refresh the table with the updated stations array
          drawtable(data.stations); // Redraw the table
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
  const requiredOperators = formData.get("requiredOperators") || 1; // Default to 1
  const team_name = storedUser().shift.slice(0, 2);

  const newStation = new Station(station_number, station_name, requiredOperators, description);

  if (!await isexist_in_db(station_number, team_name)) {
      await create_new_station(newStation, team_name);
  }else {
    const result = confirm("The station already exists. Do you want to update it?");
    if (result) {
        const updateResult = await update_station_in_db(station_number, station_name, requiredOperators, description, team_name);
        if (updateResult.success) {
            console.log('Station updated successfully!');
        } else {
            alert('Failed to update station.');
        }
    } else {
        // Clear the form (you can implement this part)
        console.log('Update canceled.');
    }
}
}

// Function to check if a station exists in a team's station array
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
      return data.exists; // Assuming the server responds with { exists: true/false }
  } catch (error) {
      console.error('Error checking station:', error);
      return false; // Return false in case of an error
  }
}

// Function to create a new station
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

      //const data = await response.json();
      const updatedStations = await response.json();
      // Refresh the page if the station was created successfully

        drawtable(updatedStations);


      return true; // Assuming the server responds with { success: true/false }
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
      drawtable(data.stations); // Redraw the table
      return data; // { success: true, message: 'Station updated successfully' }
  } catch (error) {
      console.error('Error updating station:', error);
      return { success: false, message: 'Failed to update station' };
  }
}



//////////////////////////////////


async function logout() {
  try {
    // Send a request to the server to log out
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include', // Include cookies in the request
    });

    if (response.ok) {
      // Remove user data from localStorage
      localStorage.removeItem("user");
      // Clear the JWT cookie on the frontend (if accessible)
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
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
      // Fetch authentication status from the server
      const response = await fetch('/check-auth', {
          credentials: 'include', // Include cookies in the request
      });

      // Check if the response is OK (status code 200-299)
      if (response.ok) {
          const data = await response.json();

          // If the user is not authenticated, redirect to the login page
          if (!data.isAuthenticated) {
              console.log('User is not authenticated. Redirecting to login page...');
              window.location.href = '/login';
          }
      } else {
          // Handle non-OK responses (e.g., 401 Unauthorized)
          const errorData = await response.json();
          console.error('Authentication check failed:', errorData.message);

          // Redirect to the login page if the token is missing or invalid
          if (response.status === 401) {
              console.log('No token provided or token is invalid. Redirecting to login page...');
              window.location.href = '/login';
          }
      }
  } catch (error) {
      // Handle network errors or other exceptions
      console.error('Error checking authentication status:', error);

      // Optionally, redirect to the login page in case of unexpected errors
      window.location.href = '/login';
  }
}




// Call checkAuth when the page loads
window.onload = checkAuth;


window.addEventListener('pageshow', function(event) {
if (event.persisted) {
// Page was loaded from the cache, force a reload
window.location.reload();
}
});
