// checkAuth.js
async function checkAuth(loggedin, NOT_loggedin) {
  const userData = storedUser();


  // Check if user data is valid
  if (userData === "no user stored" || !userData.name || !userData.team || !userData.shift || !userData.role) {
    NOT_loggedin();
    return false; // Explicitly return false
  }

  const team_shift = `${userData.team}-${userData.shift}`;

  try {
    const response = await fetch('/verify-user', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: userData.name,
        team_shift,
        role: userData.role
      })
    });


    if (response.ok) {
      const data = await response.json();
      if (data.isValid) {
        loggedin(userData);
        return true; // User is authenticated
      } else {
        NOT_loggedin();
        return false; // Server says user is not valid
      }
    } else {
      NOT_loggedin();
      return false; // Server error or unauthorized
    }
  } catch (error) {
    console.error('checkAuth: Error checking auth:', error);
    NOT_loggedin();
    return false; // Network or other error
  }
}

function storedUser() {
  const storedUserData = localStorage.getItem("user");
  if (storedUserData) {
    return JSON.parse(storedUserData); // Expecting { name, team, shift, role }
  }
  return "no user stored";
}

export { checkAuth };