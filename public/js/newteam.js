// Check authentication status
async function checkAuth() {
    try {
      const response = await fetch('/check-auth', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        return data.isAuthenticated;
      } else {
        console.log('Auth check failed, assuming not logged in');
        return false;
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      return false;
    }
  }
  
  // Get stored user data
  function storedUser() {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  }
  
  // Adjust form and display user info based on login status
  document.addEventListener('DOMContentLoaded', async function() {
    const isLoggedIn = await checkAuth();
    const userData = storedUser();
    const newUserFields = document.getElementById('newUserFields');
    const userInfo = document.getElementById('userInfo');
    const currentUser = document.getElementById('current_user');
    const userTeam = document.getElementById('user_team');
  
    if (isLoggedIn && userData) {
      // Hide new user fields
      newUserFields.style.display = 'none';
      document.getElementById('admin').removeAttribute('required');
      document.getElementById('email').removeAttribute('required');
      document.getElementById('password').removeAttribute('required');
  
      // Show and populate user info within the form
      userInfo.style.display = 'block';
      currentUser.textContent = userData.name || "Unknown";
      if (userData.shift) {
        const [teamname, shiftname] = userData.shift.split('-');
        userTeam.textContent = `${teamname} - Shift: ${shiftname}`;
      } else {
        userTeam.textContent = "No team-shift assigned";
      }
    } else {
      // Show new user fields, hide user info
      newUserFields.style.display = 'block';
      document.getElementById('admin').setAttribute('required', 'true');
      document.getElementById('email').setAttribute('required', 'true');
      document.getElementById('password').setAttribute('required', 'true');
      userInfo.style.display = 'none';
    }
  });
  
  // Handle form submission
  document.getElementById('teamForm').addEventListener('submit', async function(event) {
    event.preventDefault();
  
    const formData = {
      admin: document.getElementById('admin').value,
      teamname: document.getElementById('teamname').value,
      shift: document.getElementById('shift').value,
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
    };
  
    const isLoggedIn = await checkAuth();
    const userData = storedUser();
  
    if (isLoggedIn && userData) {
      const requestData = {
        username: userData.name,
        teamname: formData.teamname,
        shiftname: formData.shift,
      };
  
      fetch('/createTeamForExistingUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            document.getElementById('teamForm').reset();
            window.location.href = '/';
          } else {
            alert('Error creating team: ' + data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while creating the team.');
        });
    } else {
      if (!formData.admin || !formData.email || !formData.password) {
        alert('Username, email, and password are required for new users.');
        return;
      }
  
      fetch('/createTeam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            document.getElementById('teamForm').reset();
            window.location.href = '/';
          } else {
            alert('Error creating team: ' + data.message);
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('An error occurred while creating the team.');
        });
    }
  });
  
  // Handle Cancel button click
  document.getElementById('cancel').addEventListener('click', function(event) {
    event.preventDefault();
    document.getElementById('teamForm').reset();
    if (document.referrer) {
      window.location.href = document.referrer;
    } else {
      window.location.href = '/';
    }
  });
  
  // Handle page show event to avoid cache issues
  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      window.location.reload();
    }
  });