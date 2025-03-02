// Select elements
const cancelButton = document.getElementById("cancelButton");
const shiftForm = document.getElementById("newshift");
const user_team = document.getElementById("user_team");
const current_user = document.getElementById("current_user");
const fullTeamName = storedUser().shift;
const [teamname, shift] = fullTeamName.split('-');
const user = storedUser().name;
user_team.innerText="For Team: "+teamname;
current_user.innerText="current user: "+user;


// Add event listener to cancel button
cancelButton.addEventListener("click", function () {
    // Clear the form inputs
    shiftForm.reset();

    // Show a confirmation message
    console.log("Form has been reset.");
    if (document.referrer) {
        window.location.href = document.referrer; 
    } else {
         window.location.href = "/";
    }


});

// Event listener for form submission
shiftForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Extract values from form inputs
    const shiftname = document.getElementById("shiftname").value.trim();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const email = document.getElementById("email").value.trim();

    if (!shiftname || !username || !password || !email) {
        alert("Please fill in all fields.");
        return;
    }

    // Send data to the server
    await sendToServer({ username, password, email }, teamname, shiftname);
});

// Function to send data to server
async function sendToServer(user, teamname, shiftname) {
    try {
        const response = await fetch("/newShift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username: user.username, 
                password: user.password, 
                email: user.email, 
                teamname, 
                shiftname 
            }),
        });

        // Handle server response
        const messageBox = document.getElementById("msg-login");
        if (response.ok) {
            messageBox.textContent = "Shift created successfully!";
            messageBox.style.color = "green";
            setTimeout(() => (window.location.href = "/operators"), 2000); // Redirect after success
        } else {
            const errorMessage = await response.text();
            messageBox.textContent = errorMessage;
            messageBox.style.color = "red";
        }
    } catch (error) {
        console.error("An error occurred:", error);
        document.getElementById("msg-login").textContent = "An error occurred. Please try again.";
        document.getElementById("msg-login").style.color = "red";
    }
}


async function checkAuth() {
    try {
        // Fetch authentication status from the server
        const response = await fetch('/check-auth', {
            credentials: 'include', // Include cookies in the request
        });
  
        // Check if the response is OK (status code 200-299)
        if (response.ok) {
            const data = await response.json();
  
            // If the user is not authenticated, redirect to the login page
            if (!data.isAuthenticated) {
                console.log('User is not authenticated. Redirecting to login page...');
                window.location.href = '/login';
            }
        } else {
            // Handle non-OK responses (e.g., 401 Unauthorized)
            const errorData = await response.json();
            console.error('Authentication check failed:', errorData.message);
  
            // Redirect to the login page if the token is missing or invalid
            if (response.status === 401) {
                console.log('No token provided or token is invalid. Redirecting to login page...');
                window.location.href = '/login';
            }
        }
    } catch (error) {
        // Handle network errors or other exceptions
        console.error('Error checking authentication status:', error);
  
        // Optionally, redirect to the login page in case of unexpected errors
        window.location.href = '/login';
    }
  }
  
  function storedUser() {
    // Retrieve user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      return userData;
    }
    return "no user stored";    
  }
  
  
  // Call checkAuth when the page loads
  window.onload = checkAuth;
  
  
  window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
  // Page was loaded from the cache, force a reload
  window.location.reload();
  }
  });