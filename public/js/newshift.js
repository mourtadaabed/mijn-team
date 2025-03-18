// newshift.js (updated with debugging)
import { checkAuth } from './checkAuth.js';

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
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return null;
}

function loggedin(userData) {
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
    const data = await response.json(); // Updated to parse JSON
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

window.onload = () => {
  console.log("Window loaded"); // Debug log
  checkAuth(loggedin, NOT_loggedin);
};

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});