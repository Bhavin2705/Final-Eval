// Sample data for users
const users = [
    { id: 1, name: 'Admin User', email: 'admin1@social.com', role: 'admin', status: 'active', lastLogin: '2023-06-15' },
    { id: 2, name: 'John Doe', email: 'john@social.com', role: 'admin', status: 'active', lastLogin: '2023-06-14' },
    { id: 3, name: 'Jane Smith', email: 'jane@social.com', role: 'moderator', status: 'active', lastLogin: '2023-06-13' },
    { id: 4, name: 'Robert Johnson', email: 'robert@social.com', role: 'admin', status: 'inactive', lastLogin: '2023-06-10' },
    { id: 5, name: 'Emily Davis', email: 'emily@social.com', role: 'moderator', status: 'active', lastLogin: '2023-06-12' },
    { id: 6, name: 'Michael Wilson', email: 'michael@social.com', role: 'user', status: 'active', lastLogin: '2023-06-11' },
    { id: 7, name: 'Sarah Brown', email: 'sarah@social.com', role: 'user', status: 'active', lastLogin: '2023-06-09' },
    { id: 8, name: 'David Miller', email: 'david@social.com', role: 'moderator', status: 'inactive', lastLogin: '2023-06-08' },
    { id: 9, name: 'Jennifer Taylor', email: 'jennifer@social.com', role: 'user', status: 'active', lastLogin: '2023-06-07' },
    { id: 10, name: 'James Anderson', email: 'james@social.com', role: 'admin', status: 'active', lastLogin: '2023-06-06' },
    { id: 11, name: 'Lisa Johnson', email: 'lisa@social.com', role: 'user', status: 'inactive', lastLogin: '2023-06-05' },
    { id: 12, name: 'Thomas Brown', email: 'thomas@social.com', role: 'user', status: 'active', lastLogin: '2023-06-04' },
    { id: 13, name: 'Patricia Davis', email: 'patricia@social.com', role: 'user', status: 'active', lastLogin: '2023-06-03' },
    { id: 14, name: 'Christopher Wilson', email: 'chris@social.com', role: 'moderator', status: 'active', lastLogin: '2023-06-02' },
    { id: 15, name: 'Mary Taylor', email: 'mary@social.com', role: 'user', status: 'banned', lastLogin: '2023-06-01' },
    { id: 16, name: 'Guest User', email: 'guest1@social.com', role: 'guest', status: 'inactive', lastLogin: '2023-05-28' }
];

// DOM Elements
const dashboardContainer = document.getElementById('dashboardContainer');
const userTableBody = document.getElementById('userTableBody');
const userSearchInput = document.getElementById('userSearchInput');
const roleFilter = document.getElementById('roleFilter');
const statusFilter = document.getElementById('statusFilter');
const noResults = document.getElementById('noResults');
const totalUserCount = document.getElementById('totalUserCount');
const adminCount = document.getElementById('adminCount');
const modCount = document.getElementById('modCount');
const regularUserCount = document.getElementById('regularUserCount');
const bannedCount = document.getElementById('bannedCount');
const showingCount = document.getElementById('showingCount');
const totalCount = document.getElementById('totalCount');
const currentPageNum = document.getElementById('currentPageNum');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const editUserModal = document.getElementById('editUserModal');
const editUserForm = document.getElementById('editUserForm');
const editUserId = document.getElementById('editUserId');
const editName = document.getElementById('editName');
const editEmail = document.getElementById('editEmail');
const editRole = document.getElementById('editRole');
const editStatus = document.getElementById('editStatus');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEdit = document.getElementById('cancelEdit');
const confirmationModal = document.getElementById('confirmationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalIcon = document.getElementById('modalIcon');
const cancelAction = document.getElementById('cancelAction');
const confirmAction = document.getElementById('confirmAction');
const profileDropdownButton = document.getElementById('profileDropdownButton');
const profileDropdown = document.getElementById('profileDropdown');
const logoutButton = document.getElementById('logoutButton');
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const closeMenu = document.getElementById('close-menu');
const mobileLogout = document.getElementById('mobile-logout');
const toastNotification = document.getElementById('toastNotification');
const toastIcon = document.getElementById('toastIcon');
const toastIconSymbol = document.getElementById('toastIconSymbol');
const toastTitle = document.getElementById('toastTitle');
const toastMessage = document.getElementById('toastMessage');
const closeToast = document.getElementById('closeToast');

// Tab elements
const allUsersTab = document.getElementById('allUsersTab');
const adminsTab = document.getElementById('adminsTab');
const moderatorsTab = document.getElementById('moderatorsTab');
const usersTab = document.getElementById('usersTab');
const guestsTab = document.getElementById('guestsTab');
const bannedTab = document.getElementById('bannedTab');

// Pagination state
let currentPage = 1;
let itemsPerPage = 5;
let filteredUsers = [...users];
let activeTab = 'all';

// Check if user is logged in and has owner role
function checkAuth() {
    const loggedInRole = localStorage.getItem('loggedInRole');
    if (loggedInRole === 'owner') {
        dashboardContainer.classList.remove('hidden');
        updateDashboard();
    } else {
        // Redirect to login page if not logged in as owner
        window.location.href = 'login.html'; // Assuming your login page is named login.html
    }
}

// Update dashboard data
function updateDashboard() {
    totalUserCount.textContent = users.length;
    adminCount.textContent = users.filter(user => user.role === 'admin').length;
    modCount.textContent = users.filter(user => user.role === 'moderator').length;
    regularUserCount.textContent = users.filter(user => user.role === 'user').length;
    bannedCount.textContent = users.filter(user => user.status === 'banned').length;
    applyFilters();
}

// Apply filters and search
function applyFilters() {
    const searchTerm = userSearchInput.value.toLowerCase();
    const roleValue = roleFilter.value;
    const statusValue = statusFilter.value;

    filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm) ||
            user.id.toString().includes(searchTerm);

        let matchesRole = true;
        if (activeTab === 'admins') {
            matchesRole = user.role === 'admin';
        } else if (activeTab === 'moderators') {
            matchesRole = user.role === 'moderator';
        } else if (activeTab === 'users') {
            matchesRole = user.role === 'user';
        } else if (activeTab === 'guests') {
            matchesRole = user.role === 'guest';
        } else if (activeTab === 'banned') {
            matchesRole = user.status === 'banned';
        } else {
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
    renderTable();
}

// Render table with current filters and pagination
function renderTable() {
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
            }

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${user.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${user.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
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
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.lastLogin}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                </td>
            `;

            userTableBody.appendChild(row);
        });

        document.querySelectorAll('.edit-user').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                openEditModal(userId);
            });
        });

        document.querySelectorAll('.demote-admin').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                showConfirmationModal('Demote Admin', 'Are you sure you want to demote this admin to a regular user?', 'warning', () => {
                    demoteUser(userId, 'admin');
                });
            });
        });

        document.querySelectorAll('.demote-mod').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                showConfirmationModal('Demote Moderator', 'Are you sure you want to demote this moderator to a regular user?', 'warning', () => {
                    demoteUser(userId, 'moderator');
                });
            });
        });

        document.querySelectorAll('.ban-user').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                showConfirmationModal('Ban User', 'Are you sure you want to ban this user? They will be unable to access their account.', 'danger', () => {
                    banUser(userId);
                });
            });
        });

        document.querySelectorAll('.unban-user').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                showConfirmationModal('Unban User', 'Are you sure you want to unban this user? They will regain access to their account.', 'info', () => {
                    unbanUser(userId);
                });
            });
        });

        document.querySelectorAll('.delete-user').forEach(button => {
            button.addEventListener('click', function () {
                const userId = this.getAttribute('data-id');
                showConfirmationModal('Delete User', 'Are you sure you want to delete this user? They will become a guest user.', 'danger', () => {
                    deleteUser(userId);
                });
            });
        });
    }

    prevPage.disabled = currentPage === 1;
    nextPage.disabled = end >= filteredUsers.length;
}

// Open edit user modal
function openEditModal(userId) {
    const user = users.find(u => u.id.toString() === userId);
    if (user) {
        editUserId.value = user.id;
        editName.value = user.name;
        editEmail.value = user.email;
        editRole.value = user.role;
        editStatus.value = user.status;
        editUserModal.classList.remove('hidden');
    }
}

// Demote user (admin or moderator) to regular user
function demoteUser(userId, fromRole) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1 && users[userIndex].role === fromRole) {
        users[userIndex].role = 'user';
        updateDashboard();
        showToast('User Demoted', `User has been demoted to a regular user.`, 'success');
    }
}

// Ban user
function banUser(userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1) {
        users[userIndex].status = 'banned';
        updateDashboard();
        showToast('User Banned', 'User has been banned from the platform.', 'success');
    }
}

// Unban user
function unbanUser(userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1 && users[userIndex].status === 'banned') {
        users[userIndex].status = 'active';
        updateDashboard();
        showToast('User Unbanned', 'User has been unbanned and can now access their account.', 'success');
    }
}

// Delete user (convert to guest)
function deleteUser(userId) {
    const userIndex = users.findIndex(u => u.id.toString() === userId);
    if (userIndex !== -1) {
        users[userIndex].role = 'guest';
        users[userIndex].status = 'inactive';
        updateDashboard();
        showToast('User Deleted', 'User has been converted to guest status.', 'success');
    }
}

// Show confirmation modal
function showConfirmationModal(title, message, type, onConfirm) {
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
function showToast(title, message, type) {
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
function setActiveTab(tab) {
    [allUsersTab, adminsTab, moderatorsTab, usersTab, guestsTab, bannedTab].forEach(tabEl => {
        tabEl.classList.remove('text-primary-600', 'border-b-2', 'border-primary-500');
        tabEl.classList.add('text-gray-500', 'hover:text-gray-700');
    });

    let activeTabEl;
    if (tab === 'all') activeTabEl = allUsersTab;
    else if (tab === 'admins') activeTabEl = adminsTab;
    else if (tab === 'moderators') activeTabEl = moderatorsTab;
    else if (tab === 'users') activeTabEl = usersTab;
    else if (tab === 'guests') activeTabEl = guestsTab;
    else if (tab === 'banned') activeTabEl = bannedTab;

    activeTabEl.classList.remove('text-gray-500', 'hover:text-gray-700');
    activeTabEl.classList.add('text-primary-600', 'border-b-2', 'border-primary-500');

    activeTab = tab;
    applyFilters();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    userSearchInput.addEventListener('input', applyFilters);
    roleFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            currentPageNum.textContent = currentPage;
            renderTable();
        }
    });

    nextPage.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredUsers.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            currentPageNum.textContent = currentPage;
            renderTable();
        }
    });

    pageSizeSelect.addEventListener('change', () => {
        itemsPerPage = parseInt(pageSizeSelect.value);
        currentPage = 1;
        currentPageNum.textContent = currentPage;
        renderTable();
    });

    allUsersTab.addEventListener('click', () => setActiveTab('all'));
    adminsTab.addEventListener('click', () => setActiveTab('admins'));
    moderatorsTab.addEventListener('click', () => setActiveTab('moderators'));
    usersTab.addEventListener('click', () => setActiveTab('users'));
    guestsTab.addEventListener('click', () => setActiveTab('guests'));
    bannedTab.addEventListener('click', () => setActiveTab('banned'));

    editUserForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userId = editUserId.value;
        const userIndex = users.findIndex(u => u.id.toString() === userId);
        if (userIndex !== -1) {
            users[userIndex].name = editName.value;
            users[userIndex].email = editEmail.value;
            users[userIndex].role = editRole.value;
            users[userIndex].status = editStatus.value;
            editUserModal.classList.add('hidden');
            updateDashboard();
            showToast('User Updated', 'User information has been updated successfully.', 'success');
        }
    });

    closeEditModal.addEventListener('click', () => editUserModal.classList.add('hidden'));
    cancelEdit.addEventListener('click', () => editUserModal.classList.add('hidden'));
    cancelAction.addEventListener('click', () => confirmationModal.classList.add('hidden'));

    closeToast.addEventListener('click', () => {
        toastNotification.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => {
            toastNotification.classList.add('hidden');
            toastNotification.classList.remove('opacity-0', 'translate-y-2');
        }, 300);
    });

    profileDropdownButton.addEventListener('click', () => profileDropdown.classList.toggle('hidden'));

    document.addEventListener('click', (event) => {
        if (!profileDropdownButton.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('loggedInRole');
        window.location.href = 'login.html';
    });

    menuBtn.addEventListener('click', () => mobileMenu.classList.remove('hidden'));
    closeMenu.addEventListener('click', () => mobileMenu.classList.add('hidden'));

    mobileLogout.addEventListener('click', () => {
        localStorage.removeItem('loggedInRole');
        window.location.href = 'ownerlogin.html';
        mobileMenu.classList.add('hidden');
    });
});