import { checkAuth } from './checkAuth.js'; // Assuming checkAuth.js exists and exports checkAuth

// DOM Elements
const shiftForm = document.getElementById("newshift");
const adminLink = document.getElementById("admin-link");
const userName = document.getElementById("un");
const teamName = document.getElementById("teamname");
const shiftsBody = document.getElementById("shiftsBody");
const logoutButton = document.getElementById("logout");
const newPlanButton = document.querySelector("#new_plan_button .big-button");
const shiftFilter = document.getElementById("shiftFilter");

// Store user data from localStorage
function storedUser() {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
}

// Initialize variables with fallback
const userData = storedUser() || {};
let currentTeam = userData.team || '';
let currentRole = userData.role || '';
let currentUser = userData.name || '';
let allShifts = []; // Store all shifts for filtering

// Login state handling
function loggedin(userData) {
    userName.innerText = userData.name || "Unknown";
    teamName.innerText = `${userData.team || "N/A"}-${userData.shift || "N/A"}`;
    showAdminFeatures(userData.role);
    
    currentUser = userData.name || '';
    currentTeam = userData.team || '';
    currentRole = userData.role || '';
}

function NOT_loggedin() {
    localStorage.removeItem("user");
    document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = '/login';
}

function showAdminFeatures(userRole) {
    if (adminLink) adminLink.style.display = userRole === "admin" ? "inline" : "none";
    if (shiftForm) shiftForm.style.display = userRole === "admin" ? "block" : "none";
}

// Form submission for creating a new shift
if (shiftForm) {
    shiftForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        const isLoggedIn = await checkAuth(loggedin, NOT_loggedin);
        if (!isLoggedIn) return;

        if (currentRole !== "admin") {
            window.location.href = "/notAuthorized";
            return;
        }

        // Get the shift name and convert to uppercase
        const shiftname = document.getElementById("shiftname").value.trim().toUpperCase();
        if (!shiftname) {
            alert("Shift name is required.");
            return;
        }
        await createNewShift(currentUser, currentTeam, shiftname);
    });
}

// Create a new shift
async function createNewShift(usrname, team, newshift) {
    try {
        const response = await fetch("/newShift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ usrname, team, newshift }), 
        });

        const messageBox = document.getElementById("msg-login");
        const data = await response.json();
        if (response.ok) {
            messageBox.textContent = data.message || "Shift created successfully!";
            messageBox.style.color = "green";
            fetchAndDisplayShifts(); // Refresh the shifts table
            shiftForm.reset(); // Clear the form
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

// Fetch and display all shifts
async function fetchAndDisplayShifts() {
    try {
        const response = await fetch(`/shifts_of_team?teamname=${encodeURIComponent(currentTeam)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to fetch shifts");
        const data = await response.json();
        allShifts = data.shifts; // Store all shifts for filtering
        populateShiftFilter(allShifts); // Populate dropdown
        filterAndDisplayShifts(); // Display filtered shifts
    } catch (error) {
        console.error("Error fetching shifts:", error);
        shiftsBody.innerHTML = "<tr><td colspan='4'>Error loading shifts</td></tr>";
    }
}

// Populate shift filter dropdown
function populateShiftFilter(shifts) {
    const uniqueShifts = [...new Set(shifts.map(shift => shift.shiftname))]; // Get unique shift names
    shiftFilter.innerHTML = '<option value="">All Shifts</option>'; // Reset dropdown
    uniqueShifts.forEach(shiftName => {
        const option = document.createElement("option");
        option.value = shiftName;
        option.textContent = shiftName;
        shiftFilter.appendChild(option);
    });
}

// Filter and display shifts based on dropdown selection
function filterAndDisplayShifts() {
    const selectedShift = shiftFilter.value;
    const filteredShifts = selectedShift 
        ? allShifts.filter(shift => shift.shiftname === selectedShift) 
        : allShifts;
    populateShiftsTable(filteredShifts);
}

// Fetch team users for the update modal
async function fetchTeamUsers(teamname) {
    try {
        const response = await fetch(`/team_users?teamname=${encodeURIComponent(teamname)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch team users");
        const data = await response.json();
        return data.users;
    } catch (error) {
        console.error("Error fetching team users:", error);
        return [];
    }
}

// Populate shifts table
function populateShiftsTable(shifts) {
    shiftsBody.innerHTML = "";
    if (!shifts || shifts.length === 0) {
        shiftsBody.innerHTML = "<tr><td colspan='4'>No shifts available</td></tr>";
        return;
    }

    shifts.forEach((shift) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${shift.shiftname || "N/A"}</td>
            <td>${shift.username || "N/A"}</td>
            <td>${shift.role || "N/A"}</td>
            <td>
                <button class="delete-shift" data-shift="${shift.shiftname}" data-team="${shift.teamname}">Delete</button>
                <button class="update-shift" data-shift="${shift.shiftname}" data-team="${shift.teamname}" data-username="${shift.username}" data-role="${shift.role}">Update</button>
            </td>
        `;
        shiftsBody.appendChild(row);
    });

    // Delete button listeners
    document.querySelectorAll(".delete-shift").forEach((button) => {
        button.addEventListener("click", async (e) => {
            const shiftname = e.target.dataset.shift;
            const teamname = e.target.dataset.team;
            await deleteShift(shiftname, teamname);
        });
    });

    // Update button listeners
    const modal = document.getElementById("updateShiftModal");
    const closeModal = document.querySelector(".close-modal");
    const updateForm = document.getElementById("updateShiftForm");
    const shiftNameInput = document.getElementById("updateShiftName");
    const userSelect = document.getElementById("assignUser");
    const roleSelect = document.getElementById("assignRole");

    document.querySelectorAll(".update-shift").forEach((button) => {
        button.addEventListener("click", async (e) => {
            const shiftname = e.target.dataset.shift;
            const teamname = e.target.dataset.team;
            const currentUsername = e.target.dataset.username;
            const currentRole = e.target.dataset.role;

            // Populate form
            shiftNameInput.value = shiftname;
            
            // Fetch and populate team users
            const users = await fetchTeamUsers(teamname);
            userSelect.innerHTML = '<option value="">Select a user</option>';
            users.forEach(user => {
                const option = document.createElement("option");
                option.value = user.name;
                option.text = user.name;
                if (user.name === currentUsername) option.selected = true;
                userSelect.appendChild(option);
            });

            // Populate role dropdown with current role selected
            roleSelect.innerHTML = `
                <option value="admin" ${currentRole === "admin" ? "selected" : ""}>Admin</option>
                <option value="user" ${currentRole === "user" ? "selected" : ""}>User</option>
            `;

            modal.style.display = "block";

            // Handle form submission
            updateForm.onsubmit = async (e) => {
                e.preventDefault();
                const newShiftName = shiftNameInput.value.trim().toUpperCase();
                const newUsername = userSelect.value;
                const newRole = roleSelect.value;
                if (!newShiftName) {
                    alert("Shift name is required.");
                    return;
                }
                if (!newUsername || !newRole) {
                    alert("Please select a user and a role.");
                    return;
                }
                await updateShift(shiftname, teamname, newShiftName, newUsername, newRole);
                modal.style.display = "none";
            };
        });
    });

    // Close modal
    closeModal.onclick = () => modal.style.display = "none";
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = "none";
    };
}

// Delete a shift
async function deleteShift(shiftname, teamname) {
    if (!confirm(`Are you sure you want to delete shift '${shiftname}' from team '${teamname}'?`)) return;

    try {
        const response = await fetch("/deleteShift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ shiftname, teamname }),
        });

        const messageBox = document.getElementById("msg-login");
        const data = await response.json();
        if (response.ok) {
            messageBox.textContent = data.message || "Shift deleted successfully!";
            messageBox.style.color = "green";
            fetchAndDisplayShifts(); // Refresh the table
        } else {
            messageBox.textContent = data.message || "Failed to delete shift.";
            messageBox.style.color = "red";
        }
    } catch (error) {
        console.error("Error deleting shift:", error);
        const messageBox = document.getElementById("msg-login");
        messageBox.textContent = "Network error. Please try again.";
        messageBox.style.color = "red";
    }
}

// Update a shift
async function updateShift(oldShiftName, teamname, newShiftName, newUsername, newRole) {
    try {
        const response = await fetch("/updateShift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ oldShiftName, teamname, newShiftName, newUsername, newRole }),
        });

        const messageBox = document.getElementById("msg-login");
        const data = await response.json();
        if (response.ok) {
            messageBox.textContent = data.message || "Shift updated and user assigned successfully!";
            messageBox.style.color = "green";
            fetchAndDisplayShifts(); // Refresh the table
        } else {
            messageBox.textContent = data.message || "Failed to update shift.";
            messageBox.style.color = "red";
        }
    } catch (error) {
        console.error("Error updating shift:", error);
        const messageBox = document.getElementById("msg-login");
        messageBox.textContent = "Network error. Please try again.";
        messageBox.style.color = "red";
    }
}

// Logout function
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

// Event listeners
logoutButton.onclick = logout;

if (newPlanButton) {
    newPlanButton.addEventListener("click", function () {
        window.location.href = '/proposal';
    });
}

shiftFilter.addEventListener("change", filterAndDisplayShifts); // Filter shifts on dropdown change

// Page initialization
window.onload = () => {
    checkAuth(loggedin, NOT_loggedin).then((isLoggedIn) => {
        if (isLoggedIn) fetchAndDisplayShifts();
    });
};

window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
});