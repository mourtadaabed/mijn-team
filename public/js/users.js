// Import checkAuth if available, or assume a similar mechanism exists
// For this example, I'll simulate it with a utility function
function storedUser() {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
}

// Global variable for user role
let role = storedUser()?.role || "teammember"; // Default to "teammember" if no user data

// Function to populate shift dropdowns
async function populateShiftDropdown(selectElement, selectedValue = null) {
  try {
    const response = await fetch('/shifts_list');
    const availableShifts = await response.json();
    
    selectElement.innerHTML = '';
    availableShifts.forEach(shift => {
      const option = document.createElement('option');
      option.value = shift;
      option.textContent = shift;
      if (shift === selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    const fallbackShifts = ["Aaa", "B", "N", "W"];
    fallbackShifts.forEach(shift => {
      const option = document.createElement('option');
      option.value = shift;
      option.textContent = shift;
      if (shift === selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
  }
}

// Function to fetch and display users
async function displayUsers() {
  try {
    const response = await fetch('/users', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    const tableBody = document.getElementById('usersTable');
    tableBody.innerHTML = '';
    data.users.forEach((user, index) => {
      const row = `
        <tr>
          <td>${user.username}</td>
          <td>${user.shift || 'N/A'}</td>
          <td>${user.role || 'N/A'}</td>
          <td>${user.email}</td>
          <td class="action-buttons">
            <button onclick="showUpdateModal('${user.username}')">Update</button>
            <button class="delete-btn" onclick="deleteUser('${user.username}')">Delete</button>
          </td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
    showAdminFeatures(role); // Call to update visibility after loading users
  } catch (error) {
    console.error('Error fetching users:', error);
    console.log('Failed to load users: ' + error.message);
  }
}

// Show Admin Features
function showAdminFeatures(userRole) {
  const adminLink = document.getElementById("admin-shifts"); // Target the admin-specific link
  if (adminLink) {
    adminLink.style.display = userRole === "admin" ? "inline" : "none"; // Show/hide admin link
  }
  
  // Hide action buttons (Update/Delete) for non-admins
  const actionButtons = document.querySelectorAll('.action-buttons');
  actionButtons.forEach(buttonGroup => {
    buttonGroup.style.display = userRole === "admin" ? "block" : "none";
  });
}

// Populate shift dropdown and load users on page load
document.addEventListener('DOMContentLoaded', async () => {
  const createShiftSelect = document.getElementById('createShift');
  await populateShiftDropdown(createShiftSelect);
  await displayUsers();

  // Simulate fetching current user role (replace with actual auth logic if available)
  const userData = storedUser();
  if (userData) {
    role = userData.role;
    showAdminFeatures(role);
    const userName = document.getElementById("username");
    const teamName = document.getElementById("teamname");
    userName.innerText = userData.name;
    teamName.innerText = `${userData.team}-${userData.shift}`;
  }
});

// Create User
document.getElementById('createUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const newUser = {
    username: document.getElementById('createUsername').value,
    shift: document.getElementById('createShift').value,
    role: document.getElementById('createRole').value,
    email: document.getElementById('createEmail').value,
    password: document.getElementById('createPassword').value,
    teamname: document.getElementById('createTeamname')?.value || "default_team"
  };

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newUser)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    console.log(data.message);
    displayUsers();
    e.target.reset();
    populateShiftDropdown(document.getElementById('createShift'));
  } catch (error) {
    console.error('Error creating user:', error);
    console.log('Failed to create user: ' + error.message);
  }
});

// Delete User
async function deleteUser(username) {
  if (!confirm('Are you sure you want to delete this user?')) return;

  try {
    const response = await fetch(`/api/users/${username}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    console.log(data.message);
    displayUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
    console.log('Failed to delete user: ' + error.message);
  }
}

// Update User
async function showUpdateModal(username) {
  try {
    const response = await fetch(`/api/users/${username}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    const user = data.user;
    document.getElementById('updateUsername').value = user.username;
    const updateShiftSelect = document.getElementById('updateShift');
    populateShiftDropdown(updateShiftSelect, user.shift);
    document.getElementById('updateRole').value = user.role || '';
    document.getElementById('updateEmail').value = user.email || '';
    document.getElementById('updatePassword').value = '';
    document.getElementById('updateModal').style.display = 'block';

    document.getElementById('updateUserForm').onsubmit = async (e) => {
      e.preventDefault();
      const updatedUser = {
        shift: document.getElementById('updateShift').value,
        role: document.getElementById('updateRole').value,
        email: document.getElementById('updateEmail').value,
        password: document.getElementById('updatePassword').value || undefined,
        teamname: document.getElementById('updateTeamname')?.value || "default_team"
      };

      try {
        const updateResponse = await fetch(`/api/users/${username}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedUser)
        });
        const updateData = await updateResponse.json();
        if (!updateData.success) throw new Error(updateData.message);

        console.log(updateData.message);
        displayUsers();
        document.getElementById('updateModal').style.display = 'none';
      } catch (error) {
        console.error('Error updating user:', error);
        console.log('Failed to update user: ' + error.message);
      }
    };
  } catch (error) {
    console.error('Error fetching user for update:', error);
    console.log('Failed to load user data: ' + error.message);
  }
}

const logoutButton = document.getElementById("logout");
logoutButton.onclick = logout;

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

// Cancel Update
document.getElementById('cancelUpdate').addEventListener('click', () => {
  document.getElementById('updateModal').style.display = 'none';
});

const current_team = document.getElementById("current_team");
current_team.innerHTML = "Team : " + (storedUser()?.team || "N/A");