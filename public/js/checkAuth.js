
function storedUser() {
    const storedUserData = localStorage.getItem("user");
    if (storedUserData) {
      return JSON.parse(storedUserData); // Expecting { name, team, shift, role }
    }
    return "no user stored";
  }
  
  async function checkAuth(loggedin, NOT_loggedin) {
    const userData = storedUser();
    if (userData === "no user stored" || !userData.name || !userData.team || !userData.shift || !userData.role) {
      NOT_loggedin();
      return;
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
        } else {
          NOT_loggedin();
        }
      } else {
        NOT_loggedin();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      NOT_loggedin();
    }
  }
  
  export { checkAuth };