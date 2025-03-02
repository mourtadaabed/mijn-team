// Handle form submission
document.getElementById('teamForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get form data
    const formData = {
        admin: document.getElementById('admin').value,
        teamname: document.getElementById('teamname').value,
        shift: document.getElementById('shift').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value
    };

    // Send data to the server
    fetch('/createTeam', { 
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            
            // reset the form
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
});



// Handle Cancel button click
document.getElementById('cancel').addEventListener('click', function(event) {
    event.preventDefault(); // Prevent the default button behavior (if any)
    // Clear all form fields
    document.getElementById('teamForm').reset();
    window.location.href = '/';
});