// newshift.js
import { checkAuth } from './checkAuth.js'; // Adjust path as needed

// Select elements
const cancelButton = document.getElementById("cancelButton");
const shiftForm = document.getElementById("newshift");
const user_team = document.getElementById("user_team");
const current_user = document.getElementById("current_user");

// Initial user data setup
const userData = storedUser(); // Define storedUser here or import it
const teamShift = userData?.team_shift || (userData?.team && userData?.shift ? `${userData.team}-${userData.shift}` : "No Team-No Shift");
const [teamname, shift] = teamShift.split('-');
const user = userData?.name || "Unknown";
user_team.innerText = "For Team: " + teamname;
current_user.innerText = "current user: " + user;

// Define storedUser if not imported
function storedUser() {
  const storedUser = localStorage.getItem("user");
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  return null; // Match your original behavior, or use "no user stored"
}

// Define loggedin function
function loggedin(userData) {
  // Update UI with verified data
  user_team.innerText = "For Team: " + userData.team;
  current_user.innerText = "current user: " + userData.name;
}

// Define NOT_loggedin function
function NOT_loggedin() {
  localStorage.removeItem("user");
  document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  window.location.href = '/login';
}

// Add event listener to cancel button
cancelButton.addEventListener("click", function () {
  shiftForm.reset();
  
  window.location.href = "/";
});

// Event listener for form submission
shiftForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const isLoggedIn = await checkAuth(loggedin, NOT_loggedin);
  if (!isLoggedIn) return;

  const shiftname = document.getElementById("shiftname").value.trim();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!shiftname || !username || !password || !email) {
    alert("Please fill in all fields.");
    return;
  }

  await sendToServer({ username, password, email }, teamname, shiftname);
});

// Function to send data to server
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
    if (response.ok) {
      messageBox.textContent = "Shift created successfully!";
      messageBox.style.color = "green";
      setTimeout(() => (window.location.href = "/operators"), 2000);
    } else {
      const errorMessage = await response.text();
      messageBox.textContent = errorMessage;
      messageBox.style.color = "red";
    }
  } catch (error) {
    console.error("An error occurred:", error);
    document.getElementById("msg-login").textContent = "An error occurred. Please try again.";
    document.getElementById("msg-login").style.color = "red";
  }
}

// Call checkAuth when the page loads
window.onload = () => checkAuth(loggedin, NOT_loggedin);

// Handle page show event to avoid cache issues
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    window.location.reload();
  }
});