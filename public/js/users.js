const createShiftSelect = document.getElementById('createShift');
const userFilter = document.getElementById('userFilter'); // New DOM element for user filter

function validatePassword(password) {
  return true;
  if (!password) return true; // Allow empty password for updates where password isn't changed
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

function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
}

const userData = storedUser();
let role = userData?.role;
let currentTeam = userData?.team;
let allUsers = []; // Store all users for filtering

fetchTeamShifts(currentTeam);

async function fetchTeamShifts(teamName) {
  try {
    if (!teamName) {
      throw new Error("No team name provided");
    }
    const response = await fetch(`/shifts_list?team=${encodeURIComponent(teamName)}`, {
      signal: AbortSignal.timeout(10000), // Timeout after 10 seconds
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data; // Array of shift names
  } catch (error) {
    console.error('Error fetching shifts:', error.message);
    return [];
  }
}

function populateShiftDropdown(selectElement, shifts, selectedShift) {
  selectElement.innerHTML = '';
  shifts.forEach(shift => {
    const option = document.createElement('option');
    option.value = shift;
    option.textContent = shift;
    if (shift === selectedShift) option.selected = true; // Pre-select the current shift
    selectElement.appendChild(option);
  });
}

async function fetchAndDisplayUsers(teamName) {
  try {
    if (!teamName) {
      throw new Error("Team name is required");
    }
    const url = `/users_of_team?team=${encodeURIComponent(teamName)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    allUsers = data.users; // Store all users for filtering
    populateUserFilter(allUsers); // Populate user dropdown
    filterAndDisplayUsers(); // Display filtered users
  } catch (error) {
    console.error('Error fetching users:', error);
    document.getElementById('usersTable').innerHTML = '<tr><td colspan="5">Failed to load users: ' + error.message + '</td></tr>';
  }
}

// Populate user filter dropdown
function populateUserFilter(users) {
  const uniqueUsers = [...new Set(users.map(user => user.username))]; // Get unique usernames
  userFilter.innerHTML = '<option value="">All Users</option>'; // Reset dropdown
  uniqueUsers.forEach(username => {
    const option = document.createElement('option');
    option.value = username;
    option.textContent = username;
    userFilter.appendChild(option);
  });
}

// Filter and display users based on dropdown selection
function filterAndDisplayUsers() {
  const selectedUser = userFilter.value;
  const filteredUsers = selectedUser 
    ? allUsers.filter(user => user.username === selectedUser) 
    : allUsers;
  displayUsersTable(filteredUsers);
}

// Display users in table
function displayUsersTable(users) {
  const tableBody = document.getElementById('usersTable');
  tableBody.innerHTML = '';
  if (!users || users.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5">No users available</td></tr>';
    return;
  }

  users.forEach((user) => {
    const row = `
      <tr>
        <td>${user.username}</td>
        <td>${user.shift || 'N/A'}</td>
        <td>${user.role || 'N/A'}</td>
        <td>${user.email}</td>
        <td class="action-buttons">
          <button onclick="showUpdateModal('${user.username}', '${currentTeam}', '${user.shift}')">Update</button>
          <button class="delete-btn" onclick="deleteUser('${user.username}', '${currentTeam}', '${user.shift}')">Delete</button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
  
  showAdminFeatures(role);
}

// Show Admin Features
function showAdminFeatures(userRole) {
  const adminLink = document.getElementById("admin-shifts");
  if (adminLink) {
    adminLink.style.display = userRole === "admin" ? "inline" : "none";
  }
  
  const actionButtons = document.querySelectorAll('.action-buttons');
  actionButtons.forEach(buttonGroup => {
    buttonGroup.style.display = userRole === "admin" ? "block" : "none";
  });
}

// Populate shift dropdown and load users on page load
document.addEventListener('DOMContentLoaded', async () => {
  if (currentTeam) {
    const shifts = await fetchTeamShifts(currentTeam);
    if (shifts) populateShiftDropdown(createShiftSelect, shifts, userData?.shift);
    await fetchAndDisplayUsers(currentTeam);
  }

  if (userData) {
    role = userData.role;
    showAdminFeatures(role);
    const userName = document.getElementById("username");
    const teamName = document.getElementById("teamname");
    if (userName) userName.innerText = userData.name;
    if (teamName) teamName.innerText = `${userData.team}-${userData.shift}`;
  }
});

document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUser = {
    username: document.getElementById('createUsername').value.toLowerCase(),
    shift: document.getElementById('createShift').value,
    role: document.getElementById('createRole').value,
    email: document.getElementById('createEmail').value,
    password: document.getElementById('createPassword').value,
    teamname: document.getElementById('createTeamname')?.value || currentTeam
  };

  const passwordCheck = validatePassword(newUser.password);
  if (passwordCheck !== true) {
    alert(passwordCheck);
    return;
  }

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser)
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Unknown error occurred');
    }

    fetchAndDisplayUsers(currentTeam);
    e.target.reset();
  } catch (error) {
    console.error('Error creating user:', error);
    alert('Failed to create user: ' + error.message);
  }
});

// Delete a specific team_shift from a user's team_shifts array
async function deleteUser(username, teamName, shift) {
  if (!confirm(`Are you sure you want to delete ${username}'s ${teamName}-${shift} assignment?`)) return;

  try {
    const response = await fetch(`/api/users/team_shift`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, team: teamName, shift })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    
    fetchAndDisplayUsers(teamName);
  } catch (error) {
    console.error('Error deleting team_shift:', error);
    alert('Failed to delete team_shift: ' + error.message);
  }
}

async function showUpdateModal(username, teamName, shift) {
  try {
    const response = await fetch(`/api/users/${username}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Unknown error fetching user');

    const user = data.user;
    const teamShift = user.team_shifts.find(ts => ts.team_shift === `${teamName}-${shift}`);
    if (!teamShift) {
      throw new Error(`Team shift ${teamName}-${shift} not found for user ${username}`);
    }

    document.getElementById('updateUsername').value = user.username.toLowerCase();
    const updateShiftSelect = document.getElementById('updateShift');
    
    const teamShifts = await fetchTeamShifts(teamName);
    if (teamShifts && teamShifts.length > 0) {
      populateShiftDropdown(updateShiftSelect, teamShifts, shift);
    } else {
      updateShiftSelect.innerHTML = '<option value="">No shifts available</option>';
    }

    document.getElementById('updateRole').value = teamShift.role || '';
    document.getElementById('updateEmail').value = user.email || '';
    document.getElementById('updatePassword').value = '';
    document.getElementById('updateModal').style.display = 'block';

    document.getElementById('updateUserForm').onsubmit = async (e) => {
      e.preventDefault();
      const newUsername = document.getElementById('updateUsername').value.toLowerCase();
      const newShift = document.getElementById('updateShift').value;
      const updatedTeamShift = {
        oldUsername: username,
        newUsername: newUsername,
        team: teamName,
        oldShift: shift,
        newShift: newShift,
        role: document.getElementById('updateRole').value,
        email: document.getElementById('updateEmail').value,
        password: document.getElementById('updatePassword').value || undefined
      };

      if (updatedTeamShift.password) {
        const passwordCheck = validatePassword(updatedTeamShift.password);
        if (passwordCheck !== true) {
          alert(passwordCheck);
          return;
        }
      }

      try {
        const updateResponse = await fetch(`/api/users/team_shift`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedTeamShift)
        });
        const updateData = await updateResponse.json();
        if (!updateData.success) throw new Error(updateData.message);
        fetchAndDisplayUsers(teamName);
        document.getElementById('updateModal').style.display = 'none';
      } catch (error) {
        console.error('Error updating team_shift:', error);
        alert('Failed to update team_shift: ' + error.message);
      }
    };
  } catch (error) {
    console.error('Error fetching user for update:', error);
    alert('Failed to load user data: ' + error.message);
  }
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

const logoutButton = document.getElementById("logout");
if (logoutButton) logoutButton.onclick = logout;

const newPlanButton = document.querySelector("#new_plan_button .big-button");
if (newPlanButton) {
  newPlanButton.addEventListener("click", function () {
    window.location.href = '/proposal';
  });
}

document.getElementById('cancelUpdate').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});

const current_team = document.getElementById("current_team");
if (current_team) {
  current_team.innerHTML = "Team : " + (storedUser()?.team || "N/A");
}

// Add event listener for user filter
userFilter.addEventListener("change", filterAndDisplayUsers);