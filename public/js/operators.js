class workstation {
  constructor(name,number,description) {
      this.name=name;
      this.number=number;
      this.bes=bes;
  }
}


class Operator{
  constructor(name,number,rol="teammember") {
    this.name = name;
    this.number=number;
    this.posten = [];
    this.rol = rol;
  }

}

var activeoplist=[];
var teamleden = [];
var reserven = [];
var jobsudenten = [];
let stations=[];
let operators = [];
let user_name = storedUser().name ;
let team_name =storedUser().shift.slice(0, 2);
let shift_name = storedUser().shift.slice(3, 4);

let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
userName.innerText= user_name;
teamName.innerText= team_name+"-"+shift_name;

initializeTable(team_name, shift_name);
// Initialize and draw the table once both lists are ready
async function initializeTable(teamName, shiftName) {
  try {
      // Wait for both fetch operations to complete
      await Promise.all([
          fetchStations(teamName),
          fetchOperators(teamName, shiftName)
      ]);

      // At this point, both stations and operators are populated
     drawtable(); // Call drawtable with operators
  } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Could not load operators or stations. Please try again.');
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
const response = await fetch('/check-auth', {
    credentials: 'include', // Include cookies in the request
});

if (response.ok) {
    const data = await response.json();

    if (!data.isAuthenticated) {
        // User is not logged in
        window.location.href = '/'; 
    }
} else {
    console.error('Failed to check authentication status:', response.statusText);
}
} catch (error) {
console.error('Error checking authentication status:', error);
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

var table = document.getElementById("maintable");
var form  = document.getElementById("newoperator");
document.getElementById("addingoperator_div").
setAttribute("title","als je de naam en of title wil wijzigen geef de huidige naam in ");




// Form submission handler
form.addEventListener("submit", async function (e) {
  e.preventDefault();
  await getData(e.target); // Added await since getData is async
});

async function getData(form) {
  const formData = new FormData(form);
  const { number, name, rol } = Object.fromEntries(formData);

  const newOperator = new Operator(name, number, rol);
  
  const result = await isexist_in_db(newOperator.number, team_name, shift_name);
  if (!result.exists) {  // Changed to result.exists
      await create_new_operator(newOperator, team_name, shift_name);
  } else {
      const confirmResult = confirm(`The Operator ${result.operatorName} already exists. Do you want to update him?`);  // Improved message
      if (confirmResult) {
          await updating_operator(newOperator.number, result.operatorName, result.operatorRol);
      } else {
          console.log('Update canceled.');
          form.reset(); // Clear the form
      }
  }
}

async function isexist_in_db(operator_number, team_name, shift_name) {
  try {
      const response = await fetch('/check-operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operator_number, team_name, shift_name }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();  // Added missing data parsing
      const resu = { 
          exists: data.exists, 
          operatorName: data.operator?.name || null ,
          operatorRol: data.operator?.rol || null 
      };
      return resu;
  } catch (error) {
      console.error('Error checking operator:', error);
      return { 
          exists: false, 
          operatorName: null 
      };  // Return consistent object structure
  }
}

async function create_new_operator(newOperator, team_name, shift_name) {
  try {
      const response = await fetch('/create-operator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              newOperator: {
                  number: newOperator.number,
                  name: newOperator.name,
                  rol: newOperator.rol,
              },
              team_name,
              shift_name,
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedOperators = await response.json();
      drawtable(updatedOperators);
      return true;
  } catch (error) {
      console.error('Error creating operator:', error);
      return false;
  }
}

async function updating_operator(number, name, rol) {  // Added async
  document.getElementById("addingoperator_div").style.display = "none";
  document.getElementById("modify_div").style.display = "block";
  document.getElementById("oldname_s").innerHTML = name + " - ";
  document.getElementById("oldrol_s").innerHTML = rol;
  document.getElementById("oldnumber_s").innerHTML = "-" + number;

  // Remove existing listeners to prevent multiple bindings
  const oldOperatorForm = document.getElementById("oldoperator");
  const newForm = oldOperatorForm.cloneNode(true);
  oldOperatorForm.parentNode.replaceChild(newForm, oldOperatorForm);

  newForm.addEventListener("submit", async function (e) { 
      e.preventDefault();
      await getData2(e.target, number);  
      document.getElementById("addingoperator_div").style.display = "block";
      document.getElementById("modify_div").style.display = "none";
  });
}



async function getData2(form, number) {
  const formData = new FormData(form);
  const name = Object.fromEntries(formData)["name"]?.trim() || ''; // New name
  const rol = Object.fromEntries(formData)["rol"] || '';
  if (!name) {
      alert("De naam mag niet leeg zijn");
      return;
  }
  try {
      const response = await fetch('/update-operator', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              number, // Operator number to identify the operator
              name,   // New name
              rol,    // New role
              team_name,
              shift_name,
          }),
      });

      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedOperators = await response.json();
      drawtable(updatedOperators.operators); // Assuming backend returns { operators: [...] }
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
            headers: {
                'Content-Type': 'application/json',
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
            throw new Error('Invalid response format: expected an array of operators');
        }

        operators = fetchedOperators; // Update global operators array
        return operators; // Return for immediate use if needed
    } catch (error) {
        console.error('Error fetching operators:', error);
        operators = []; // Reset on error (optional)
        throw error; // Re-throw for caller to handle
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

      const fetchedStations = await response.json(); // Rename for clarity
      stations = fetchedStations; // Update the global stations array
      return stations; // Return the fetched data for further use
  } catch (error) {
      console.error('Error fetching stations:', error);
      stations = []; // Reset stations on error (optional, depending on your needs)
      throw error; // Re-throw to allow calling code to handle the error
  }
}


function clear() {
    form.reset();
    for(i=table.rows.length-1;i>0;i--){
        table.deleteRow(i);
    }
}


function drawtable(operatorslist=operators){

  clear();

  var row1 = table.insertRow(1);
  for (let ix = 0; ix < stations.length; ix++) {
    var cell10 = row1.insertCell(ix);
    cell10.innerHTML = stations[ix].station_name;
  }


  for (let i = 0; i < operatorslist.length; i++) {
    
    var row = table.insertRow(i+2);
    var cell0 = row.insertCell(0);
    cell0.innerHTML = operatorslist[i].name;
    cell0.setAttribute("class","cell");
    cell0.setAttribute("title","click to remove operator"+"\nName: "+operatorslist[i].name+
        " Number: "+operatorslist[i].number+" Rol: "+operatorslist[i].rol);


    cell0.onmouseenter = function(e) {
      this.innerHTML = "Delete ?";
    };
    cell0.onmouseleave = function(e) {
      this.innerHTML = operatorslist[i].name;
    };

    cell0.onclick = function(e) {
      if (confirm("Are you sure you want to delete:" + operatorslist[i].name+
        "? number : "+operatorslist[i].number)) {
          // Call the deleteOperator function
          deleteOperator(
              operatorslist[i].number,    // operator_number
              team_name,      
              shift_name     
          )
          .then(updatedOperators => {
              // Update the operators list and redraw table on success
              operators = updatedOperators;  // Update the local list
              drawtable(updatedOperators);          // Redraw the table
          })
          .catch(error => {
              // Handle any errors
              console.error('Deletion failed:', error);
              alert('Failed to delete operator: ' + error.message);
          });
      }
  };

    let j =1;
    for (let index = 0; index < stations.length; index++) {
      try {
          const cell1 = row.insertCell(j);
          const stationNumber = stations[index].station_number;
          
          // Basic cell setup
          cell1.innerHTML = stationNumber;
          cell1.className = "cell";
          cell1.title = "Click to change the status of station";
  
          // Check if station belongs to operator and configure accordingly
          const isAssigned = operatorslist[i].stations.includes(stationNumber);
          
          if (!isAssigned) {
              cell1.style.backgroundColor = "rgb(254, 65, 65)";
              cell1.onclick = async function(e) {
                  //adding station to stations of operator in back en and then redraw table from res
                  add_station_to_operator(
                    stationNumber,
                    operatorslist[i].number,
                    team_name,    
                    shift_name      
                )
                .then(updatedOperators => {
                    // Update the operators list and redraw table on success
                    operators = updatedOperators;  // Update the local list
                    drawtable(updatedOperators);          // Redraw the table
                })
                .catch(error => {
                    // Handle any errors
                    console.error('Deletion failed:', error);
                    alert('Failed to delete operator: ' + error.message);
                });
              };
          } else {
              cell1.style.backgroundColor = "rgb(158, 219, 185)";
              cell1.onclick = async function(e) {
                  //deleting station from stations of operator in back en and then redraw table from res
                  delete_station_from_operator(
                    stationNumber,
                    operatorslist[i].number,
                    team_name,    
                    shift_name      
                )
                .then(updatedOperators => {
                    // Update the operators list and redraw table on success
                    operators = updatedOperators;  // Update the local list
                    drawtable(updatedOperators);          // Redraw the table
                })
                .catch(error => {
                    // Handle any errors
                    console.error('Deletion failed:', error);
                    alert('Failed to delete operator: ' + error.message);
                });
              };
          }
          j++;
      } catch (error) {
          console.error(`Error processing station at index ${index}:`, error);
          j++; // Ensure we move to next cell even if there's an error
      }
  }

  }

}

// Add station to operator
async function add_station_to_operator(stationNumber, operatorNumber, team, shift) {
    try {
        const response = await fetch('/add-station-to-operator', {
            method: 'PUT', // or POST, depending on your backend
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                station_number: stationNumber,
                operator_number: operatorNumber,
                team_name: team,
                shift_name: shift
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to add station');
        }
        return data.operators; // Expect updated operators list from backend
    } catch (error) {
        console.error('Error in add_station_to_operator:', error);
        throw error; // Re-throw to be caught by onclick handler
    }
}

// Delete station from operator
async function delete_station_from_operator(stationNumber, operatorNumber, team, shift) {
    try {
        const response = await fetch('/delete-station-from-operator', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                station_number: stationNumber,
                operator_number: operatorNumber,
                team_name: team,
                shift_name: shift
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete station');
        }
        return data.operators; // Expect updated operators list from backend
    } catch (error) {
        console.error('Error in delete_station_from_operator:', error);
        throw error; // Re-throw to be caught by onclick handler
    }
}



// Function to delete an operator
async function deleteOperator(operatorNumber, teamName, shiftName) {
  
  try {
      const response = await fetch('/delete-operator', {
          method: 'DELETE',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              operator_number: operatorNumber,
              team_name: teamName,
              shift_name: shiftName
          })
      });

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.message || 'Failed to delete operator');
      }

      if (data.success) {
          console.log('Operator deleted successfully');
          console.log('Updated operators list:', data.operators);
          // Update your frontend UI here with the returned operators list
          return data.operators;
      } else {
          throw new Error(data.message || 'Operator not found');
      }
  } catch (error) {
      console.error('Error:', error.message);
      // Handle error in UI (e.g., show error message to user)
      throw error;
  }
}




var btres = document.getElementById("bt-res");
btres.onclick = function(e) {
  const newlist = operators.filter(operator =>operator.rol=="reserve" );

  activeoplist=newlist;
  drawtable(activeoplist);

};
var bttea = document.getElementById("bt-tea");
bttea.onclick = function(e) {
  const newlist = operators.filter(operator =>operator.rol=="teammember" );
  activeoplist=newlist;
  drawtable(activeoplist);

};
var btjob = document.getElementById("bt-job");
btjob.onclick = function(e) {
  const newlist = operators.filter(operator =>operator.rol=="jobstudent" );
  activeoplist=newlist;
  drawtable(activeoplist);

};

var btall = document.getElementById("bt-all");
btall.onclick = function(e) {
  activeoplist=operators;
  drawtable(activeoplist);
};
















