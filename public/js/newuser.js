const user_team = document.getElementById("user_team");
const current_user = document.getElementById("current_user");
const fullTeamName = storedUser().shift;
const [teamname, shift] = fullTeamName.split('-');
const user = storedUser().name;
user_team.innerText="For Team: "+storedUser().shift;
current_user.innerText="current user: "+user;
function cancel() {
    document.getElementById("userdata").reset();
    document.getElementById("msg-login").innerText="";
    if (document.referrer) {
        window.location.href = document.referrer; 
    } else {
         window.location.href = "/";
    }

  }
localStorage
// Function to handle form submission
document.getElementById("userdata").addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    // Get the form data
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const email = document.getElementById("email").value;

    // Clear any previous messages
    document.getElementById("msg-login").textContent = "";
    document.getElementById("msg-login").style.color = "";


    try {
        // Send a POST request to the /register endpoint
        const response = await fetch("/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password, email, teamname, shift }), // Send the data as JSON
        });

        // Handle the response
        if (response.ok) {
            // Registration successful
            document.getElementById("msg-login").textContent = "Registration successful!";
            document.getElementById("msg-login").style.color = "green";
            if (document.referrer) {
                window.location.href = document.referrer; 
            } else {
                 window.location.href = "/";
            }

        } else {
            // Handle errors (e.g., user already exists)
            const errorMessage = await response.text(); // Get the error message from the server
            document.getElementById("msg-login").textContent = errorMessage;
            document.getElementById("msg-login").style.color = "red";
        }
    } catch (error) {
        // Handle network or other errors
        console.error("An error occurred:", error);
        document.getElementById("msg-login").textContent = "An error occurred. Please try again.";
        document.getElementById("msg-login").style.color = "red";
    }
});

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