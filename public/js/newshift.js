// newshift.js (updated with debugging and role restriction)
import { checkAuth } from './checkAuth.js';

// DOM Elements
const cancelButton = document.getElementById("cancelButton");
const shiftForm = document.getElementById("newshift");
const user_team = document.getElementById("user_team");
const current_user = document.getElementById("current_user");

// Debugging: Check if elements are found
console.log({ cancelButton, shiftForm, user_team, current_user });
if (!shiftForm) console.error("Form element not found!");
if (!cancelButton) console.error("Cancel button not found!");

// Initial user data setup
const userData = storedUser();
const teamShift = userData?.team_shift || (userData?.team && userData?.shift ? `${userData.team}-${userData.shift}` : "No Team-No Shift");
const [teamname, shift] = teamShift.split('-');
const user = userData?.name || "Unknown";
user_team.innerText = "For Team: " + teamname;
current_user.innerText = "current user: " + user;

function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
}

function loggedin(userData) {
  // Check if the user has the "admin" role
  if (userData.role !== "admin") {
    window.location.href = "/notAuthorized"; // Redirect non-admin users to notAuthorized page
    return;
  }

  // Proceed with page setup for admin users
  user_team.innerText = "For Team: " + userData.team;
  current_user.innerText = "current user: " + userData.name;
}

function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

// Cancel button event
if (cancelButton) {
  cancelButton.addEventListener("click", function () {
    shiftForm.reset();
    window.location.href = "/";
  });
}

// Form submission event
if (shiftForm) {
  shiftForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    console.log("Form submitted"); // Debug log

    const isLoggedIn = await checkAuth(loggedin, NOT_loggedin);
    console.log("isLoggedIn:", isLoggedIn); // Debug log
    if (!isLoggedIn) return;

    // Double-check role here in case checkAuth doesn't call loggedin immediately
    const currentUser = storedUser();
    if (currentUser.role !== "admin") {
      window.location.href = "/notAuthorized"; // Redirect non-admin users to notAuthorized page
      return;
    }

    const shiftname = document.getElementById("shiftname").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    console.log({ shiftname, username, password, email }); // Debug log
    if (!shiftname || !username || !password || !email) {
      alert("Please fill in all fields.");
      return;
    }

    await sendToServer({ username, password, email }, teamname, shiftname);
  });
}

async function sendToServer(user, teamname, shiftname) {
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
    console.log("Response status:", response.status); // Debug log

    // Handle JSON response from server
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

// Page initialization
window.onload = () => {
  console.log("Window loaded"); // Debug log
  checkAuth(loggedin, NOT_loggedin);
};

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});