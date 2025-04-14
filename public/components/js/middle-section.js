document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('create-post-button');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const submitPostBtn = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const postFeed = document.getElementById('post-feed');
    const uploadMediaButton = document.getElementById('upload-media-button');
    const uploadMediaButtonModal = document.getElementById('upload-media-button-modal');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImage = document.getElementById('media-preview-image');
    const storyContainer = document.getElementById('story-container');
    const addStoryButton = document.getElementById('add-story-button');

    let mediaFile = null;

    // Hardcoded fallback Indian user data for instant load
    const fallbackUsers = [
        { media: 'https://randomuser.me/api/portraits/women/1.jpg', username: 'Priya' },
        { media: 'https://randomuser.me/api/portraits/men/2.jpg', username: 'Rahul' },
        { media: 'https://randomuser.me/api/portraits/women/3.jpg', username: 'Aisha' }
    ];

    function getCurrentUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    function toggleModal(show = true) {
        createPostModal.classList.toggle('hidden', !show);
        if (show) {
            postContent.focus();
        } else {
            postContent.value = '';
            mediaPreview.classList.add('hidden');
            mediaFile = null;
        }
    }

    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            const user = getCurrentUser();
            if (!user) {
                alert("You must be logged in to create a post.");
                return;
            }
            toggleModal(true);
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal(false));
    }

    function handleMediaUpload() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*, video/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({ file, url: e.target.result });
                    reader.readAsDataURL(file);
                }
            };
            input.click();
        });
    }

    if (uploadMediaButton) {
        uploadMediaButton.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (uploadMediaButtonModal) {
        uploadMediaButtonModal.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', () => {
            const user = getCurrentUser();
            if (!user) {
                alert("You must be logged in to post.");
                return;
            }

            const content = postContent.value.trim();
            if (!content && !mediaFile) {
                alert('Please write something or upload media!');
                return;
            }

            const newPost = {
                id: Date.now().toString(),
                content: content,
                media: mediaFile ? URL.createObjectURL(mediaFile) : null,
                date: new Date().toISOString(),
                username: user.username
            };

            const posts = JSON.parse(localStorage.getItem('posts')) || [];
            posts.push(newPost);
            localStorage.setItem('posts', JSON.stringify(posts));

            toggleModal(false);

            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.classList.add('fixed', 'bottom-5', 'right-5', 'z-50');
            toastContainer.innerHTML = `
                <style>
                    .toast {
                        display: block;
                        padding: 12px;
                        background-color: #38a169;
                        color: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                        font-size: 14px;
                        font-weight: 600;
                        animation: fadeInRight 0.5s forwards;
                    }
                    @keyframes fadeInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                </style>
                <div class="toast">Post saved successfully!</div>
            `;
            document.body.appendChild(toastContainer);
            setTimeout(() => toastContainer.remove(), 4000);
        });
    }

    async function fetchIndianUsers() {
        try {
            const response = await fetch('https://randomuser.me/api/?nat=in&results=3&inc=name,picture');
            const data = await response.json();
            const indianUsers = data.results.map(user => ({
                media: user.picture.large,
                username: user.name.first
            }));
            localStorage.setItem('indianUsersCache', JSON.stringify({
                data: indianUsers,
                timestamp: Date.now()
            }));
            return indianUsers;
        } catch (error) {
            console.error('Error fetching Indian users:', error);
            return null;
        }
    }

    function getCachedUsers() {
        const cached = localStorage.getItem('indianUsersCache');
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        const isCacheValid = (Date.now() - timestamp) < 86400000; // 24-hour cache
        return isCacheValid ? data : null;
    }

    function renderStories(users) {
        if (!storyContainer) return;

        storyContainer.classList.add('flex', 'items-center', 'space-x-4', 'overflow-x-auto', 'pb-4');
        const addStoryHTML = addStoryButton.outerHTML;

        storyContainer.innerHTML = addStoryHTML + users.map(story => `
            <div class="story flex-shrink-0 text-center">
                <a href="${story.media}" target="_blank">
                    <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover cursor-pointer">
                </a>
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');

        const newAddStoryButton = storyContainer.querySelector('#add-story-button');
        if (newAddStoryButton) {
            newAddStoryButton.addEventListener('click', handleAddStory);
        }
    }

    async function updateStories() {
        const cachedUsers = getCachedUsers();
        const initialUsers = cachedUsers || fallbackUsers;

        // Render immediately with cached or fallback data
        renderStories(initialUsers);

        // Fetch fresh data in the background
        const freshUsers = await fetchIndianUsers();
        if (freshUsers && JSON.stringify(freshUsers) !== JSON.stringify(initialUsers)) {
            renderStories(freshUsers);
        }
    }

    async function handleAddStory() {
        const user = getCurrentUser();
        if (!user) {
            alert("You must be logged in to add a story.");
            return;
        }

        const { file, url } = await handleMediaUpload();
        if (!file) return;

        const newStory = {
            id: Date.now().toString(),
            media: url,
            username: user.username
        };

        const stories = JSON.parse(localStorage.getItem('stories')) || [];
        stories.push(newStory);
        localStorage.setItem('stories', JSON.stringify(stories));

        updateStories();
    }

    if (addStoryButton) {
        addStoryButton.addEventListener('click', handleAddStory);
    }

    function init() {
        updateStories();
    }

    init();
});

// ... (Previous code remains unchanged until createPost function)

// Utility function to manage bookmarks in localStorage
function saveBookmarkToLocalStorage(post) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    if (!bookmarks.some(b => b.id === post.id)) {
        bookmarks.push(post);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
}

function removeBookmarkFromLocalStorage(postId) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    bookmarks = bookmarks.filter(b => b.id !== postId);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function isBookmarked(postId) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    return bookmarks.some(b => b.id === postId);
}

/**
 * Create a post element with improved styling and functionality
 * @param {Object} post - Post data
 * @returns {HTMLElement} - Post element
 */
function createPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post mb-6 rounded-lg overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow duration-300';

    const comments = loadCommentsFromLocalStorage(post.id);
    const bookmarked = isBookmarked(post.id);

    postElement.innerHTML = `
        <div class="relative">
            <img src="${post.thumbnail}" alt="${post.title}" class="w-full h-64 object-cover cursor-pointer" onerror="this.style.display='none'">
            <div class="p-4">
                <h3 class="text-xl font-semibold mb-2">${post.title}</h3>
                <p class="text-gray-600 text-sm mb-4">
                    Posted by <span class="font-medium">${post.author}</span>
                </p>
                <div class="flex items-center justify-between text-gray-500">
                    <button class="like-btn flex items-center space-x-1 hover:text-red-500">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="comment-btn flex items-center space-x-1 hover:text-blue-500">
                        <i class="far fa-comment"></i>
                        <span class="comment-count">${comments.length}</span>
                    </button>
                    <button class="share-btn flex items-center space-x-1 hover:text-green-500">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="bookmark-btn flex items-center space-x-1 hover:text-yellow-500">
                        <i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="comment-section hidden p-4 border-t">
            <textarea class="w-full p-2 border rounded mb-2" placeholder="Write a comment..."></textarea>
            <button class="w-full px-4 py-2 bg-blue-500 text-white rounded post-comment-btn">Post Comment</button>
            <div class="comments-container mt-4">
                ${comments.map(comment => `
                    <div class="comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
                        <div class="comment-content">
                            <span class="font-medium">${comment.author}</span>
                            <p class="mt-1">${comment.text}</p>
                        </div>
                        <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    addPostEventListeners(postElement, post, comments);
    return postElement;
}

/**
 * Add event listeners to post elements
 * @param {HTMLElement} postElement - The post element
 * @param {Object} post - Post data
 * @param {Array} comments - Array of comments
 */
function addPostEventListeners(postElement, post, comments) {
    // ... (Previous event listeners remain unchanged)

    const bookmarkBtn = postElement.querySelector('.bookmark-btn');

    bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUserLoggedIn()) {
            alert('Kindly log in before bookmarking a post.');
            return;
        }
        
        const isCurrentlyBookmarked = bookmarkBtn.querySelector('i').classList.contains('fas');
        if (isCurrentlyBookmarked) {
            removeBookmarkFromLocalStorage(post.id);
            bookmarkBtn.querySelector('i').classList.replace('fas', 'far');
        } else {
            saveBookmarkToLocalStorage(post);
            bookmarkBtn.querySelector('i').classList.replace('far', 'fas');
        }
    });

    // ... (Rest of the function remains unchanged)
}

// ... (Rest of the code remains unchanged)

// ... (Previous code remains unchanged until utility functions)

function saveLikesToLocalStorage(postId, liked) {
    const likes = JSON.parse(localStorage.getItem('likes')) || {};
    likes[postId] = liked;
    localStorage.setItem('likes', JSON.stringify(likes));
}

function isLiked(postId) {
    const likes = JSON.parse(localStorage.getItem('likes')) || {};
    return likes[postId] || false;
}

function saveBookmarkToLocalStorage(post) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    if (!bookmarks.some(b => b.id === post.id)) {
        bookmarks.push(post);
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }
}

function removeBookmarkFromLocalStorage(postId) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    bookmarks = bookmarks.filter(b => b.id !== postId);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

function isBookmarked(postId) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    return bookmarks.some(b => b.id === postId);
}

/**
 * Create a post element with improved styling and functionality
 * @param {Object} post - Post data
 * @returns {HTMLElement} - Post element
 */
function createPost(post) {
    const postElement = document.createElement('div');
    postElement.className = 'post mb-6 rounded-lg overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow duration-300';
    postElement.dataset.id = post.id; // Add data-id for syncing

    const comments = loadCommentsFromLocalStorage(post.id);
    const bookmarked = isBookmarked(post.id);
    const liked = isLiked(post.id);

    postElement.innerHTML = `
        <div class="relative">
            <img src="${post.thumbnail}" alt="${post.title}" class="w-full h-64 object-cover cursor-pointer" onerror="this.style.display='none'">
            <div class="p-4">
                <h3 class="text-xl font-semibold mb-2">${post.title}</h3>
                <p class="text-gray-600 text-sm mb-4">
                    Posted by <span class="font-medium">${post.author}</span>
                </p>
                <div class="flex items-center justify-between text-gray-500">
                    <button class="like-btn flex items-center space-x-1 hover:text-red-500">
                        <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="comment-btn flex items-center space-x-1 hover:text-blue-500">
                        <i class="far fa-comment"></i>
                        <span class="comment-count">${comments.length}</span>
                    </button>
                    <button class="share-btn flex items-center space-x-1 hover:text-green-500">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="bookmark-btn flex items-center space-x-1 hover:text-yellow-500">
                        <i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="comment-section hidden p-4 border-t">
            <textarea class="w-full p-2 border rounded mb-2" placeholder="Write a comment..."></textarea>
            <button class="w-full px-4 py-2 bg-blue-500 text-white rounded post-comment-btn">Post Comment</button>
            <div class="comments-container mt-4">
                ${comments.map(comment => `
                    <div class="comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
                        <div class="comment-content">
                            <span class="font-medium">${comment.author}</span>
                            <p class="mt-1">${comment.text}</p>
                        </div>
                        <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    addPostEventListeners(postElement, post, comments);
    return postElement;
}

/**
 * Add event listeners to post elements
 * @param {HTMLElement} postElement - The post element
 * @param {Object} post - Post data
 * @param {Array} comments - Array of comments
 */
function addPostEventListeners(postElement, post, comments) {
    const postImage = postElement.querySelector('img');
    const likeBtn = postElement.querySelector('.like-btn');
    const commentBtn = postElement.querySelector('.comment-btn');
    const shareBtn = postElement.querySelector('.share-btn');
    const bookmarkBtn = postElement.querySelector('.bookmark-btn');
    const commentSection = postElement.querySelector('.comment-section');
    const postCommentBtn = postElement.querySelector('.post-comment-btn');
    const commentsContainer = postElement.querySelector('.comments-container');
    const commentCount = postElement.querySelector('.comment-count');

    postImage.addEventListener('click', () => {
        window.open(post.permalink, '_blank');
    });

    likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUserLoggedIn()) {
            alert('Kindly log in before liking a post.');
            return;
        }
        const liked = likeBtn.querySelector('i').classList.contains('fas');
        if (liked) {
            likeBtn.querySelector('i').classList.replace('fas', 'far');
            saveLikesToLocalStorage(post.id, false);
        } else {
            likeBtn.querySelector('i').classList.replace('far', 'fas');
            saveLikesToLocalStorage(post.id, true);
        }
        // Sync with Bookmarks page
        syncBookmarkPost(post.id, 'like', !liked);
    });

    commentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUserLoggedIn()) {
            alert('Kindly log in before commenting.');
            return;
        }
        commentSection.classList.toggle('hidden');
    });

    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: post.title,
                url: post.permalink
            }).then(() => console.log('Shared successfully'))
            .catch(console.error);
        } else {
            navigator.clipboard.writeText(post.permalink).then(() => {
                alert('Link copied to clipboard!');
            });
        }
    });

    bookmarkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUserLoggedIn()) {
            alert('Kindly log in before bookmarking a post.');
            return;
        }
        const bookmarked = bookmarkBtn.querySelector('i').classList.contains('fas');
        if (bookmarked) {
            removeBookmarkFromLocalStorage(post.id);
            bookmarkBtn.querySelector('i').classList.replace('fas', 'far');
        } else {
            saveBookmarkToLocalStorage(post);
            bookmarkBtn.querySelector('i').classList.replace('far', 'fas');
        }
        // Sync with Bookmarks page (reload might be needed if on Bookmarks page)
    });

    postCommentBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUserLoggedIn()) {
            alert('Kindly log in before commenting.');
            return;
        }
        const commentText = postElement.querySelector('textarea').value.trim();
        if (!commentText) return;

        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser')) || { name: 'Guest' };
        const timestamp = Date.now();
        const comment = {
            author: loggedInUser.name,
            text: commentText,
            timestamp: timestamp,
        };

        comments.push(comment);
        saveCommentsToLocalStorage(post.id, comments);
        commentCount.textContent = comments.length;

        const commentElement = document.createElement('div');
        commentElement.className = 'comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start';
        commentElement.innerHTML = `
            <div class="comment-content">
                <span class="font-medium">${comment.author}</span>
                <p class="mt-1">${comment.text}</p>
            </div>
            <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
        `;
        commentsContainer.appendChild(commentElement);

        postElement.querySelector('textarea').value = '';
        // Sync with Bookmarks page
        syncBookmarkPost(post.id, 'comment', comments);
    });
}

// Sync changes with the Bookmarks page
function syncBookmarkPost(postId, action, value) {
    const bookmarkPost = document.querySelector(`.bookmark-card[data-id="${postId}"]`);
    if (!bookmarkPost) return;

    if (action === 'like') {
        const likeBtn = bookmarkPost.querySelector('.like-btn i');
        if (value) likeBtn.classList.replace('far', 'fas');
        else likeBtn.classList.replace('fas', 'far');
    } else if (action === 'comment') {
        const commentCount = bookmarkPost.querySelector('.comment-count');
        const commentsContainer = bookmarkPost.querySelector('.comments-container');
        commentCount.textContent = value.length;
        commentsContainer.innerHTML = value.map(comment => `
            <div class="comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start">
                <div class="comment-content">
                    <span class="font-medium">${comment.author}</span>
                    <p class="mt-1">${comment.text}</p>
                </div>
                <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
            </div>
        `).join('');
    }
}

// ... (Rest of the code remains unchanged)

document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('create-post-button');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const submitPostBtn = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const uploadMediaButton = document.getElementById('upload-media-button');
    const uploadMediaButtonModal = document.getElementById('upload-media-button-modal');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImage = document.getElementById('media-preview-image');
    const storyContainer = document.getElementById('story-container');
    const addStoryButton = document.getElementById('add-story-button');
    const storyModal = document.getElementById('story-modal');
    const closeStoryModalBtn = document.getElementById('close-story-modal');
    const storyImage = document.getElementById('story-image');

    let mediaFile = null;

    // Hardcoded fallback Indian user data for instant load
    const fallbackUsers = [
        { media: 'https://source.unsplash.com/random/360x640?sig=1', username: 'Priya' },
        { media: 'https://source.unsplash.com/random/360x640?sig=2', username: 'Rahul' },
        { media: 'https://source.unsplash.com/random/360x640?sig=3', username: 'Aisha' }
    ];

    function getCurrentUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    function toggleModal(show = true) {
        createPostModal.classList.toggle('hidden', !show);
        if (show) postContent.focus();
        else {
            postContent.value = '';
            mediaPreview.classList.add('hidden');
            mediaFile = null;
        }
    }

    // if (createPostBtn) {
    //     createPostBtn.addEventListener('click', () => {
    //         const user = getCurrentUser();
    //         if (!user) {
    //             alert("You must be logged in to create a post.");
    //             return;
    //         }
    //         toggleModal(true);
    //     });
    // }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal(false));
    }

    // function handleMediaUpload() {
    //     return new Promise((resolve) => {
    //         const input = document.createElement('input');
    //         input.type = 'file';
    //         input.accept = 'image/*, video/*';
    //         input.onchange = (e) => {
    //             const file = e.target.files[0];
    //             if (file) {
    //                 const reader = new FileReader();
    //                 reader.onload = (e) => resolve({ file, url: e.target.result });
    //                 reader.readAsDataURL(file);
    //             }
    //         };
    //         input.click();
    //     });
    // }

    if (uploadMediaButton) {
        uploadMediaButton.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (uploadMediaButtonModal) {
        uploadMediaButtonModal.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    // if (submitPostBtn) {
    //     submitPostBtn.addEventListener('click', () => {
    //         const user = getCurrentUser();
    //         if (!user) {
    //             alert("You must be logged in to post.");
    //             return;
    //         }
    //         const content = postContent.value.trim();
    //         if (!content && !mediaFile) {
    //             alert('Please write something or upload media!');
    //             return;
    //         }
    //         const newPost = {
    //             id: Date.now().toString(),
    //             content: content,
    //             media: mediaFile ? URL.createObjectURL(mediaFile) : null,
    //             date: new Date().toISOString(),
    //             username: user.username
    //         };
    //         const posts = JSON.parse(localStorage.getItem('posts')) || [];
    //         posts.push(newPost);
    //         localStorage.setItem('posts', JSON.stringify(posts));
    //         toggleModal(false);
    //         showToast('Post saved successfully!');
    //     });
    // }

    function showToast(message) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.classList.add('fixed', 'bottom-5', 'right-5', 'z-50');
        toastContainer.innerHTML = `
            <style>
                .toast { display: block; padding: 12px; background-color: #38a169; color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-size: 14px; font-weight: 600; animation: fadeInRight 0.5s forwards; }
                @keyframes fadeInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            </style>
            <div class="toast">${message}</div>
        `;
        document.body.appendChild(toastContainer);
        setTimeout(() => toastContainer.remove(), 4000);
    }

    async function fetchIndianUsers() {
        try {
            const response = await fetch('https://randomuser.me/api/?nat=in&results=3&inc=name,picture');
            const data = await response.json();
            return data.results.map(user => ({
                media: user.picture.large,
                username: user.name.first
            }));
        } catch (error) {
            console.error('Error fetching Indian users:', error);
            return null;
        }
    }

    function getCachedUsers() {
        const cached = localStorage.getItem('indianUsersCache');
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        const isCacheValid = (Date.now() - timestamp) < 86400000; // 24-hour cache
        return isCacheValid ? data : null;
    }

    function renderStories(users) {
        if (!storyContainer) return;

        storyContainer.classList.add('flex', 'items-center', 'space-x-4', 'overflow-x-auto', 'pb-4');
        const addStoryHTML = addStoryButton.outerHTML;

        storyContainer.innerHTML = addStoryHTML + users.map(story => `
            <div class="story flex-shrink-0 text-center cursor-pointer" data-media="${story.media}">
                <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover">
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');

        const newAddStoryButton = storyContainer.querySelector('#add-story-button');
        if (newAddStoryButton) {
            newAddStoryButton.addEventListener('click', handleAddStory);
        }

        // Add click event listeners to story items
        const storyItems = storyContainer.querySelectorAll('.story');
        storyItems.forEach(item => {
            item.addEventListener('click', () => {
                const mediaUrl = item.dataset.media;
                storyImage.src = mediaUrl;
                storyModal.classList.remove('hidden');
            });
        });
    }

    async function updateStories() {
        const cachedUsers = getCachedUsers();
        const initialUsers = cachedUsers || fallbackUsers;

        // Render immediately with cached or fallback data
        renderStories(initialUsers);

        // Fetch fresh data in the background
        const freshUsers = await fetchIndianUsers();
        if (freshUsers && JSON.stringify(freshUsers) !== JSON.stringify(initialUsers)) {
            renderStories(freshUsers);
        }
    }

    // async function handleAddStory() {
    //     const user = getCurrentUser();
    //     if (!user) {
    //         alert("You must be logged in to add a story.");
    //         return;
    //     }

    //     const { file, url } = await handleMediaUpload();
    //     if (!file) return;

    //     const newStory = {
    //         id: Date.now().toString(),
    //         media: url,
    //         username: user.username
    //     };

    //     const stories = JSON.parse(localStorage.getItem('stories')) || [];
    //     stories.push(newStory);
    //     localStorage.setItem('stories', JSON.stringify(stories));

    //     updateStories();
    // }

    if (addStoryButton) {
        addStoryButton.addEventListener('click', handleAddStory);
    }

    if (closeStoryModalBtn) {
        closeStoryModalBtn.addEventListener('click', () => {
            storyModal.classList.add('hidden');
        });
    }

    function init() {
        updateStories();
    }

    init();
});
document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('create-post-button');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const submitPostBtn = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const uploadMediaButton = document.getElementById('upload-media-button');
    const uploadMediaButtonModal = document.getElementById('upload-media-button-modal');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImage = document.getElementById('media-preview-image');
    const storyContainer = document.getElementById('story-container');
    const addStoryButton = document.getElementById('add-story-button');
    const storyModal = document.getElementById('story-modal');
    const closeStoryModalBtn = document.getElementById('close-story-modal');
    const storyImage = document.getElementById('story-image');

    let mediaFile = null;

    // Hardcoded fallback story data with random images
    const fallbackStories = [
        { media: 'https://source.unsplash.com/random/360x640?sig=1', username: 'Priya' },
        { media: 'https://source.unsplash.com/random/360x640?sig=2', username: 'Rahul' },
        { media: 'https://source.unsplash.com/random/360x640?sig=3', username: 'Aisha' }
    ];

    function getCurrentUser() {
        const user = localStorage.getItem('loggedInUser');
        return user ? JSON.parse(user) : null;
    }

    function toggleModal(show = true) {
        createPostModal.classList.toggle('hidden', !show);
        if (show) postContent.focus();
        else {
            postContent.value = '';
            mediaPreview.classList.add('hidden');
            mediaFile = null;
        }
    }

    // if (createPostBtn) {
    //     createPostBtn.addEventListener('click', () => {
    //         const user = getCurrentUser();
    //         if (!user) {
    //             alert("You must be logged in to create a post.");
    //             return;
    //         }
    //         toggleModal(true);
    //     });
    // }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal(false));
    }

    // function handleMediaUpload() {
    //     return new Promise((resolve) => {
    //         const input = document.createElement('input');
    //         input.type = 'file';
    //         input.accept = 'image/*, video/*';
    //         input.onchange = (e) => {
    //             const file = e.target.files[0];
    //             if (file) {
    //                 const reader = new FileReader();
    //                 reader.onload = (e) => resolve({ file, url: e.target.result });
    //                 reader.readAsDataURL(file);
    //             }
    //         };
    //         input.click();
    //     });
    // }

    if (uploadMediaButton) {
        uploadMediaButton.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    if (uploadMediaButtonModal) {
        uploadMediaButtonModal.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            mediaFile = file;
            mediaPreviewImage.src = url;
            mediaPreview.classList.remove('hidden');
        });
    }

    // if (submitPostBtn) {
    //     submitPostBtn.addEventListener('click', () => {
    //         const user = getCurrentUser();
    //         if (!user) {
    //             alert("You must be logged in to post.");
    //             return;
    //         }
    //         const content = postContent.value.trim();
    //         if (!content || !mediaFile) {
    //             alert('Please write something or upload media!');
    //             return;
    //         }
    //         const newPost = {
    //             id: Date.now().toString(),
    //             content: content,
    //             media: mediaFile ? URL.createObjectURL(mediaFile) : null,
    //             date: new Date().toISOString(),
    //             username: user.username
    //         };
    //         const posts = JSON.parse(localStorage.getItem('posts')) || [];
    //         posts.push(newPost);
    //         localStorage.setItem('posts', JSON.stringify(posts));
    //         toggleModal(false);
    //         showToast('Post saved successfully!');
    //     });
    // }

    function showToast(message) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.classList.add('fixed', 'bottom-5', 'right-5', 'z-50');
        toastContainer.innerHTML = `
            <style>
                .toast { display: block; padding: 12px; background-color: #38a169; color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); font-size: 14px; font-weight: 600; animation: fadeInRight 0.5s forwards; }
                @keyframes fadeInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            </style>
            <div class="toast">${message}</div>
        `;
        document.body.appendChild(toastContainer);
        setTimeout(() => toastContainer.remove(), 4000);
    }

    function renderStories(stories) {
        if (!storyContainer) return;

        storyContainer.classList.add('flex', 'items-center', 'space-x-4', 'overflow-x-auto', 'pb-4');
        const addStoryHTML = addStoryButton.outerHTML;

        storyContainer.innerHTML = addStoryHTML + stories.map(story => `
            <div class="story flex-shrink-0 text-center cursor-pointer" data-media="${story.media}">
                <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover">
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');

        const newAddStoryButton = storyContainer.querySelector('#add-story-button');
        if (newAddStoryButton) {
            newAddStoryButton.addEventListener('click', handleAddStory);
        }

        // Add click event listeners to story items
        const storyItems = storyContainer.querySelectorAll('.story');
        storyItems.forEach(item => {
            item.addEventListener('click', () => {
                const mediaUrl = item.dataset.media;
                storyImage.src = mediaUrl;
                storyModal.classList.remove('hidden');
            });
        });
    }

    // async function handleAddStory() {
    //     const user = getCurrentUser();
    //     if (!user) {
    //         alert("You must be logged in to add a story.");
    //         return;
    //     }

    //     const { file, url } = await handleMediaUpload();
    //     if (!file) return;

    //     const newStory = {
    //         id: Date.now().toString(),
    //         media: url,
    //         username: user.username
    //     };

    //     const stories = JSON.parse(localStorage.getItem('stories')) || [];
    //     stories.push(newStory);
    //     localStorage.setItem('stories', JSON.stringify(stories));

    //     renderStories(stories);
    // }

    if (addStoryButton) {
        addStoryButton.addEventListener('click', handleAddStory);
    }

    if (closeStoryModalBtn) {
        closeStoryModalBtn.addEventListener('click', () => {
            storyModal.classList.add('hidden');
        });
    }

    function init() {
        const savedStories = JSON.parse(localStorage.getItem('stories')) || fallbackStories;
        renderStories(savedStories);
    }

    init();
});