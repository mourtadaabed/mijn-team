class DayStation{
  constructor(stationNumber,stationName,operator,requiredOperators = 1,training="") {
  this.stationNumber = stationNumber;
  this.stationName = stationName;
  this.operator = operator;
  this.training = training;
  this.requiredOperators =requiredOperators ;
  }
}
class Day {
  constructor(id,stations,extra) {
    this.id = id
    this.stations = stations;//a list that contains DayStation object
    this.extra = extra;//it's an list that contains names (string's)
  }

}



let dayplan;
let copyday;
var date = "";
let teammembers = [];
let Reserves = [];
let Jobstudenten = [];
let attendees_list = [];

let user_name = storedUser().name ;
let team_name =storedUser().shift.slice(0, 2);
let shift_name = storedUser().shift.slice(3, 4);
let team_title = document.getElementById("team_naam");
let team = document.getElementById("plogdiv");
team.textContent = team_name+"-"+shift_name;
let userName = document.getElementById("username");
let teamName = document.getElementById("teamname");
team_title.innerText=team_name+"-"+shift_name ;
userName.innerText=user_name ;
teamName.innerText=team_name+"-"+shift_name;

let teammembers_div = document.getElementById("teammembers_div");
let reserves_div = document.getElementById("reserves_div");
let jobstunds_div = document.getElementById("jobstunds_div");
var  date = document.getElementById("date");
var tab = document.getElementById("maintable");
var ext_list = document.getElementById("liextra");
var aanwezigen = document.getElementById("aanwezigen-dd");




fetchOperators(team_name, shift_name)
    .then(fetchedOperators => {
        filter_operators(fetchedOperators);
        // Optionally update UI here, e.g., drawtable(fetchedOperators);
    })
    .catch(error => {
        console.error('Failed to fetch operators:', error);
        // Optionally update UI to show error state
    });


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

      //operators = fetchedOperators; // Update global operators array
      return fetchedOperators; // Return for immediate use if needed
  } catch (error) {
      console.error('Error fetching operators:', error);
      throw error; // Re-throw for caller to handle
  }
}

console

function filter_operators(operators){
  
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


 fillmaindiv(teammembers,Reserves,Jobstudenten) ;

}
function fillmaindiv(teammembers,reserves,jobstunds) {

    for (let index = 0; index < teammembers.length; index++) {
        const cb = document.createElement("input");
        const la = document.createElement("label");
        cb.setAttribute("name", teammembers[index]);
        cb.checked = true;
        cb.type = 'checkbox';
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
        const la = document.createElement("lable");
        la.innerHTML = reserves[index]; 
        cb.setAttribute("name", reserves[index]);
        cb.type = 'checkbox';
        const br = document.createElement("br");

        reserves_div.appendChild(cb);
        reserves_div.appendChild(la);
        reserves_div.appendChild(br);
        
    }

    for (let index = 0; index < jobstunds.length; index++) {
        const cb = document.createElement("input");
        const la = document.createElement("lable");
        la.innerHTML = jobstunds[index]; 
        cb.setAttribute("name", jobstunds[index]);
        cb.type = 'checkbox';
        const br = document.createElement("br");

        jobstunds_div.appendChild(cb);
        jobstunds_div.appendChild(la);
        jobstunds_div.appendChild(br);
        
    }


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



  fetchAttendees(id, att, team_name, shift_name);
}

async function fetchAttendees(id, attendees, team, shift) {
  
  let dp; // Declare dp in the function scope


  try {
    // Prepare the data to send to the backend
    const payload = {
      id: id,
      attendees: attendees,
      team: team,
      shift: shift
    };

    // Send data to the backend
    const response = await fetch('/day-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Assign the response to dp
    dp = await response.json();
    dayplan = dp;
    // Deep copy the Day plan for reverting changes
    copyday =  JSON.parse(JSON.stringify(dp)); // Deep copy as an object
    // Draw the initial table with the Day plan
    drawtable(dayplan);

    // Return both for further use if needed
    return { original: dayplan, copy: copyday };
  } catch (error) {
    console.error("Error fetching attendees:", error);
    throw error; // Re-throw to handle in the caller if needed
  }
}


   


    //////////////////     start of poposol div    **/////***//// */



    

  function index_of(p) {
    for (let index = 0; index < dayplan.stations.length; index++) {
      if (dayplan.stations[index].stationName === p) { 
        return index;
      }
    }
    console.error("Post not found:", p);
    return null;
  }
  
  

  
  ///************************* */
  


  function clear() {
  
      for(let i=tab.rows.length-1;i>0;i--){
        tab.deleteRow(i);
      }
      ext_list.innerHTML = "";
      date.innerText="";
    }


  function drawtable(dayplan){

    clear();
    date.innerText="week "+dayplan.id.slice(2, 4)+" Day "+dayplan.id.slice(4, 5);
    for (let i = 0; i < dayplan.stations.length; i++) {
      var row = tab.insertRow(i+1);
      var cell1 = row.insertCell(0);
      var cell2 = row.insertCell(1);
      var cell3 = row.insertCell(2);
      var cell4 = row.insertCell(3);
      cell1.innerHTML = dayplan.stations[i].stationNumber;
      cell2.innerHTML = dayplan.stations[i].stationName;
      cell3.innerHTML = dayplan.stations[i].operator;
      cell3.setAttribute("class","d_en_v");
  
      cell3.onclick = function() {
        createdropdownlist(dayplan.stations[i].stationName,3);
      };
      cell4.innerHTML = dayplan.stations[i].training;
      cell4.setAttribute("class","d_en_v");
  
      cell4.onclick = function() {
        createdropdownlist(dayplan.stations[i].stationName,4);
        document.getElementById("dropdown-div").style.top ="100px";
      };
      if (dayplan.stations[i].operator==null || dayplan.stations[i].operator==""){
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
  
  


  function createdropdownlist(station, col) {
    let bg = document.getElementById("bg_dropdown");
    let tdd = document.getElementById("tit-list-anwz");
    let niemand = document.getElementById("niemand");

    niemand.onclick = function() {
        const p = index_of(station);

        if (p === null || !dayplan.stations[p]) {
            console.error("Station not found in Stations");
            return;
        }

        // Get the current value of the operator or training
        let clicked = col === 3 ? dayplan.stations[p].operator : dayplan.stations[p].training;

        // If the value exists and is not already in dayplan.extra, add it
        if (clicked && !dayplan.extra.includes(clicked)) {
            dayplan.extra.push(clicked);
        }

        // Clear the operator or training field
        dayplan.stations[p][col === 3 ? "operator" : "training"] = ""; 
        bg.style.display = "none";
        clear();
        drawtable(dayplan);
    };

    bg.onclick = function() {
        bg.style.display = "none";
    };

    tdd.innerHTML = station;
    aanwezigen.innerHTML = "";
    bg.style.display = "block";

    // Only use dayplan.extra for the dropdown list
    for (let index = 0; index < dayplan.extra.length; index++) {
        let el = document.createElement("li");
        el.setAttribute("class", "li-elemt");
        el.innerHTML = dayplan.extra[index];
        aanwezigen.appendChild(el);
        el.onclick = function() {
            bg.style.display = "none";
            const p = index_of(station);

            if (p === null || !dayplan.stations[p]) {
                console.error("Post not found in dag.posten");
                return;
            }
            // Set the operator or opleiding to the selected value
            // If the value exists and is not already in dayplan.extra, add it
                    // Get the current value of the operator or training
              let clicked = col === 3 ? dayplan.stations[p].operator : dayplan.stations[p].training;
              // If the value exists and is not already in dayplan.extra, add it
              if (clicked && !dayplan.extra.includes(clicked)) {
                  dayplan.extra.push(clicked);
              }


            dayplan.stations[p][col === 3 ? "operator" : "training"] = dayplan.extra[index];

            // Remove the selected value from dayplan.extra
            dayplan.extra = dayplan.extra.filter(item => item !== dayplan.extra[index]);

            drawtable(dayplan);
        };
    }
}
  
  document.getElementById("ver").addEventListener("click", refresh);
  function refresh() {
    dayplan=JSON.parse(JSON.stringify(copyday)); 
    drawtable(dayplan);
    
  }


  document.getElementById("bev").addEventListener("click", bevestigen);
  
  async function bevestigen() {
    try {
      await fetchDayplan(dayplan, team_name, shift_name);
      window.location.href = '/';
    } catch (error) {
      console.error("Error in bevestigen:", error);
    }
    
  }

  async function fetchDayplan(dp, team, shift) {
    console.log(dp);
    try {
      const payload = { dayplan: dp, team, shift };
      
      const response = await fetch('/dayplan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        
        body: JSON.stringify(payload),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json(); // Assuming the server returns JSON
      return data; // Return data to the caller if needed

    } catch (error) {
      console.error("Error fetching dayplan:", error);
      throw error; // Re-throw for upstream handling
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

    // Call checkAuth when the page loads
    window.onload = checkAuth;
    
    
    window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
    // Page was loaded from the cache, force a reload
    window.location.reload();
    }
    });   