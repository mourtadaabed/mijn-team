import { checkAuth } from './checkAuth.js';

// DOM Elements
const shiftForm = document.getElementById("newshift");
const adminLink = document.getElementById("admin-link");
const userName = document.getElementById("un");
const teamName = document.getElementById("teamname");
const shiftsBody = document.getElementById("shiftsBody");

function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
}
let currentTeam  = storedUser().team;
let currentRole = storedUser().role;
const logoutButton = document.getElementById("logout");
logoutButton.onclick = logout;



function loggedin(userData) {
  userName.innerText = userData.name;
  teamName.innerText = `${userData.team}-${userData.shift}`;

  showAdminFeatures(userData.role);

  if (userData.role !== "admin") {
    window.location.href = "/notAuthorized";
    return;
  }
}

function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

function showAdminFeatures(userRole) {
  if (adminLink) {
    adminLink.style.display = userRole === "admin" ? "inline" : "none";
  }
  if (shiftForm) {
    shiftForm.style.display = userRole === "admin" ? "block" : "none";
  }
}

if (shiftForm) {
  shiftForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const isLoggedIn = await checkAuth(loggedin, NOT_loggedin);
    if (!isLoggedIn) return;

    const currentUser = storedUser();
    if (currentUser.role !== "admin") {
      window.location.href = "/notAuthorized";
      return;
    }

    const shiftname = document.getElementById("shiftname").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!shiftname || !username || !password || !email) {
      alert("Please fill in all fields.");
      return;
    }

    await creatnewshift({ username, password, email }, currentUser.team, shiftname);
  });
}



async function creatnewshift(user, teamname, shiftname) {
  try {
    const response = await fetch("/newShift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ 
        username: user.username, 
        password: user.password, 
        email: user.email, 
        teamname, 
        shiftname 
      }),
    });

    const messageBox = document.getElementById("msg-login");
    const data = await response.json();
    if (response.ok) {
      messageBox.textContent = data.message || "Shift created successfully!";
      messageBox.style.color = "green";
      setTimeout(() => (window.location.href = "/operators"), 2000);
    } else {
      messageBox.textContent = data.message || "An error occurred.";
      messageBox.style.color = "red";
    }
  } catch (error) {
    console.error("Fetch error:", error);
    const messageBox = document.getElementById("msg-login");
    messageBox.textContent = "Network error. Please try again.";
    messageBox.style.color = "red";
  }
}






// Function to fetch and display all shifts
async function fetchAndDisplayShifts() {
  try {
    // Get the team name from stored user data
    const currentUser = storedUser(); // Assuming storedUser() retrieves the logged-in user
    if (!currentUser || !currentUser.team) {
      throw new Error("No team name available for the current user");
    }
    // Send the team name as a query parameter in the URL
    const response = await fetch(`/shifts_of_team?teamname=${encodeURIComponent(currentTeam)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Include cookies for authentication
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fetch failed with status:", response.status, "Response:", errorText);
      throw new Error("Failed to fetch shifts");
    }

    const data = await response.json();
    console.log("Fetched shifts for team", teamName, ":", data.shifts);
    populateShiftsTable(data.shifts); // Assuming the backend returns { shifts: [...] }
  } catch (error) {
    console.error("Error fetching shifts:", error);
    shiftsBody.innerHTML = "<tr><td colspan='4'>Error loading shifts</td></tr>";
  }
}






// Function to populate the shifts table
function populateShiftsTable(shifts) {
  shiftsBody.innerHTML = ""; // Clear existing rows

  if (!shifts || shifts.length === 0) {
    shiftsBody.innerHTML = "<tr><td colspan='4'>No shifts available</td></tr>";
    return;
  }

  shifts.forEach((shift) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${shift.shiftname || "N/A"}</td>
      <td>${shift.username || "N/A"}</td>
      <td>${shift.role || "N/A"}</td> <!-- Changed from email to role -->
      <td><button class="delete-shift" data-shift="${shift.shiftname}" data-team="${shift.teamname}">Delete</button></td>
    `;
    shiftsBody.appendChild(row);
  });

  // Add event listeners for delete buttons
  document.querySelectorAll(".delete-shift").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const shiftname = e.target.dataset.shift;
      const teamname = e.target.dataset.team;
      await deleteShift(shiftname, teamname,currentRole);
    });
  });
}




// Function to delete a shift (if you want this feature)
async function deleteShift(shiftname, teamname,role) {
  if (!confirm(`Are you sure you want to delete shift '${shiftname}' from team '${teamname}'?`)) return;

  try {
    const response = await fetch("/deleteShift", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ shiftname, teamname,role }),
    });

    const data = await response.json();
    const messageBox = document.getElementById("msg-login");
    if (response.ok) {
      messageBox.textContent = data.message || "Shift deleted successfully!";
      messageBox.style.color = "green";
      fetchAndDisplayShifts(); // Refresh the table
    } else {
      messageBox.textContent = data.message || "Failed to delete shift.";
      messageBox.style.color = "red";
    }
  } catch (error) {
    console.error("Error deleting shift:", error);
    const messageBox = document.getElementById("msg-login");
    messageBox.textContent = "Network error. Please try again.";
    messageBox.style.color = "red";
  }
}




// Update the page initialization to fetch shifts after login
window.onload = () => {
  checkAuth(loggedin, NOT_loggedin).then((isLoggedIn) => {
    if (isLoggedIn) {
      fetchAndDisplayShifts(); // Fetch shifts after confirming user is logged in
    }
  });
};


// Logout Function
async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) {
      localStorage.removeItem("user");
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}
const newPlanButton = document.querySelector("#new_plan_button .big-button");
if (newPlanButton) {
  newPlanButton.addEventListener("click", function () {
    window.location.href = '/proposal';
  });
}


window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
