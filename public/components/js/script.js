// Modal elements and logic
const createPostButton = document.getElementById('createPostButton');
// const createPostModal = document.getElementById('createPostModal');
const cancelPostButton = document.getElementById('cancelPostButton');
const postButton = document.getElementById('postButton');
const createPostForm = document.getElementById('createPostForm');
// const postContent = document.getElementById('postContent');
const fileUpload = document.getElementById('fileUpload');
const linkInput = document.getElementById('linkInput');
// const closeModalButton = document.getElementById('closeModalButton');

const closeModal = () => createPostModal.classList.add('hidden');
const togglePostButton = () => {
    const isValid = postContent.value.trim() || fileUpload.files.length || linkInput.value.trim();
    postButton.disabled = !isValid;
};

// createPostButton.addEventListener('click', () => {
//     createPostModal.classList.remove('hidden');
//     togglePostButton();
// });

[cancelPostButton, closeModalButton].forEach(button => button.addEventListener('click', closeModal));

[postContent, fileUpload, linkInput].forEach(input => input.addEventListener('input', togglePostButton));

postButton.disabled = true;

createPostForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!postButton.disabled) {
        // Handle content here
        closeModal();
        createPostForm.reset();
    }
});

// Search functionality
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchResultsContent = document.getElementById('searchResultsContent');
let users = [];

const renderSearchResults = (results = users) => {
    if (!results.length) {
        searchResultsContent.innerHTML = `<p class="p-4 text-gray-500">No results found.</p>`;
        return;
    }
    searchResultsContent.innerHTML = results.map(user => `
        <div class="flex items-center space-x-3 p-3 hover:bg-gray-100 cursor-pointer">
            <img src="${user.picture.large}" alt="User Avatar" class="w-8 h-8 rounded-full">
            <div>
                <p class="font-medium">${user.name.first} ${user.name.last}</p>
                <p class="text-sm text-gray-500">@${user.login.username}</p>
            </div>
        </div>
    `).join('');
};

fetch('https://randomuser.me/api/?nat=in&results=10')
    .then(res => res.json())
    .then(data => {
        users = data.results;
        renderSearchResults();
    })
    .catch(console.error);

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    renderSearchResults(users.filter(user =>
        [user.name.first, user.name.last, user.login.username]
            .some(field => field.toLowerCase().includes(query))
    ));
});

searchInput.addEventListener('focus', () => searchResults.classList.remove('hidden'));
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});

// Notifications dropdown
const notificationButton = document.getElementById('notificationButton');
const notificationsDropdown = document.getElementById('notificationsDropdown');

notificationButton.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsDropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!notificationButton.contains(e.target) && !notificationsDropdown.contains(e.target)) {
        notificationsDropdown.classList.add('hidden');
    }
});

document.getElementById('markAllRead').addEventListener('click', () => {
    document.getElementById('notificationDot').style.display = 'none';
});
