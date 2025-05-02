/* owner.js */

// Pagination state
let currentPage = 1;
let itemsPerPage = 5;
let users = []; // Populated by fetchUsers
let filteredUsers = [];
let activeTab = 'all';
let loggedInOwnerId = null; // Store logged-in owner's ID

// Clear any residual localStorage
function clearLocalStorage() {
    localStorage.clear();
}

// Format timestamp to human-readable date
function formatDate(timestamp) {
    if (!timestamp) return 'Never';
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    } catch (err) {
        console.error('Error formatting date:', err);
        return timestamp; // Fallback to raw timestamp if parsing fails
    }
}

// Check if user is logged in and has owner role
async function checkAuth(authElements, dashboardElements) {
    const { dashboardSection, loginSection } = authElements;

    if (!loginSection || !dashboardSection) {
        console.error('Critical DOM elements missing:', {
            loginSection: !!loginSection,
            dashboardSection: !!dashboardSection
        });
        console.log('Please ensure your HTML contains:');
        console.log('<div id="loginSection"><form id="loginForm">...</form></div>');
        console.log('<div id="dashboardSection">...</div>');
        return false;
    }

    try {
        const response = await fetch('/api/owner/me', {
            method: 'GET',
            credentials: 'include',
        });

        if (response.ok) {
            const data = await response.json();
            if (data.user && data.user.role === 'owner' && data.user.email) {
                loggedInOwnerId = data.user.id; // Store owner's ID
                console.log('Logged-in owner ID:', loggedInOwnerId); // Debug
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                if (dashboardElements.userTableBody) {
                    await fetchUsers(dashboardElements);
                    updateDashboard(dashboardElements);
                }
                return true;
            } else {
                console.warn('User is not an owner or missing email:', data);
            }
        } else if (response.status === 403) {
            console.warn('Forbidden: User does not have owner access');
            showToast(dashboardElements, 'Error', 'You do not have owner access.', 'error');
        } else {
            console.warn('Auth check failed with status:', response.status);
        }
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        return false;
    } catch (err) {
        console.error('Error checking auth:', err);
        showToast(dashboardElements, 'Error', 'Failed to authenticate. Please try again.', 'error');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        return false;
    }
}

// Fetch users from backend
async function fetchUsers(dashboardElements) {
    try {
        const response = await fetch('/api/owner/users', {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { message: `HTTP ${response.status}: Failed to fetch users.` };
                console.error('Non-JSON response received:', await response.text());
            }
            console.error('Failed to fetch users:', response.status, errorData);
            showToast(dashboardElements, 'Error', errorData.message || 'Failed to fetch users.', 'error');
            return;
        }

        const data = await response.json();
        users = []; // Clear existing users to avoid stale data
        users = data.users || [];
        filteredUsers = [...users];
        console.log('Fetched users:', users); // Debug: Log fetched users
        updateDashboard(dashboardElements);
    } catch (err) {
        console.error('Error fetching users:', err);
        showToast(dashboardElements, 'Error', 'Failed to fetch users. Please check your connection.', 'error');
    }
}

// Handle owner login
async function handleLogin(e, authElements, dashboardElements) {
    e.preventDefault();
    const { emailInput, passwordInput, loginError } = authElements;

    try {
        const response = await fetch('/api/owner/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value
            }),
            credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
            await checkAuth(authElements, dashboardElements);
            showToast(dashboardElements, 'Login Successful', 'Welcome to the Owner Dashboard', 'success');
        } else {
            loginError.textContent = data.message || 'Invalid credentials. Please try again.';
            loginError.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Login failed. Please try again.';
        loginError.classList.remove('hidden');
    }
}

// Update dashboard data
function updateDashboard(dashboardElements) {
    const { totalUserCount, adminCount, modCount, regularUserCount, bannedCount } = dashboardElements;
    totalUserCount.textContent = users.length;
    adminCount.textContent = users.filter(user => user.role === 'admin').length;
    modCount.textContent = users.filter(user => user.role === 'moderator').length;
    regularUserCount.textContent = users.filter(user => user.role === 'user').length;
    bannedCount.textContent = users.filter(user => user.status === 'banned').length;
    applyFilters(dashboardElements);
}

// Apply filters and search
function applyFilters(dashboardElements) {
    const { userSearchInput, roleFilter, statusFilter, totalCount, currentPageNum } = dashboardElements;
    const searchTerm = userSearchInput.value.toLowerCase();
    const roleValue = roleFilter.value;
    const statusValue = statusFilter.value;

    filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm) ||
            (user.email && user.email.toLowerCase().includes(searchTerm));

        let matchesRole = true;
        if (activeTab === 'admins') {
            matchesRole = user.role === 'admin';
        } else if (activeTab === 'moderators') {
            matchesRole = user.role === 'moderator';
        } else if (activeTab === 'users') {
            matchesRole = user.role === 'user';
        } else if (activeTab === 'guests') {
            matchesRole = user.role === 'guest';
        } else if (activeTab === 'all') {
            matchesRole = roleValue === 'all' || user.role === roleValue;
        }

        let matchesStatus = true;
        if (activeTab === 'banned') {
            matchesStatus = user.status === 'banned';
        } else {
            matchesStatus = statusValue === 'all' || user.status === statusValue;
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    totalCount.textContent = filteredUsers.length;
    currentPage = 1;
    currentPageNum.textContent = currentPage;
    renderTable(dashboardElements);
}

// Render table with current filters and pagination
function renderTable(dashboardElements) {
    const { userTableBody, noResults, showingCount, prevPage, nextPage, currentPageNum } = dashboardElements;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedUsers = filteredUsers.slice(start, end);

    userTableBody.innerHTML = '';

    if (paginatedUsers.length === 0) {
        noResults.classList.remove('hidden');
        showingCount.textContent = '0';
    } else {
        noResults.classList.add('hidden');
        showingCount.textContent = paginatedUsers.length;

        paginatedUsers.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'table-row-hover';
            row.setAttribute('data-id', user.id); // Add data-id attribute

            let statusClass, statusIcon;
            if (user.status === 'active') {
                statusClass = 'bg-green-100 text-green-800';
                statusIcon = 'fa-check';
            } else if (user.status === 'inactive') {
                statusClass = 'bg-gray-100 text-gray-800';
                statusIcon = 'fa-times';
            } else if (user.status === 'banned') {
                statusClass = 'bg-red-100 text-red-800';
                statusIcon = 'fa-ban';
            }

            let roleClass, roleIcon;
            if (user.role === 'admin') {
                roleClass = 'bg-blue-100 text-blue-800';
                roleIcon = 'fa-user-shield';
            } else if (user.role === 'moderator') {
                roleClass = 'bg-purple-100 text-purple-800';
                roleIcon = 'fa-user-cog';
            } else if (user.role === 'user') {
                roleClass = 'bg-gray-100 text-gray-800';
                roleIcon = 'fa-user';
            } else if (user.role === 'guest') {
                roleClass = 'bg-yellow-100 text-yellow-800';
                roleIcon = 'fa-user-clock';
            } else if (user.role === 'owner') {
                roleClass = 'bg-primary-100 text-primary-800';
                roleIcon = 'fa-crown';
            }

            const guestTooltip = user.role === 'guest' ? 'title="Guest users have no persistent account and cannot be modified"' : '';
            const emailDisplay = user.role === 'guest' || !user.email || user.email === '-' ? 'N/A' : user.email;
            const isOwner = user.id == loggedInOwnerId; // Check if user is the logged-in owner
            const actionsDisplay = user.role === 'guest' || isOwner ? 'N/A' : `
                <div class="flex space-x-2">
                    <button class="text-primary-600 hover:text-primary-800 transition-colors edit-user" data-id="${user.id}" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${user.role === 'admin' ? `
                        <button class="text-yellow-600 hover:text-yellow-800 transition-colors demote-admin" data-id="${user.id}" title="Demote Admin">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    ` : user.role === 'moderator' ? `
                        <button class="text-yellow-600 hover:text-yellow-800 transition-colors demote-mod" data-id="${user.id}" title="Demote Moderator">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    ` : user.role === 'user' ? `
                        <button class="text-yellow-600 hover:text-yellow-800 transition-colors demote-to-guest" data-id="${user.id}" title="Demote to Guest">
                            <i class="fas fa-user-minus"></i>
                        </button>
                    ` : ''}
                    ${user.status !== 'banned' ? `
                        <button class="text-red-600 hover:text-red-800 transition-colors ban-user" data-id="${user.id}" title="Ban User">
                            <i class="fas fa-ban"></i>
                        </button>
                    ` : `
                        <button class="text-green-600 hover:text-green-800 transition-colors unban-user" data-id="${user.id}" title="Unban User">
                            <i class="fas fa-user-check"></i>
                        </button>
                    `}
                    <button class="text-red-600 hover:text-red-800 transition-colors delete-user" data-id="${user.id}" title="Delete User">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

            // Debug log for guest and owner users
            if (user.role === 'guest' || isOwner) {
                console.log(`${isOwner ? 'Owner' : 'Guest'} user data:`, {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    status: user.status,
                    lastLogin: user.lastLogin
                });
                console.log(`${isOwner ? 'Owner' : 'Guest'} user actions rendered:`, actionsDisplay);
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700" ${guestTooltip}>${user.name || 'Guest'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" ${guestTooltip}>${emailDisplay}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${roleClass}">
                        <i class="fas ${roleIcon} mr-1"></i> ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span class="px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        <i class="fas ${statusIcon} mr-1"></i> ${user.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(user.lastLogin)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${actionsDisplay}</td>
            `;

            userTableBody.appendChild(row);
        });

        // Attach event listeners for action buttons
        document.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                openEditModal(userId, dashboardElements);
            });
        });

        document.querySelectorAll('.demote-admin').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                showConfirmationModal('Demote Admin', 'Are you sure you want to demote this admin to a regular user?', 'warning', () => {
                    demoteUser(userId, 'admin', dashboardElements);
                }, dashboardElements);
            });
        });

        document.querySelectorAll('.demote-mod').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                showConfirmationModal('Demote Moderator', 'Are you sure you want to demote this moderator to a regular user?', 'warning', () => {
                    demoteUser(userId, 'moderator', dashboardElements);
                }, dashboardElements);
            });
        });

        document.querySelectorAll('.demote-to-guest').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                showConfirmationModal(
                    'Demote to Guest',
                    'Are you sure you want to demote this user to a guest? This will remove their persistent account details and cannot be undone.',
                    'danger',
                    () => {
                        demoteToGuest(userId, dashboardElements);
                    },
                    dashboardElements
                );
            });
        });

        document.querySelectorAll('.ban-user').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                if (userId == loggedInOwnerId) {
                    showToast(dashboardElements, 'Error', 'You cannot ban your own account.', 'error');
                    return;
                }
                showConfirmationModal('Ban User', 'Are you sure you want to ban this user? They will be unable to access their account.', 'danger', () => {
                    banUser(userId, dashboardElements);
                }, dashboardElements);
            });
        });

        document.querySelectorAll('.unban-user').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                if (userId == loggedInOwnerId) {
                    showToast(dashboardElements, 'Error', 'You cannot unban your own account.', 'error');
                    return;
                }
                showConfirmationModal('Unban User', 'Are you sure you want to unban this user? They will regain access to their account.', 'info', () => {
                    unbanUser(userId, dashboardElements);
                }, dashboardElements);
            });
        });

        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.getAttribute('data-id');
                if (userId == loggedInOwnerId) {
                    showToast(dashboardElements, 'Error', 'You cannot delete your own account.', 'error');
                    return;
                }
                showConfirmationModal('Delete User', 'Are you sure you want to permanently delete this user?', 'danger', () => {
                    deleteUser(userId, dashboardElements);
                }, dashboardElements);
            });
        });
    }

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = end >= filteredUsers.length;
}

// Open edit user modal
async function openEditModal(userId, dashboardElements) {
    const { editName, editEmail, editRole, editStatus, editUserModal, editUserForm } = dashboardElements;
    const user = users.find(u => u.id == userId); // Use id to find user

    try {
        const response = await fetch('/api/owner/me', {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) {
            console.error('Failed to fetch current user:', response.status);
            showToast(dashboardElements, 'Error', 'Failed to verify user. Please log in again.', 'error');
            return;
        }
        const data = await response.json();
        const loggedInUser = data.user;
        const isOwnerEditingSelf = user && loggedInUser.id == user.id; // Use id for comparison

        if (user && editUserModal) {
            editName.value = user.name || 'Guest';
            editEmail.value = user.role === 'guest' || !user.email || user.email === '-' ? 'N/A' : user.email;
            editRole.value = user.role;
            editStatus.value = user.status;

            // Store userId in form dataset
            editUserForm.dataset.userId = userId;

            // Restrict editing for non-self users or owner editing self
            if (!isOwnerEditingSelf) {
                editName.disabled = true;
                editName.classList.add('bg-gray-100', 'cursor-not-allowed');
                editEmail.disabled = true;
                editEmail.classList.add('bg-gray-100', 'cursor-not-allowed');
                let note = editUserModal.querySelector('.edit-restriction-note');
                if (!note) {
                    note = document.createElement('p');
                    note.className = 'edit-restriction-note text-sm text-gray-500 mb-4';
                    note.textContent = 'Name and email can only be edited by the user themselves.';
                    editUserForm.insertBefore(note, editUserForm.firstChild);
                }
            } else {
                editName.disabled = false;
                editName.classList.remove('bg-gray-100', 'cursor-not-allowed');
                editEmail.disabled = false;
                editEmail.classList.remove('bg-gray-100', 'cursor-not-allowed');
                const note = editUserModal.querySelector('.edit-restriction-note');
                if (note) note.remove();
            }

            // Prevent owner from changing their own role
            if (isOwnerEditingSelf) {
                editRole.disabled = true;
                editRole.classList.add('bg-gray-100', 'cursor-not-allowed');
                let ownerNote = editUserModal.querySelector('.owner-restriction-note');
                if (!ownerNote) {
                    ownerNote = document.createElement('p');
                    ownerNote.className = 'owner-restriction-note text-sm text-gray-500 mb-4';
                    ownerNote.textContent = 'Owner role cannot be changed for security reasons.';
                    editUserForm.insertBefore(ownerNote, editUserForm.firstChild);
                }
            } else {
                editRole.disabled = false;
                editRole.classList.remove('bg-gray-100', 'cursor-not-allowed');
                const ownerNote = editUserModal.querySelector('.owner-restriction-note');
                if (ownerNote) ownerNote.remove();
            }

            editUserModal.classList.remove('hidden');
        } else {
            throw new Error('User not found or modal unavailable');
        }
    } catch (err) {
        console.error('Error opening edit modal:', err);
        showToast(dashboardElements, 'Error', 'Failed to load edit modal.', 'error');
    }
}

// Demote user (admin or moderator) to regular user
async function demoteUser(userId, fromRole, dashboardElements) {
    try {
        const response = await fetch('/api/owner/users/demote', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId, fromRole }),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Demote user failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to demote user.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        showToast(dashboardElements, 'User Demoted', `User has been demoted to a regular user.`, 'success');
    } catch (err) {
        console.error('Error demoting user:', err);
        showToast(dashboardElements, 'Error', 'Failed to demote user.', 'error');
    }
}

// Demote regular user to guest
async function demoteToGuest(userId, dashboardElements) {
    try {
        const payload = { id: userId, role: 'guest', email: null, name: null };
        console.log('Demote to guest payload:', payload); // Debug: Log payload
        const response = await fetch('/api/owner/users', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Demote to guest failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to demote user to guest.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        showToast(dashboardElements, 'User Demoted', 'User has been demoted to a guest.', 'success');
    } catch (err) {
        console.error('Error demoting to guest:', err);
        showToast(dashboardElements, 'Error', 'Failed to demote user to guest.', 'error');
    }
}

// Ban user
async function banUser(userId, dashboardElements) {
    if (userId == loggedInOwnerId) {
        console.error('Attempted to ban owner account:', userId);
        showToast(dashboardElements, 'Error', 'You cannot ban your own account.', 'error');
        return;
    }
    try {
        const response = await fetch('/api/owner/users/ban', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId }),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Ban user failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to ban user.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        showToast(dashboardElements, 'User Banned', 'User has been banned from the platform.', 'success');
    } catch (err) {
        console.error('Error banning user:', err);
        showToast(dashboardElements, 'Error', 'Failed to ban user.', 'error');
    }
}

// Unban user
async function unbanUser(userId, dashboardElements) {
    if (userId == loggedInOwnerId) {
        console.error('Attempted to unban owner account:', userId);
        showToast(dashboardElements, 'Error', 'You cannot unban your own account.', 'error');
        return;
    }
    try {
        const response = await fetch('/api/owner/users/unban', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId }),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Unban user failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to unban user.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        showToast(dashboardElements, 'User Unbanned', 'User has been unbanned and can now access their account.', 'success');
    } catch (err) {
        console.error('Error unbanning user:', err);
        showToast(dashboardElements, 'Error', 'Failed to unban user.', 'error');
    }
}

// Delete user (permanently)
async function deleteUser(userId, dashboardElements) {
    if (userId == loggedInOwnerId) {
        console.error('Attempted to delete owner account:', userId);
        showToast(dashboardElements, 'Error', 'You cannot delete your own account.', 'error');
        return;
    }
    try {
        const response = await fetch('/api/owner/users', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: userId }),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('Delete user failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to delete user.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        showToast(dashboardElements, 'User Deleted', 'User has been permanently deleted.', 'success');
    } catch (err) {
        console.error('Error deleting user:', err);
        showToast(dashboardElements, 'Error', 'Failed to delete user.', 'error');
    }
}

// Show confirmation modal
function showConfirmationModal(title, message, type, onConfirm, dashboardElements) {
    const { modalTitle, modalMessage, modalIcon, confirmAction, confirmationModal } = dashboardElements;
    if (!confirmationModal) return;

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    if (type === 'danger') {
        modalIcon.className = 'inline-block p-3 rounded-full bg-red-100 text-red-500 mb-4';
        modalIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-2xl"></i>';
        confirmAction.className = 'px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors';
    } else if (type === 'warning') {
        modalIcon.className = 'inline-block p-3 rounded-full bg-yellow-100 text-yellow-500 mb-4';
        modalIcon.innerHTML = '<i class="fas fa-exclamation-circle text-2xl"></i>';
        confirmAction.className = 'px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors';
    } else {
        modalIcon.className = 'inline-block p-3 rounded-full bg-blue-100 text-blue-500 mb-4';
        modalIcon.innerHTML = '<i class="fas fa-info-circle text-2xl"></i>';
        confirmAction.className = 'px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors';
    }

    confirmationModal.classList.remove('hidden');
    confirmAction.onclick = () => {
        onConfirm();
        confirmationModal.classList.add('hidden');
    };
}

// Show toast notification
function showToast(dashboardElements, title, message, type) {
    const { toastTitle, toastMessage, toastIcon, toastIconSymbol, toastNotification } = dashboardElements;
    if (!toastNotification) return;

    toastTitle.textContent = title;
    toastMessage.textContent = message;

    if (type === 'success') {
        toastIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-4';
        toastIconSymbol.className = 'fas fa-check text-green-500 text-lg';
    } else if (type === 'error') {
        toastIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-4';
        toastIconSymbol.className = 'fas fa-times text-red-500 text-lg';
    } else if (type === 'warning') {
        toastIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center mr-4';
        toastIconSymbol.className = 'fas fa-exclamation text-yellow-500 text-lg';
    } else {
        toastIcon.className = 'flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4';
        toastIconSymbol.className = 'fas fa-info text-blue-500 text-lg';
    }

    toastNotification.classList.remove('hidden');
    toastNotification.classList.add('animate-fade-in');
    setTimeout(() => {
        toastNotification.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
            toastNotification.classList.remove('opacity-0', 'translate-y-2');
        }, 300);
    }, 3000);
}

// Set active tab
function setActiveTab(tab, dashboardElements) {
    const { allUsersTab, adminsTab, moderatorsTab, usersTab, guestsTab, bannedTab } = dashboardElements;
    [allUsersTab, adminsTab, moderatorsTab, usersTab, guestsTab, bannedTab].forEach(tabEl => {
        if (tabEl) {
            tabEl.classList.remove('text-primary-600', 'border-b-2', 'border-primary-500');
            tabEl.classList.add('text-gray-500', 'hover:text-gray-700');
        }
    });

    let activeTabEl;
    if (tab === 'all') activeTabEl = allUsersTab;
    else if (tab === 'admins') activeTabEl = adminsTab;
    else if (tab === 'moderators') activeTabEl = moderatorsTab;
    else if (tab === 'users') activeTabEl = usersTab;
    else if (tab === 'guests') activeTabEl = guestsTab;
    else if (tab === 'banned') activeTabEl = bannedTab;

    if (activeTabEl) {
        activeTabEl.classList.remove('text-gray-500', 'hover:text-gray-700');
        activeTabEl.classList.add('text-primary-600', 'border-b-2', 'border-primary-500');
    }

    activeTab = tab;
    applyFilters(dashboardElements);
}

// Submit user edit
async function submitUserEdit(userId, dashboardElements) {
    const { editName, editEmail, editRole, editStatus, editUserModal } = dashboardElements;
    try {
        // Create payload, excluding undefined values
        const payload = { id: userId };
        if (!editName.disabled && editName.value) payload.name = editName.value;
        if (!editEmail.disabled && editEmail.value && editEmail.value !== 'N/A') payload.email = editEmail.value;
        if (!editRole.disabled && editRole.value) payload.role = editRole.value;
        if (editStatus.value) payload.status = editStatus.value;

        // If demoting to guest, ensure email and name are null
        if (payload.role === 'guest') {
            payload.email = null;
            payload.name = null;
        }

        console.log('Submitting user edit payload:', payload); // Debug: Log payload

        const response = await fetch('/api/owner/users', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            credentials: 'include',
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('User edit failed:', response.status, data);
            showToast(dashboardElements, 'Error', data.message || 'Failed to update user.', 'error');
            return;
        }

        await fetchUsers(dashboardElements);
        editUserModal.classList.add('hidden');
        const user = users.find(u => u.id == userId);
        console.log('User after update:', user); // Debug: Log updated user
        showToast(
            dashboardElements,
            'User Updated',
            payload.role === 'guest' ? 'User has been demoted to a guest.' : 'User details have been updated successfully.',
            'success'
        );
    } catch (err) {
        console.error('Error updating user:', err);
        showToast(dashboardElements, 'Error', 'Failed to update user.', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    clearLocalStorage();

    // Group authentication-related DOM elements
    const authElements = {
        dashboardSection: document.getElementById('dashboardSection'),
        loginSection: document.getElementById('loginSection'),
        loginForm: document.getElementById('loginForm'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        loginError: document.getElementById('loginError')
    };

    // Other DOM elements
    const dashboardElements = {
        userTableBody: document.getElementById('userTableBody'),
        userSearchInput: document.getElementById('userSearchInput'),
        roleFilter: document.getElementById('roleFilter'),
        statusFilter: document.getElementById('statusFilter'),
        noResults: document.getElementById('noResults'),
        totalUserCount: document.getElementById('totalUserCount'),
        adminCount: document.getElementById('adminCount'),
        modCount: document.getElementById('modCount'),
        regularUserCount: document.getElementById('regularUserCount'),
        bannedCount: document.getElementById('bannedCount'),
        showingCount: document.getElementById('showingCount'),
        totalCount: document.getElementById('totalCount'),
        currentPageNum: document.getElementById('currentPageNum'),
        prevPage: document.getElementById('prevPage'),
        nextPage: document.getElementById('nextPage'),
        pageSizeSelect: document.getElementById('pageSizeSelect'),
        editUserModal: document.getElementById('editUserModal'),
        editUserForm: document.getElementById('editUserForm'),
        editName: document.getElementById('editName'),
        editEmail: document.getElementById('editEmail'),
        editRole: document.getElementById('editRole'),
        editStatus: document.getElementById('editStatus'),
        closeEditModal: document.getElementById('closeEditModal'),
        cancelEdit: document.getElementById('cancelEdit'),
        confirmationModal: document.getElementById('confirmationModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalMessage: document.getElementById('modalMessage'),
        modalIcon: document.getElementById('modalIcon'),
        cancelAction: document.getElementById('cancelAction'),
        confirmAction: document.getElementById('confirmAction'),
        profileDropdownButton: document.getElementById('profileDropdownButton'),
        profileDropdown: document.getElementById('profileDropdown'),
        logoutButton: document.getElementById('logoutButton'),
        toastNotification: document.getElementById('toastNotification'),
        toastIcon: document.getElementById('toastIcon'),
        toastIconSymbol: document.getElementById('toastIconSymbol'),
        toastTitle: document.getElementById('toastTitle'),
        toastMessage: document.getElementById('toastMessage'),
        closeToast: document.getElementById('closeToast'),
        allUsersTab: document.getElementById('allUsersTab'),
        adminsTab: document.getElementById('adminsTab'),
        moderatorsTab: document.getElementById('moderatorsTab'),
        usersTab: document.getElementById('usersTab'),
        guestsTab: document.getElementById('guestsTab'),
        bannedTab: document.getElementById('bannedTab'),
        menuBtn: document.getElementById('menu-btn'),
        closeMenu: document.getElementById('close-menu'),
        mobileMenu: document.getElementById('mobile-menu'),
        mobileLogout: document.getElementById('mobile-logout')
    };

    // Verify critical elements
    const missingElements = [];
    if (!authElements.loginSection) missingElements.push('loginSection');
    if (!authElements.dashboardSection) missingElements.push('dashboardSection');
    if (!authElements.loginForm) missingElements.push('loginForm');

    if (missingElements.length > 0) {
        console.error(`Critical DOM elements missing: ${missingElements.join(', ')}`);
        console.log('Please ensure your HTML contains:');
        console.log('<div id="loginSection"><form id="loginForm">...</form></div>');
        console.log('<div id="dashboardSection">...</div>');
        return;
    }

    // Initialize auth state
    checkAuth(authElements, dashboardElements);

    // Add form submission handler
    if (authElements.loginForm) {
        authElements.loginForm.addEventListener('submit', (e) => handleLogin(e, authElements, dashboardElements));
    }

    // Mobile menu handlers
    if (dashboardElements.menuBtn && dashboardElements.mobileMenu) {
        dashboardElements.menuBtn.addEventListener('click', () => {
            dashboardElements.mobileMenu.classList.toggle('hidden');
        });
    }
    if (dashboardElements.closeMenu && dashboardElements.mobileMenu) {
        dashboardElements.closeMenu.addEventListener('click', () => {
            dashboardElements.mobileMenu.classList.add('hidden');
        });
    }
    if (dashboardElements.mobileLogout) {
        dashboardElements.mobileLogout.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/owner/logout', {
                    method: 'POST',
                    credentials: 'include',
                });
                if (!response.ok) {
                    console.error('Logout failed:', response.status);
                    showToast(dashboardElements, 'Error', 'Failed to log out.', 'error');
                    return;
                }
                await checkAuth(authElements, dashboardElements);
                dashboardElements.mobileMenu.classList.add('hidden');
            } catch (err) {
                console.error('Logout error:', err);
                showToast(dashboardElements, 'Error', 'Failed to log out.', 'error');
            }
        });
    }

    // Dashboard event listeners
    if (dashboardElements.userSearchInput) {
        dashboardElements.userSearchInput.addEventListener('input', () => applyFilters(dashboardElements));
    }
    if (dashboardElements.roleFilter) {
        dashboardElements.roleFilter.addEventListener('change', () => applyFilters(dashboardElements));
    }
    if (dashboardElements.statusFilter) {
        dashboardElements.statusFilter.addEventListener('change', () => applyFilters(dashboardElements));
    }

    if (dashboardElements.prevPage) {
        dashboardElements.prevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                dashboardElements.currentPageNum.textContent = currentPage;
                renderTable(dashboardElements);
            }
        });
    }

    if (dashboardElements.nextPage) {
        dashboardElements.nextPage.addEventListener('click', () => {
            if ((currentPage * itemsPerPage) < filteredUsers.length) {
                currentPage++;
                dashboardElements.currentPageNum.textContent = currentPage;
                renderTable(dashboardElements);
            }
        });
    }

    if (dashboardElements.pageSizeSelect) {
        dashboardElements.pageSizeSelect.addEventListener('change', () => {
            itemsPerPage = parseInt(dashboardElements.pageSizeSelect.value);
            currentPage = 1;
            dashboardElements.currentPageNum.textContent = currentPage;
            renderTable(dashboardElements);
        });
    }

    // Edit user modal handlers
    if (dashboardElements.editUserForm) {
        dashboardElements.editUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userId = dashboardElements.editUserForm.dataset.userId; // Get userId from form dataset
            const user = users.find(u => u.id == userId);
            const newRole = dashboardElements.editRole.value;

            // Check if changing a non-guest to guest
            if (user && user.role !== 'guest' && newRole === 'guest') {
                showConfirmationModal(
                    'Demote to Guest',
                    'Are you sure you want to demote this user to a guest? This will remove their persistent account details (name and email) and cannot be undone.',
                    'danger',
                    async () => {
                        await submitUserEdit(userId, dashboardElements);
                    },
                    dashboardElements
                );
            } else {
                await submitUserEdit(userId, dashboardElements);
            }
        });
    }

    if (dashboardElements.closeEditModal) {
        dashboardElements.closeEditModal.addEventListener('click', () => {
            dashboardElements.editUserModal.classList.add('hidden');
        });
    }

    if (dashboardElements.cancelEdit) {
        dashboardElements.cancelEdit.addEventListener('click', () => {
            dashboardElements.editUserModal.classList.add('hidden');
        });
    }

    // Confirmation modal handlers
    if (dashboardElements.cancelAction) {
        dashboardElements.cancelAction.addEventListener('click', () => {
            dashboardElements.confirmationModal.classList.add('hidden');
        });
    }

    // Profile dropdown handlers
    if (dashboardElements.profileDropdownButton && dashboardElements.profileDropdown) {
        dashboardElements.profileDropdownButton.addEventListener('click', () => {
            dashboardElements.profileDropdown.classList.toggle('hidden');
        });
    }

    // Logout handler
    if (dashboardElements.logoutButton) {
        dashboardElements.logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/owner/logout', {
                    method: 'POST',
                    credentials: 'include',
                });
                if (!response.ok) {
                    console.error('Logout failed:', response.status);
                    showToast(dashboardElements, 'Error', 'Failed to log out.', 'error');
                    return;
                }
                await checkAuth(authElements, dashboardElements);
            } catch (err) {
                console.error('Logout error:', err);
                showToast(dashboardElements, 'Error', 'Failed to log out.', 'error');
            }
        });
    }

    // Toast close handler
    if (dashboardElements.closeToast) {
        dashboardElements.closeToast.addEventListener('click', () => {
            dashboardElements.toastNotification.classList.add('hidden');
        });
    }

    // Tab handlers
    if (dashboardElements.allUsersTab) {
        dashboardElements.allUsersTab.addEventListener('click', () => setActiveTab('all', dashboardElements));
    }
    if (dashboardElements.adminsTab) {
        dashboardElements.adminsTab.addEventListener('click', () => setActiveTab('admins', dashboardElements));
    }
    if (dashboardElements.moderatorsTab) {
        dashboardElements.moderatorsTab.addEventListener('click', () => setActiveTab('moderators', dashboardElements));
    }
    if (dashboardElements.usersTab) {
        dashboardElements.usersTab.addEventListener('click', () => setActiveTab('users', dashboardElements));
    }
    if (dashboardElements.guestsTab) {
        dashboardElements.guestsTab.addEventListener('click', () => setActiveTab('guests', dashboardElements));
    }
    if (dashboardElements.bannedTab) {
        dashboardElements.bannedTab.addEventListener('click', () => setActiveTab('banned', dashboardElements));
    }
});