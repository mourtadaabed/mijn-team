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
    return JSON.parse(storedUser);
  }
  return null;
}

// Function to check authentication status
async function checkAuth() {
  console.log('Checking auth status...');
  try {
    const response = await fetch('/check-auth', {
      method: 'GET',
      credentials: 'include', // Include cookies (e.g., jwt_token)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Auth response:', data);
      if (data.isAuthenticated) {
        console.log('User is authenticated, showing admin features');
        showAdminFeatures();
      } else {
        console.log('User is not authenticated, hiding admin features');
        hideAdminFeatures();
      }
    } else {
      console.log('Failed to check auth:', response.statusText);
      hideAdminFeatures();
    }
  } catch (error) {
    console.log('Error checking auth:', error);
    hideAdminFeatures();
  }
}

// Function to show admin features and set logout
function showAdminFeatures() {
  const user = storedUser();
  adminMenu.style.display = "block";
  newPlanButtonDiv.style.display = "block";
  userTeamDiv.style.display = "block";
  loginButton.value = "Uitloggen";

  // Display user info if available
  if (user) {
    usernameDisplay.textContent = user.name || "Unknown";
    teamnameDisplay.textContent = user.shift || "No Team";
  } else {
    usernameDisplay.textContent = "Unknown";
    teamnameDisplay.textContent = "No Team";
  }

  // Attach New Plan button listener
  if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
      console.log('New Plan button clicked, redirecting to /proposal');
      window.location.href = '/proposal';
    });
  } else {
    console.log("New Plan button not found in DOM");
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
  console.log('Login button clicked, redirecting to /login');
  window.location.href = '/login';
}

// Logout handler
async function logout() {
  console.log('Logout button clicked');
  try {
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.removeItem("user");
      console.log('Logout successful, redirecting to homepage');
      window.location.href = '/'; // Redirect to homepage instead of reload
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// Run checkAuth when the page loads
window.onload = checkAuth;