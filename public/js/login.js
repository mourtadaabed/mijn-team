
  
    //Event Listeners to get data to login 
    const cancel_button = document.getElementById("cancel_bt");
    cancel_button.addEventListener("click",cancel );

  function cancel() {
    document.getElementById("userdata").reset();
    document.getElementById("msg-login").innerText="";
    window.location.href = "/";
  }


    //Event Listeners to get data to login 
    document.getElementById("userdata").addEventListener("submit", function (e) {
    e.preventDefault();
    dataoflogin(e.target);
    });
  




  // Handle form submission login
async function dataoflogin(form) {
    const formData = new FormData(form);
    const username = formData.get("username");
    const password = formData.get("password");
  
    form.reset();
  
    try {
      // Wait for the server response
      const success = await senduserdatatoserver(username, password);
  
      if (success) {
        document.getElementById("msg-login").innerText = "";  
      }
    } catch (error) {
      console.error("Error during login:", error);
      // Display the specific error message from the server
      document.getElementById("msg-login").innerText = error.message;
    }
  }
  
  async function senduserdatatoserver(username, password) {
    return fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    })
      .then(async (response) => {
        if (!response.ok) {
          // Parse the error message from the response body
          const errorData = await response.json();
          throw new Error(errorData.message || "Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          logedin(data.user);
          return true;
        } else {
          // Login failed
          console.error("Login failed:", data.message);
          throw new Error(data.message || "Login failed");
        }
      })
      .catch((error) => {
        console.error("Error sending user data to server:", error);
        throw error; // Re-throw the error to handle it in the calling function
      });
  }
  
  

  
  function logedin(user) {
    const choose_shift_form = document.getElementById("choose_shift_form");
    const userdata_form = document.getElementById("userdata");
    const shiftSelect = document.getElementById("shift_select"); // Get the <select> element
    const u_shifts = user.teamname; // Assuming user.teamname contains the list of shifts

    cancel_button.addEventListener("click",logout );
    
    // Check if there are multiple shifts
    if (u_shifts.length > 1) {
        userdata_form.style.display="none";
        choose_shift_form.style.display="block";
        // Clear any existing options in the <select> element (if needed)
        shiftSelect.innerHTML = "";

        // Populate the <select> element with options based on u_shifts
        u_shifts.forEach(shift => {
            const option = document.createElement("option");
            option.value = shift; // Set the value of the option
            option.textContent = shift; // Set the display text of the option
            shiftSelect.appendChild(option); // Add the option to the <select> element

        });
        document.getElementById("choose_shift_form").addEventListener("submit", function (e) {
          e.preventDefault(); // Prevent the form from submitting the traditional way
          setdataToLSandredirect(user.name,handleShiftSelection(e.target));// Call the function to handle the selected shif
      });

    } else {
      setdataToLSandredirect(user.name, user.teamname[0]);

    }
} 
    
 

function handleShiftSelection(form) {
  const shiftSelect = document.getElementById("shift_select"); // Get the <select> element
  const selectedShift = shiftSelect.value; // Get the selected shift value

  return selectedShift;
}
function setdataToLSandredirect(name, shift) {
  // Create an object to store the user's data
  const userData = {
      name: name,
      shift: shift
  };

  // Store the user data in localStorage as a JSON string
  localStorage.setItem("user", JSON.stringify(userData));

  // Redirect the user to the home page or another desired page
  window.location.href = '/';
}

async function logout() {
  try {
    // Send a request to the server to log out
    const response = await fetch('/logout', {
      method: 'POST',
      credentials: 'include', // Include cookies in the request
    });

    if (response.ok) {
       // Remove user data from localStorage
      localStorage.removeItem("user");
      // Clear the JWT cookie on the frontend (if accessible)
      document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/'; 
    } else {
      console.error('Logout failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error during logout:', error);
  }
} 
  