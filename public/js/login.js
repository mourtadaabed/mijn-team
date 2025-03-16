// ======================
// Cookie Consent Banner
// ======================
document.addEventListener("DOMContentLoaded", function () {
    const cookieConsent = document.getElementById("cookieConsent");
    const acceptCookiesButton = document.getElementById("acceptCookies");

    // Show the banner if the user hasn't accepted cookies yet
    if (!localStorage.getItem("cookiesAccepted")) {
        cookieConsent.style.display = "flex";
    }

    // Handle the accept button click
    acceptCookiesButton.addEventListener("click", function () {
        localStorage.setItem("cookiesAccepted", "true");
        cookieConsent.style.display = "none";
    });
});

// ======================
// Login Form Handling
// ======================
document.getElementById("userdata").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    // Validate form inputs
    if (!username || !password) {
        showMessage("Please fill in all fields.", "error");
        return;
    }

    // Send login data to the server
    try {
        const success = await sendLoginData(username, password);
        if (success) {
            showMessage(" Choos your team!", "success");
        }
    } catch (error) {
        showMessage(error.message, "error");
    }
});

// Function to send login data to the server
async function sendLoginData(username, password) {
    const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed. Please try again.");
    }

    const data = await response.json();
    if (data.success) {
        handleLoginSuccess(data.user);
        return true;
    } else {
        throw new Error(data.message || "Login failed. Please try again.");
    }
}

// Function to handle successful login
function handleLoginSuccess(user) {
    const chooseShiftForm = document.getElementById("choose_shift_form");
    const userDataForm = document.getElementById("userdata");
    const shiftSelect = document.getElementById("shift_select");

    if (!user || !Array.isArray(user.team_shifts)) {
        showMessage("Login error: Invalid user data.", "error");
        return;
    }

    const userShifts = user.team_shifts;

    // If the user has multiple shifts, show the shift selection form
    if (userShifts.length > 1) {
        userDataForm.style.display = "none";
        chooseShiftForm.style.display = "block";
        shiftSelect.innerHTML = "";

        // Populate the shift dropdown
        userShifts.forEach((shift) => {
            const option = document.createElement("option");
            option.value = shift.team_shift;
            option.textContent = shift.team_shift;
            shiftSelect.appendChild(option);
        });

        // Handle shift selection
        document.getElementById("choose_shift_form").addEventListener("submit", function (e) {
            e.preventDefault();
            const selectedShift = shiftSelect.value;
            const [team, shift] = selectedShift.split("-");
            const role = userShifts.find((ts) => ts.team_shift === selectedShift)?.role;
            saveUserDataAndRedirect(user, team, shift, role);
        });
    } else {
        // If the user has only one shift, automatically proceed
        const [team, shift] = userShifts[0].team_shift.split("-");
        const role = userShifts[0].role;
        saveUserDataAndRedirect(user, team, shift, role);
    }
}

// Function to save user data to localStorage and redirect
function saveUserDataAndRedirect(user, team, shift, role) {
    const userData = {
        name: user.name,
        team: team,
        shift: shift,
        role: role,
    };
    localStorage.setItem("user", JSON.stringify(userData));
    window.location.href = "/";
}

// ======================
// Logout Functionality
// ======================
document.getElementById("cancel_bt").addEventListener("click", function () {
    // Directly reset the form and redirect without showing an alert
    document.getElementById("userdata").reset();
    document.getElementById("msg-login").innerText = "";
    window.location.href = "/";
});

async function logout() {
    try {
        const response = await fetch("/logout", {
            method: "POST",
            credentials: "include",
        });

        if (response.ok) {
            localStorage.removeItem("user");
            document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = "/";
        } else {
            console.error("Logout failed:", response.statusText);
        }
    } catch (error) {
        console.error("Error during logout:", error);
    }
}

// ======================
// Authentication Check
// ======================
window.onload = async function () {
    await checkAuth();
};

async function checkAuth() {
    const userData = JSON.parse(localStorage.getItem("user")) || {};
    const { name = "", team = "", shift = "", role = "" } = userData;
    const teamShift = team + "-" + shift;

    if (!name || !team || !shift || !role) {
        return;
    }

    try {
        const response = await fetch("/verify-user", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, teamShift, role }),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.isValid) {
                window.location.href = "/";
            } else {
                showMessage("Session expired. Please log in again.", "error");
                localStorage.removeItem("user");
            }
        } else {
            console.error("Failed to verify user:", response.statusText);
            showMessage("Session expired. Please log in again.", "error");
            localStorage.removeItem("user");
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        showMessage("Session expired. Please log in again.", "error");
        localStorage.removeItem("user");
    }
}

// ======================
// Utility Functions
// ======================
function showMessage(message, type = "info") {
    const messageDiv = document.getElementById("msg-login");
    messageDiv.innerText = message;
    messageDiv.className = type; 
}