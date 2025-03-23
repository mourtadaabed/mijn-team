// DOM Elements
const usersLink = document.getElementById("users-link");
const shiftsLink = document.getElementById("shifts-link");
const newPlanButtonDiv = document.getElementById("new_plan_button");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const userTeamDiv = document.getElementById("user_team");
const usernameDisplay = document.getElementById("usernameDisplay");
const teamnameDisplay = document.getElementById("teamname");
const loginButton = document.getElementById("login");

// Function to get stored user data
function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return null;
}

// Function to check authentication status
async function checkAuth() {
  const userData = storedUser();

  if (!userData || !userData.name || (!userData.team_shift && (!userData.team || !userData.shift)) || !userData.role) {
    await NOT_loggedin();
    return false;
  }

  const teamShift = userData.team_shift || `${userData.team}-${userData.shift}`;
  const [team, shift] = teamShift.split('-');

  try {
    const payload = {
      name: userData.name,
      team_shift: teamShift,
      role: userData.role
    };

    const response = await fetch('/verify-user', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isValid) {
        showAdminFeatures(team, userData.name, userData.role);
        return true;
      } else {
        await NOT_loggedin();
        return false;
      }
    } else {
      await NOT_loggedin();
      return false;
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    await NOT_loggedin();
    return false;
  }
}

// Function to handle not logged-in state
function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

// Function to show admin features and set logout
function showAdminFeatures(team, username, role) {
  // Show admin items only if user has admin role
  if (role === 'admin') {  // Adjust this condition based on your actual role system
    usersLink.style.display = "inline";
    shiftsLink.style.display = "inline";
  }
  
  newPlanButtonDiv.style.display = "block";
  userTeamDiv.style.display = "block";
  loginButton.value = "Uitloggen";

  usernameDisplay.textContent = username || "Unknown";
  teamnameDisplay.textContent = team || "No Team";

  if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
      window.location.href = '/proposal';
    });
  } else {
    console.error("New Plan button not found in DOM");
  }

  loginButton.onclick = logout;
}

// Function to hide admin features and set login
function hideAdminFeatures() {
  usersLink.style.display = "none";
  shiftsLink.style.display = "none";
  newPlanButtonDiv.style.display = "none";
  userTeamDiv.style.display = "none";
  loginButton.value = "Aanmelden";

  loginButton.onclick = loginHandler;
}

// Login handler
function loginHandler() {
  window.location.href = '/login';
}

// Logout handler
async function logout() {
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("user");
      window.location.href = '/';
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Run checkAuth when the page loads
window.onload = checkAuth;