// Import the checkAuth function from the new file
import { checkAuth } from './checkAuth.js';

// Handle Not Logged-In State
function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  // Only redirect to login if the user was previously logged in
  if (localStorage.getItem("user")) {
    window.location.href = '/login';
  }
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
    admin: document.getElementById('admin').value,
    teamname: document.getElementById('teamname').value,
    shift: document.getElementById('shift').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  };

  const userData = JSON.parse(localStorage.getItem("user"));

  if (userData && userData.name && userData.team && userData.shift && userData.role) {
    // Existing user logic
    const teamShift = `${userData.team}-${userData.shift}`;
    const [teamname] = teamShift.split('-'); // Extract teamname from team_shift
    const requestData = {
      username: userData.name,
      teamname: formData.teamname || teamname, // Use form data or existing teamname
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