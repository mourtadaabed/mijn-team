// DOM Elements (Declared at the top to ensure availability)
const menuContainer = document.getElementById("menu-container");
const userTeamDiv = document.getElementById("user_team");
const usernameDisplay = document.getElementById("usernameDisplay");
const teamnameDisplay = document.getElementById("teamname");
const loginButton = document.getElementById("login");
const adminLinks = document.querySelectorAll(".admin-link");
const newPlanButtonContainer = document.getElementById("new_plan_button"); // Ensure this is defined here

// New Plan Button Event Listener
const newPlanButton = document.querySelector("#new_plan_button .big-button");
if (newPlanButton) {
  newPlanButton.addEventListener("click", function () {
    window.location.href = '/proposal';
  });
}

// Contact form submission
document.getElementById('contactForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const message = document.getElementById('message').value;

    fetch('/api/contact', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message }),
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('responseMessage').textContent = data.message;
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

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
                showUserFeatures(team, shift, userData.name, userData.role);
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
    hideUserFeatures();
}

// Function to show user features based on role
function showUserFeatures(team, shift, username, role) {
    menuContainer.style.display = "block";  // Show menu for authenticated users
    adminLinks.forEach(link => {
        link.style.display = role === "admin" ? "inline" : "none";
    });
    
    userTeamDiv.style.display = "block";
    newPlanButtonContainer.style.display = "block"; // Show the New Plan button
    loginButton.value = "Uitloggen";

    usernameDisplay.textContent = username || "Unknown";
    teamnameDisplay.textContent = `${team || "No Team"} - Shift: ${shift || "No Shift"}`;

    loginButton.onclick = logout;
}

// Function to hide user features
function hideUserFeatures() {
    menuContainer.style.display = "none";  // Hide menu for unauthenticated users
    adminLinks.forEach(link => {
        link.style.display = "none";
    });
    userTeamDiv.style.display = "none";
    newPlanButtonContainer.style.display = "none"; // Hide the New Plan button
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