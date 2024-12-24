document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById('loginForm');
    const registrationForm = document.getElementById('signup-form');
    const loginErrorMessage = document.getElementById('login-error-message');
    const registerErrorMessage = document.getElementById('register-error-message');
    const logoutButton = document.getElementById('logout-button');

    const baseUrl = `http://localhost:5500`;

    // Login Event 
    if (loginForm) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            const email = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();

            if (!email || !password) {
                loginErrorMessage.textContent = 'Please fill in all fields.';
                return;
            } 
            // else if (password.length < 6) {
            //     loginErrorMessage.textContent = 'Password must be at least 6 characters.';
            //     return;
            // } 
            // else if (password != password.ok || email != email.ok) {
            //     loginErrorMessage.textContent = 'Login failed. Please check your credentials.';
            // }

            try {
                const response = await fetch(`${baseUrl}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Login successful!');
                    localStorage.setItem('userId', data.userId);
                    localStorage.setItem('medications', data.medications);
                    localStorage.setItem('token', data.token);

                    // Add delay before redirecting
                    setTimeout(() => {
                        window.location.href = "calendar/calendar.html";
                    }, 300);
                } else {
                    loginErrorMessage.textContent = data.message || 'Login failed. Please check your credentials.';
                }
            } catch (error) {
                console.error('Error:', error);
                loginErrorMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }

    // Registration Event Listener
    if (registrationForm) {
        registrationForm.addEventListener('submit', async function (event) {
            event.preventDefault();
    
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const confirmPassword = document.getElementById('confirm-password').value.trim();
    
            if (!name || !email || !password || !confirmPassword) {
                registerErrorMessage.textContent = 'Please fill in all fields.';
                return;
            } 
            else if (password.length < 6) {
                registerErrorMessage.textContent = 'Password must be at least 6 characters.';
                return;
            } else if (password !== confirmPassword) {
                registerErrorMessage.textContent = 'Passwords do not match.';
                return;
            }
    
            try {
                const response = await fetch(`${baseUrl}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: name, email, password })
                });
    
                const data = await response.json();
    
                if (response.ok) {
                    alert(data.message);
                    registrationForm.reset();
                    // Add delay before redirecting
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 300);
                } else {
                    registerErrorMessage.textContent = data.message || 'Registration failed.';
                }
            } catch (error) {
                console.error('Error:', error);
                registerErrorMessage.textContent = 'An error occurred. Please try again later.';
            }
        });
    }    

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();

            alert('You have been logged out.');

            setTimeout(() => {
                window.location.href = "index.html";
            }, 300);
        });
    }

    const form = document.querySelector(".profile-form");

    if (form) {
        async function fetchUserProfile(userId) {
            try {
                const response = await fetch(`${baseUrl}/profile/get`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });
        
                const data = await response.json();
        
                if (response.ok) {
                    // Populate the form fields with user data
                    document.getElementById("age").value = data.age || "";
                    document.getElementById("bloodType").value = data.bloodType;
                    document.getElementById("allergies").value = data.allergies || "";
                    document.getElementById("medicalHistory").value = data.medicalHistory;
                } else {
                    alert(data.message || "Failed to fetch user profile. Please check.");
                }
            } catch (error) {
                console.error("Error fetching user profile:", error);
                alert("An error occurred while retrieving the profile.");
            }
        }

        const userId = localStorage.getItem("userId");
        fetchUserProfile(userId)

        form.addEventListener("submit", async function (event) {
            event.preventDefault(); // Prevent default form submission behavior

            const age = document.getElementById("age").value.trim();
            const bloodType = document.getElementById("bloodType").value.trim();
            const allergies = document.getElementById("allergies").value.trim();
            const medicalHistory = document.getElementById("medicalHistory").value.trim();

            if (!age || !bloodType || !allergies || !medicalHistory || !userId) {
                alert("Please fill in all fields."); // Use alert for errors if registerErrorMessage isn't defined
                return;
            }

            try {
                const response = await fetch(`${baseUrl}/profile`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ age, bloodType, allergies, medicalHistory, userId }),
                });

                const data = await response.json();

                if (response.ok) {
                    alert("Save successful!");
                } else {
                    alert(data.message || "Save failed. Please check.");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("An error occurred while saving the profile.");
            }
        });
    }
});

function confirmLogout() {
    if (confirm("Are you sure you want to log out?")) {
        window.location.href = "index.html"; 
        localStorage.clear();
    }
}


