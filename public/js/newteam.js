// Import the checkAuth function from the new file
import { checkAuth } from './checkAuth.js';

// DOM Elements
const menu = document.getElementById("menu");
const menuHr = document.getElementById("menu-hr");
const adminLinks = document.getElementsByClassName("admin-link");
const userTeamDiv = document.getElementById("user_team"); // Updated to select the div
const userName = document.getElementById("username");
const teamNameDisplay = document.getElementById("teamname_display");
const authButton = document.getElementById("auth-button");




function validatePassword(password) {
  return true;
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return "Password must be at least 8 characters long";
  }
  if (!hasUpperCase) {
    return "Password must contain at least one uppercase letter";
  }
  if (!hasLowerCase) {
    return "Password must contain at least one lowercase letter";
  }
  if (!hasNumbers) {
    return "Password must contain at least one number";
  }
  if (!hasSpecialChar) {
    return "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)";
  }
  return true;
}






// Handle Not Logged-In State
function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  // Hide menu and welcome message, show login button
  menu.style.display = "none";
  menuHr.style.display = "none";
  for (let link of adminLinks) {
    link.style.display = "none";
  }
  userTeamDiv.style.display = "none"; // Hide the welcome message div
  userName.innerText = "";
  teamNameDisplay.innerText = "";
  authButton.value = "Login";
  authButton.style.display = "block";
  authButton.onclick = () => window.location.href = '/login';
}

// Handle Logged-In State
function loggedin(userData) {
  const newUserFields = document.getElementById('newUserFields');
  const userInfo = document.getElementById('userInfo');
  const currentUser = document.getElementById('current_user');
  const userTeam = document.getElementById('user_team');

  // Parse team_shift or construct from team and shift
  const teamShift = `${userData.team}-${userData.shift}`;
  const [teamname, shiftname] = teamShift.split('-');

  // Adjust form and display user info
  newUserFields.style.display = 'none';
  document.getElementById('admin').removeAttribute('required');
  document.getElementById('email').removeAttribute('required');
  document.getElementById('password').removeAttribute('required');

  userInfo.style.display = 'block';
  currentUser.textContent = userData.name || "Unknown";
  userTeam.textContent = `${teamname} - Shift: ${shiftname}${userData.role ? ` (Role: ${userData.role})` : ''}`;

  // Show menu and handle admin links visibility
  menu.style.display = "block";
  menuHr.style.display = "block";
  const isAdmin = userData.role === "admin";
  for (let link of adminLinks) {
    link.style.display = isAdmin ? "inline" : "none";
  }

  // Update welcome message and show logout button
  userTeamDiv.style.display = "block"; // Show the welcome message div
  userName.innerText = userData.name || "Unknown";
  teamNameDisplay.innerText = `${userData.team} - Shift: ${userData.shift}`;
  authButton.value = "Uitloggen"; // Dutch for "Logout"
  authButton.style.display = "block";
  authButton.onclick = logout;
}

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

// Adjust form and display user info based on login status
document.addEventListener('DOMContentLoaded', async function () {
  // Check authentication status
  await checkAuth(loggedin, NOT_loggedin);

  // If no user is logged in, show the form for new users
  const userData = JSON.parse(localStorage.getItem("user"));
  if (!userData || userData === "no user stored") {
    const newUserFields = document.getElementById('newUserFields');
    const userInfo = document.getElementById('userInfo');

    newUserFields.style.display = 'block';
    document.getElementById('admin').setAttribute('required', 'true');
    document.getElementById('email').setAttribute('required', 'true');
    document.getElementById('password').setAttribute('required', 'true');
    userInfo.style.display = 'none';
  }
});




// Handle form submission
document.getElementById('teamForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const formData = {
    admin: document.getElementById('admin').value.toLowerCase(),
    teamname: document.getElementById('teamname').value,
    shift: document.getElementById('shift').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  };

  const userData = JSON.parse(localStorage.getItem("user"));

  // Validate password for new users
  if (!userData || !userData.name || !userData.team || !userData.shift || !userData.role) {
    const passwordCheck = validatePassword(formData.password);
    if (passwordCheck !== true) {
      alert(passwordCheck);
      return;
    }
  }

  if (userData && userData.name && userData.team && userData.shift && userData.role) {
    // Existing user logic
    const teamShift = `${userData.team}-${userData.shift}`;
    const [teamname] = teamShift.split('-');
    const requestData = {
      username: userData.name,
      teamname: formData.teamname || teamname,
      shiftname: formData.shift,
    };

    try {
      const response = await fetch('/createTeamForExistingUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      const data = await response.json();
      if (data.success) {
        document.getElementById('teamForm').reset();
        window.location.href = '/';
      } else {
        alert('Error creating team: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while creating the team.');
    }
  } else {
    // New user logic
    if (!formData.admin || !formData.email || !formData.password) {
      alert('Username, email, and password are required for new users.');
      return;
    }

    try {
      const response = await fetch('/createTeam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        document.getElementById('teamForm').reset();
        window.location.href = '/';
      } else {
        alert('Error creating team: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while creating the team.');
    }
  }
});

// Handle Cancel button click
document.getElementById('cancel').addEventListener('click', function (event) {
  event.preventDefault();
  document.getElementById('teamForm').reset();
  if (document.referrer) {
    window.location.href = document.referrer;
  } else {
    window.location.href = '/';
  }
});

// Handle page show event to avoid cache issues
window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    window.location.reload();
  }
});