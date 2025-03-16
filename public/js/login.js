// Import checkAuth (uncomment if separate file, adjust path as needed)
// import { checkAuth } from './checkAuth.js';

// Event Listeners to get data to login 
const cancel_button = document.getElementById("cancel_bt");
cancel_button.addEventListener("click", cancel);

function cancel() {
    document.getElementById("userdata").reset();
    document.getElementById("msg-login").innerText = "";
    window.location.href = "/";
}

// Event Listeners to get data to login 
document.getElementById("userdata").addEventListener("submit", function (e) {
    e.preventDefault();
    dataoflogin(e.target);
});

// Handle form submission login
async function dataoflogin(form) {
    const formData = new FormData(form);
    const username = formData.get("username");
    const password = formData.get("password");
  
    form.reset();
  
    try {
        const success = await senduserdatatoserver(username, password);
        if (success) {
            document.getElementById("msg-login").innerText = "";  
        }
    } catch (error) {
        console.error("Error during login:", error);
        document.getElementById("msg-login").innerText = error.message;
    }
}

async function senduserdatatoserver(username, password) {
    return fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
    })
    .then(async (response) => {
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Network response was not ok");
        }
        return response.json();
    })
    .then((data) => {
        if (data.success) {
            logedin(data.user);
            return true;
        } else {
            console.error("Login failed:", data.message);
            throw new Error(data.message || "Login failed");
        }
    })
    .catch((error) => {
        console.error("Error sending user data to server:", error);
        throw error;
    });
}

function logedin(user) {
    const choose_shift_form = document.getElementById("choose_shift_form");
    const userdata_form = document.getElementById("userdata");
    const shiftSelect = document.getElementById("shift_select");

    if (!user || !Array.isArray(user.team_shifts)) {
        document.getElementById("msg-login").innerText = "Login error: Invalid user data";
        return;
    }

    const u_shifts = user.team_shifts;
    cancel_button.addEventListener("click", logout);
    
    if (u_shifts.length > 1) {
        userdata_form.style.display = "none";
        choose_shift_form.style.display = "block";
        shiftSelect.innerHTML = "";

        u_shifts.forEach(shift => {
            const option = document.createElement("option");
            option.value = shift.team_shift;
            option.textContent = shift.team_shift;
            shiftSelect.appendChild(option);
        });

        document.getElementById("choose_shift_form").addEventListener("submit", function (e) {
            e.preventDefault();
            const selectedShift = handleShiftSelection(e.target);
            const [team, shift] = selectedShift.split('-');
            const role = u_shifts.find(ts => ts.team_shift === selectedShift)?.role;
            setdataToLSandredirect(user, team, shift, role);
        });
    } else {
        const [team, shift] = u_shifts[0].team_shift.split('-');
        const role = u_shifts[0].role;
        setdataToLSandredirect(user, team, shift, role);
    }
}

function handleShiftSelection(form) {
    const shiftSelect = document.getElementById("shift_select");
    return shiftSelect.value; // Returns e.g., "test-A"
}

function setdataToLSandredirect(user, tea, shif, rol) {
    const userData = {
        name: user.name,
        team: tea,
        shift: shif,
        role: rol
    };
    localStorage.setItem("user", JSON.stringify(userData));
    window.location.href = '/';
}

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

// Add authentication check on page load
async function checkAuth(loggedin, NOT_loggedin) {
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    const { name = '', team = '', shift = '', role = '' } = userData;
    const team_shift = team + '-' + shift;

    if (!name || !team || !shift || !role) {
        NOT_loggedin();
        return;
    }

    try {
        const response = await fetch('/verify-user', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, team_shift, role })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.isValid) {
                loggedin(userData); // Redirects to '/' via setdataToLSandredirect
            } else {
                NOT_loggedin();
            }
        } else {
            console.log('Failed to verify user:', response.statusText);
            NOT_loggedin();
        }
    } catch (error) {
        console.log('Error verifying user:', error);
        NOT_loggedin();
    }
}

function NOT_loggedin() {
    // No action needed here; login form is already visible by default
}

// Define a minimal loggedin for checkAuth to redirect
function loggedinForCheck(userData) {
    window.location.href = '/';
}

// Run checkAuth on page load
window.onload = () => checkAuth(loggedinForCheck, NOT_loggedin);