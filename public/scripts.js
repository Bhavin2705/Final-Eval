// Common utility functions for admin panels

// Toggle visibility of an element
function toggleVisibility(element) {
    if (element) {
        element.classList.toggle('hidden');
    }
}

// Format date to a readable string
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Create a notification toast
function showNotification(message, type = 'success') {
    const toast = document.createElement('div');

    // Set classes based on notification type
    const baseClasses = 'fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50';
    const typeClasses = type === 'success'
        ? 'bg-green-500 text-white'
        : type === 'error'
            ? 'bg-red-500 text-white'
            : type === 'warning'
                ? 'bg-yellow-500 text-white'
                : 'bg-blue-500 text-white';

    toast.className = `${baseClasses} ${typeClasses}`;
    toast.textContent = message;

    // Add to DOM
    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Format relative time (e.g., "2 days ago")
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
    }

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
    }

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
    }

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
    }

    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
    }

    return seconds < 10 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
}

// Ban a user
function banUser(users, userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1) {
        users[userIndex].status = 'banned';
        return true;
    }
    return false;
}

// Unban a user
function unbanUser(users, userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1 && users[userIndex].status === 'banned') {
        users[userIndex].status = 'active';
        return true;
    }
    return false;
}

// Delete a user (convert to guest)
function deleteUser(users, userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1) {
        // Store original name and email
        const originalName = users[userIndex].name;
        const originalEmail = users[userIndex].email;

        // Convert to guest instead of removing
        users[userIndex].role = 'guest';
        users[userIndex].status = 'inactive';
        users[userIndex].name = `${originalName} (Deleted)`;

        return true;
    }
    return false;
}

// Export functions for use in other files
window.utils = {
    toggleVisibility,
    formatDate,
    isValidEmail,
    showNotification,
    timeAgo,
    banUser,
    unbanUser,
    deleteUser
};