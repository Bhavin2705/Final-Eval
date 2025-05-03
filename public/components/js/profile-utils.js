const ProfileUtils = {
    // Get profile photo from various sources
    getProfilePhoto() {
        return localStorage.getItem('profilePicture') || this.getDefaultAvatar();
    },

    // Update profile photo across the app
    updateProfilePhoto(photoUrl) {
        if (!photoUrl) return;
        localStorage.setItem('profilePicture', photoUrl);
        document.dispatchEvent(new CustomEvent('profilePhotoUpdate', { detail: photoUrl }));
    },

    // Clear profile data
    clearProfileData() {
        localStorage.removeItem('profilePicture');
    },

    // Get default avatar as SVG data URI
    getDefaultAvatar() {
        return 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 128 128\' width=\'128\' height=\'128\'%3E%3Ccircle cx=\'64\' cy=\'64\' r=\'64\' fill=\'%23ddd\'/%3E%3Ccircle cx=\'64\' cy=\'50\' r=\'24\' fill=\'%23bbb\'/%3E%3Cpath d=\'M32 106c0-22 14-32 32-32s32 10 32 32\' fill=\'%23bbb\'/%3E%3C/svg%3E';
    },

    // Update profile image element
    updateProfileImageElement(element, photoUrl) {
        if (!element) return;
        const img = element.querySelector('img') || document.createElement('img');
        img.src = photoUrl || this.getDefaultAvatar();
        img.alt = 'Profile';
        img.className = 'w-full h-full rounded-full object-cover';
        if (!element.contains(img)) {
            element.innerHTML = '';
            element.appendChild(img);
        }
    },

    getDefaultUser() {
        return {
            name: 'Guest',
            profilePhoto: this.getDefaultAvatar(),
            email: 'guest@example.com'
        };
    },

    getCurrentUser() {
        try {
            // First try to get from server-side rendered data
            const serverUser = window.__USER_DATA__;
            if (serverUser && serverUser.profilePhoto) {
                localStorage.setItem('currentUser', JSON.stringify(serverUser));
                return serverUser;
            }

            // Fallback to localStorage
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (user && user.profilePhoto) {
                return user;
            }

            // Default fallback
            return {
                name: 'Guest',
                profilePhoto: this.getDefaultAvatar()
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            return {
                name: 'Guest',
                profilePhoto: this.getDefaultAvatar()
            };
        }
    },

    updateCurrentUser(userData) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(userData));
            document.dispatchEvent(new CustomEvent('profileUpdate'));
        } catch (error) {
            console.error('Error updating user profile:', error);
        }
    },

    setCurrentUser(user) {
        if (!user) return;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
};

window.ProfileUtils = ProfileUtils;
