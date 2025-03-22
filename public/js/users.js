// Function to populate shift dropdowns
async function populateShiftDropdown(selectElement, selectedValue = null) {
    try {
        // Replace with your actual API endpoint
        const response = await fetch('/api/users/shifts');
        const availableShifts = await response.json();
        
        selectElement.innerHTML = '';
        availableShifts.forEach(shift => {
            const option = document.createElement('option');
            option.value = shift;  // Adjust based on your API response structure
            option.textContent = shift;
            if (shift === selectedValue) option.selected = true;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching shifts:', error);
        // Fallback to default values if API fails
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
      const response = await fetch('/api/users', {
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
    } catch (error) {
      console.error('Error fetching users:', error);
      console.log('Failed to load users: ' + error.message);
    }
  }
  
  // Populate shift dropdown on page load
  document.addEventListener('DOMContentLoaded', () => {
    const createShiftSelect = document.getElementById('createShift');
    populateShiftDropdown(createShiftSelect);
    displayUsers();
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
      teamname: document.getElementById('createTeamname').value || "default_team" // Add teamname input
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
      document.getElementById('updateTeamname').value = "default_team"; // Add teamname input, adjust as needed
      document.getElementById('updatePassword').value = '';
      document.getElementById('updateModal').style.display = 'block';
  
      document.getElementById('updateUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const updatedUser = {
          shift: document.getElementById('updateShift').value,
          role: document.getElementById('updateRole').value,
          email: document.getElementById('updateEmail').value,
          password: document.getElementById('updatePassword').value || undefined,
          teamname: document.getElementById('updateTeamname').value || "default_team"
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
  
  // Cancel Update
  document.getElementById('cancelUpdate').addEventListener('click', () => {
    document.getElementById('updateModal').style.display = 'none';
  });