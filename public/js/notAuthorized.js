// DOM Elements
const adminMenu = document.getElementById("admin_menu");
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
    return JSON.parse(storedUser); // Expecting { name, team_shift, role } or { name, team, shift, role }
  }
  return null;
}

// Function to check authentication status
async function checkAuth() {
  const userData = storedUser();

  // Check if essential user data is missing
  if (!userData || !userData.name || (!userData.team_shift && (!userData.team || !userData.shift)) || !userData.role) {
    await NOT_loggedin();
    return false;
  }

  // Construct team_shift if team and shift are separate
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
      credentials: 'include', // Include cookies (e.g., jwt_token)
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.isValid) {
        showAdminFeatures(team, shift, userData.name, userData.role); // Pass team and shift separately
        return true;
      } else {
        console.log('User verification failed (isValid: false), redirecting to login');
        await NOT_loggedin();
        return false;
      }
    } else {
      console.log('Auth check failed with status:', response.status, 'text:', await response.text());
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

// Function to show admin features based on role
function showAdminFeatures(team, shift, username, role) {
  // Show admin menu only for admin role
  adminMenu.style.display = role === "admin" ? "block" : "none";
  
  // Show these elements for all logged-in users
  newPlanButtonDiv.style.display = "block";
  userTeamDiv.style.display = "block";
  loginButton.value = "Uitloggen";

  // Display user info with team and shift
  usernameDisplay.textContent = username || "Unknown";
  teamnameDisplay.textContent = `${team || "No Team"} - Shift: ${shift || "No Shift"}`;

  // Attach New Plan button listener
  if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
      window.location.href = '/proposal';
    });
  }

  // Attach logout handler
  loginButton.onclick = logout;
}

// Function to hide admin features and set login
function hideAdminFeatures() {
  adminMenu.style.display = "none";
  newPlanButtonDiv.style.display = "none";
  userTeamDiv.style.display = "none";
  loginButton.value = "Aanmelden";

  // Attach login handler
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
      window.location.href = '/'; // Redirect to homepage
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Run checkAuth when the page loads
window.onload = checkAuth;