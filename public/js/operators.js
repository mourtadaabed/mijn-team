// Class Definitions
class Workstation {
    constructor(name, number, description) {
        this.name = name;
        this.number = number;
        this.bes = description; // Fixed typo: 'bes' to 'description'
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

var activeoplist = [];
var teamleden = [];
var reserven = [];
var jobsudenten = [];
let stations = [];
let operators = [];
let user_name = storedUser()?.name || "Unknown";
let team_name = storedUser()?.shift?.slice(0, 2) || "No Team";
let shift_name = storedUser()?.shift?.slice(3, 4) || "No Shift";

// DOM Elements
let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
const adminMenu = document.getElementById("admin_menu");
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const logoutButton = document.getElementById("logout");

// Set user info
userName.innerText = user_name;
teamName.innerText = team_name + "-" + shift_name;

initializeTable(team_name, shift_name);

// Initialize and draw the table once both lists are ready
async function initializeTable(teamName, shiftName) {
    try {
        await Promise.all([
            fetchStations(teamName),
            fetchOperators(teamName, shiftName)
        ]);
        drawtable();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        console.log('Could not load operators or stations. Please try again.');
    }
}

function storedUser() {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
        return JSON.parse(storedUser);
    }
    return null;
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
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Auth response:', data);
            if (data.isAuthenticated) {
                console.log('User is authenticated, showing admin features');
                showAdminFeatures();
            } else {
                console.log('User is not authenticated, redirecting to homepage');
                window.location.href = '/';
            }
        } else {
            console.log('Failed to check auth:', response.statusText);
            window.location.href = '/';
        }
    } catch (error) {
        console.log('Error checking auth:', error);
        window.location.href = '/';
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

var table = document.getElementById("maintable");
var form = document.getElementById("newoperator");
document.getElementById("addingoperator_div").setAttribute("title", "Als je de naam en/of titel wil wijzigen, geef de huidige naam in");

// Form submission handler
form.addEventListener("submit", async function (e) {
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
    } else {
        const confirmResult = confirm(`The Operator ${result.operatorName} already exists. Do you want to update them?`);
        if (confirmResult) {
            await updating_operator(newOperator.number, result.operatorName, result.operatorRol);
        } else {
            console.log('Update canceled.');
            form.reset();
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

        const data = await response.json();
        return {
            exists: data.exists,
            operatorName: data.operator?.name || null,
            operatorRol: data.operator?.rol || null
        };
    } catch (error) {
        console.error('Error checking operator:', error);
        return {
            exists: false,
            operatorName: null,
            operatorRol: null
        };
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

async function updating_operator(number, name, rol) {
    document.getElementById("addingoperator_div").style.display = "none";
    document.getElementById("modify_div").style.display = "block";
    document.getElementById("oldname_s").innerHTML = name + " - ";
    document.getElementById("oldrol_s").innerHTML = rol;
    document.getElementById("oldnumber_s").innerHTML = "-" + number;

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
            body: JSON.stringify({
                number,
                name,
                rol,
                team_name,
                shift_name,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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

        operators = fetchedOperators;
        return operators;
    } catch (error) {
        console.error('Error fetching operators:', error);
        operators = [];
        throw error;
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

        const fetchedStations = await response.json();
        stations = fetchedStations;
        return stations;
    } catch (error) {
        console.error('Error fetching stations:', error);
        stations = [];
        throw error;
    }
}

function clear() {
    form.reset();
    for (let i = table.rows.length - 1; i > 0; i--) {
        table.deleteRow(i);
    }
}

function drawtable(operatorslist = operators) {
    clear();

    var row1 = table.insertRow(1);
    for (let ix = 0; ix < stations.length; ix++) {
        var cell10 = row1.insertCell(ix);
        cell10.innerHTML = stations[ix].station_name;
    }

    for (let i = 0; i < operatorslist.length; i++) {
        var row = table.insertRow(i + 2);
        var cell0 = row.insertCell(0);
        cell0.innerHTML = operatorslist[i].name;
        cell0.setAttribute("class", "cell");
        cell0.setAttribute("title", "Click to remove operator\nName: " + operatorslist[i].name +
            " Number: " + operatorslist[i].number + " Rol: " + operatorslist[i].rol);

        cell0.onmouseenter = function(e) {
            this.innerHTML = "Delete ?";
        };
        cell0.onmouseleave = function(e) {
            this.innerHTML = operatorslist[i].name;
        };

        cell0.onclick = function(e) {
            if (confirm("Are you sure you want to delete: " + operatorslist[i].name +
                "? number: " + operatorslist[i].number)) {
                deleteOperator(
                    operatorslist[i].number,
                    team_name,
                    shift_name
                )
                .then(updatedOperators => {
                    operators = updatedOperators;
                    drawtable(updatedOperators);
                })
                .catch(error => {
                    console.error('Deletion failed:', error);
                    alert('Failed to delete operator: ' + error.message);
                });
            }
        };

        let j = 1;
        for (let index = 0; index < stations.length; index++) {
            try {
                const cell1 = row.insertCell(j);
                const stationNumber = stations[index].station_number;

                cell1.innerHTML = stationNumber;
                cell1.className = "cell";
                cell1.title = "Click to change the status of station";

                const isAssigned = operatorslist[i].stations.includes(stationNumber);

                if (!isAssigned) {
                    cell1.style.backgroundColor = "rgb(254, 65, 65)";
                    cell1.onclick = async function(e) {
                        add_station_to_operator(
                            stationNumber,
                            operatorslist[i].number,
                            team_name,
                            shift_name
                        )
                        .then(updatedOperators => {
                            operators = updatedOperators;
                            drawtable(updatedOperators);
                        })
                        .catch(error => {
                            console.error('Deletion failed:', error);
                            alert('Failed to delete operator: ' + error.message);
                        });
                    };
                } else {
                    cell1.style.backgroundColor = "rgb(158, 219, 185)";
                    cell1.onclick = async function(e) {
                        delete_station_from_operator(
                            stationNumber,
                            operatorslist[i].number,
                            team_name,
                            shift_name
                        )
                        .then(updatedOperators => {
                            operators = updatedOperators;
                            drawtable(updatedOperators);
                        })
                        .catch(error => {
                            console.error('Deletion failed:', error);
                            alert('Failed to delete operator: ' + error.message);
                        });
                    };
                }
                j++;
            } catch (error) {
                console.error(`Error processing station at index ${index}:`, error);
                j++;
            }
        }
    }
}

async function add_station_to_operator(stationNumber, operatorNumber, team, shift) {
    try {
        const response = await fetch('/add-station-to-operator', {
            method: 'PUT',
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
        return data.operators;
    } catch (error) {
        console.error('Error in add_station_to_operator:', error);
        throw error;
    }
}

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
        return data.operators;
    } catch (error) {
        console.error('Error in delete_station_from_operator:', error);
        throw error;
    }
}

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
            return data.operators;
        } else {
            throw new Error(data.message || 'Operator not found');
        }
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

var btres = document.getElementById("bt-res");
btres.onclick = function(e) {
    const newlist = operators.filter(operator => operator.rol == "reserve");
    activeoplist = newlist;
    drawtable(activeoplist);
};

var bttea = document.getElementById("bt-tea");
bttea.onclick = function(e) {
    const newlist = operators.filter(operator => operator.rol == "teammember");
    activeoplist = newlist;
    drawtable(activeoplist);
};

var btjob = document.getElementById("bt-job");
btjob.onclick = function(e) {
    const newlist = operators.filter(operator => operator.rol == "jobstudent");
    activeoplist = newlist;
    drawtable(activeoplist);
};

var btall = document.getElementById("bt-all");
btall.onclick = function(e) {
    activeoplist = operators;
    drawtable(activeoplist);
};
