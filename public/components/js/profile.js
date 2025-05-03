/**
 * Profile Photo Handler
 * Ensures profile photos persist correctly across login sessions
 */

// Function to update profile photo in all places
function updateProfilePhoto(photoUrl) {
    if (!photoUrl) return;

    console.log('Updating profile photo:', photoUrl);

    try {
        // Save to localStorage for persistence across page loads
        localStorage.setItem('profilePicture', photoUrl);

        // Update any profile images on the current page
        const profileImages = document.querySelectorAll('.profile-image img, #profile-image img, #create-post-profile-img');
        profileImages.forEach(img => {
            img.src = photoUrl;
        });

        // Also update container elements that might not have an img yet
        const profileContainers = document.querySelectorAll('#profile-image');
        profileContainers.forEach(container => {
            if (!container.querySelector('img')) {
                const img = document.createElement('img');
                img.src = photoUrl;
                img.alt = 'Profile';
                img.className = 'w-full h-full rounded-full object-cover';
                container.innerHTML = '';
                container.appendChild(img);
            }
        });
    } catch (error) {
        console.error('Error updating profile photo:', error);
    }
}

// Function to load the profile photo when page loads
async function loadProfilePhoto() {
    try {
        // Try to get from API first
        const response = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.profilePhoto) {
                updateProfilePhoto(data.user.profilePhoto);
                return;
            }
        }

        // Fall back to localStorage if API failed or no photo from API
        const storedPhoto = localStorage.getItem('profilePicture');
        if (storedPhoto) {
            updateProfilePhoto(storedPhoto);
        }
    } catch (error) {
        console.error('Error loading profile photo:', error);

        // Still try localStorage as last resort
        const storedPhoto = localStorage.getItem('profilePicture');
        if (storedPhoto) {
            updateProfilePhoto(storedPhoto);
        }
    }
}

// Handle profile photo upload
async function uploadProfilePhoto(file) {
    if (!file) {
        console.error('No file provided for upload');
        return { success: false, error: 'No file provided' };
    }

    try {
        console.log('Uploading profile photo:', file.name);

        // Create form data for the file upload
        const formData = new FormData();
        formData.append('profilePhoto', file);

        // Upload to server - using BOTH endpoints for compatibility
        let response;

        try {
            // Try the first endpoint
            response = await fetch('/api/upload-profile-picture', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
        } catch (err) {
            console.log('Falling back to alternate endpoint');
            // If first endpoint fails, try the alternate endpoint
            response = await fetch('/api/profile/photo', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
        }

        if (!response.ok) {
            let errorMessage = `HTTP ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If response is not JSON, use status text
            }
            throw new Error(`Failed to upload profile picture: ${errorMessage}`);
        }

        const data = await response.json();

        if (data.photoUrl) {
            // Update the photo in the UI and localStorage
            updateProfilePhoto(data.photoUrl);
            return {
                success: true,
                photoUrl: data.photoUrl
            };
        }

        throw new Error('No photo URL in response');
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Handle login form submission to capture profile photo
function setupLoginHandler() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.user && data.user.profilePhoto) {
                        // Store the profile photo in localStorage for persistence
                        localStorage.setItem('profilePicture', data.user.profilePhoto);
                    }
                    window.location.href = '/';
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login. Please try again.');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('Profile.js loaded and initializing');
    // Make the ProfileManager available globally immediately
    window.ProfileManager = {
        updateProfilePhoto,
        loadProfilePhoto,
        uploadProfilePhoto
    };

    loadProfilePhoto();
    setupLoginHandler();
});

// Export these functions for use in other scripts
// Note: This is already set in the DOMContentLoaded handler to ensure it's available immediately
// window.ProfileManager = {
//     updateProfilePhoto,
//     loadProfilePhoto,
//     uploadProfilePhoto
// };
