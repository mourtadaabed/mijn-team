// src/newuser.js 
import { checkAuth } from './checkAuth.js';

// Select elements
const user_team = document.getElementById("user_team");
const current_user = document.getElementById("current_user");
const userName = document.getElementById("username");
const teamName = document.getElementById("teamname");

// Initial user data setup
const userData = storedUser();
const teamShift = userData?.team_shift || (userData?.team && userData?.shift ? `${userData.team}-${userData.shift}` : "No Team-No Shift");
const [teamname, shift] = teamShift.split('-');
const user = userData?.name || "Unknown";
user_team.innerText = "For Team: " + teamShift;
current_user.innerText = "current user: " + user;

let user_name = user;
let team_name = teamname;
let shift_name = shift;

function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return null;
}

function loggedin(userData) {
  user_name = userData.name;
  team_name = userData.team;
  shift_name = userData.shift;
  const teamShiftLocal = userData.team_shift || `${userData.team}-${userData.shift}`;
  if (userName) userName.innerText = user_name;
  if (teamName) teamName.innerText = `${team_name}-${shift_name}`;
  user_team.innerText = "For Team: " + teamShiftLocal;
  current_user.innerText = "current user: " + userData.name;
}

function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

function cancel() {
  document.getElementById("userdata").reset();
  document.getElementById("msg-login").innerText = "";
  if (document.referrer) {
    window.location.href = document.referrer; 
  } else {
    window.location.href = "/";
  }
}

// Updated ID to match HTML: "cancel_button" instead of "cancelButton"
document.getElementById("cancel_button")?.addEventListener("click", cancel);

document.getElementById("userdata").addEventListener("submit", async (event) => {
  event.preventDefault();
  const isLoggedIn = await checkAuth(loggedin, NOT_loggedin);
  if (!isLoggedIn) return;

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const email = document.getElementById("email")?.value;

  document.getElementById("msg-login").textContent = "";
  document.getElementById("msg-login").style.color = "";

  try {
    const response = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ username, password, email, teamname, shift }),
    });

    if (response.ok) {
      document.getElementById("msg-login").textContent = "Registration successful!";
      document.getElementById("msg-login").style.color = "green";
      setTimeout(() => {
        if (document.referrer) {
          window.location.href = document.referrer; 
        } else {
          window.location.href = "/";
        }
      }, 2000);
    } else {
      const errorMessage = await response.text();
      document.getElementById("msg-login").textContent = errorMessage;
      document.getElementById("msg-login").style.color = "red";
    }
  } catch (error) {
    console.error("An error occurred:", error);
    document.getElementById("msg-login").textContent = "An error occurred. Please try again.";
    document.getElementById("msg-login").style.color = "red";
  }
});

window.onload = () => checkAuth(loggedin, NOT_loggedin);

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});