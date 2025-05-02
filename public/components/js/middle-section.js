document.addEventListener('DOMContentLoaded', () => {
    const createPostBtn = document.getElementById('create-post-button');
    const createPostModal = document.getElementById('create-post-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const submitPostBtn = document.getElementById('submit-post');
    const postContent = document.getElementById('post-content');
    const uploadMediaButton = document.getElementById('upload-media-button');
    const uploadMediaButtonModal = document.getElementById('upload-media-button-modal');
    const fileUploadInput = document.getElementById('fileUpload');
    const linkInput = document.getElementById('linkInput');
    const mediaPreview = document.getElementById('media-preview');
    const mediaPreviewImage = document.getElementById('media-preview-image');
    const storyContainer = document.getElementById('story-container');
    const addStoryButton = document.getElementById('add-story-button');
    const storyModal = document.getElementById('story-modal');
    const closeStoryModalBtn = document.getElementById('close-story-modal');
    const storyImage = document.getElementById('story-image');

    let mediaFile = null;

    // Utility functions
    function formatTimestamp(timestamp) {
        const now = Date.now();
        const secondsAgo = Math.floor((now - timestamp) / 1000);
        if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
        return `${Math.floor(secondsAgo / 86400)} days ago`;
    }

    async function isUserLoggedIn() {
        try {
            const response = await fetch('/api/me', { credentials: 'include' });
            if (response.ok) {
                const data = await response.json();
                return data.user && data.user.name !== 'Guest' ? data.user : false;
            }
            return false;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }

    async function updateProfilePicture() {
        try {
            const profileImg = document.getElementById('create-post-profile-img');
            if (!profileImg) {
                console.warn('create-post-profile-img element not found');
                return;
            }

            // Check localStorage first
            const storedImage = localStorage.getItem('profilePicture');
            if (storedImage) {
                profileImg.src = storedImage;
                return;
            }

            // Fetch from /api/me
            const user = await isUserLoggedIn();
            if (user && user.profilePhoto) { // Use profilePhoto to match homePage.ejs
                profileImg.src = user.profilePhoto;
                try {
                    localStorage.setItem('profilePicture', user.profilePhoto);
                } catch (error) {
                    console.warn('Failed to store profile picture in localStorage:', error);
                }
            } else {
                // Fallback to placeholder
                profileImg.src = 'https://via.placeholder.com/64';
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
            const profileImg = document.getElementById('create-post-profile-img');
            if (profileImg) {
                profileImg.src = 'https://via.placeholder.com/64';
            }
        }
    }

    function saveCommentsToLocalStorage(postId, comments) {
        console.log(`Saving comments for post ${postId}:`, comments);
        localStorage.setItem(`comments_${postId}`, JSON.stringify(comments));
    }

    function loadCommentsFromLocalStorage(postId) {
        const comments = localStorage.getItem(`comments_${postId}`);
        const parsed = comments ? JSON.parse(comments) : [];
        console.log(`Loaded comments for post ${postId}:`, parsed);
        return parsed;
    }

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

    function toggleModal(show = true) {
        if (createPostModal) {
            createPostModal.classList.toggle('hidden', !show);
            if (show) {
                postContent.focus();
            } else {
                postContent.value = '';
                if (linkInput) linkInput.value = '';
                if (fileUploadInput) fileUploadInput.value = '';
                if (mediaPreview) mediaPreview.classList.add('hidden');
                mediaFile = null;
            }
        }
    }

    async function handleMediaUpload() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,video/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({ file, url: e.target.result });
                    reader.readAsDataURL(file);
                } else {
                    resolve({ file: null, url: null });
                }
            };
            input.click();
        });
    }

    // Post creation
    if (createPostBtn) {
        createPostBtn.addEventListener('click', async () => {
            if (!(await isUserLoggedIn())) {
                alert('You must be logged in to create a post.');
                return;
            }
            toggleModal(true);
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => toggleModal(false));
    }

    if (uploadMediaButton) {
        uploadMediaButton.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            if (file && url) {
                mediaFile = file;
                if (mediaPreviewImage) mediaPreviewImage.src = url;
                if (mediaPreview) mediaPreview.classList.remove('hidden');
                if (fileUploadInput) fileUploadInput.files = new DataTransfer().files; // Clear input
            }
        });
    }

    if (uploadMediaButtonModal) {
        uploadMediaButtonModal.addEventListener('click', async () => {
            const { file, url } = await handleMediaUpload();
            if (file && url) {
                mediaFile = file;
                if (mediaPreviewImage) mediaPreviewImage.src = url;
                if (mediaPreview) mediaPreview.classList.remove('hidden');
                if (fileUploadInput) fileUploadInput.files = new DataTransfer().files; // Clear input
            }
        });
    }

    if (submitPostBtn) {
        submitPostBtn.addEventListener('click', async () => {
            if (!(await isUserLoggedIn())) {
                alert('You must be logged in to post.');
                return;
            }

            const content = postContent ? postContent.value.trim() : '';
            const link = linkInput ? linkInput.value.trim() : '';
            const file = fileUploadInput && fileUploadInput.files[0] ? fileUploadInput.files[0] : mediaFile;

            if (!content && !file && !link) {
                alert('Please provide content, a link, or upload media.');
                return;
            }

            const formData = new FormData();
            formData.append('content', content);
            if (file) formData.append('fileUpload', file);
            if (link) formData.append('linkInput', link);

            try {
                const response = await fetch('/api/posts', {
                    method: 'POST',
                    body: formData,
                    credentials: 'include'
                });
                if (response.ok) {
                    showToast('Post created successfully!');
                    toggleModal(false);
                } else {
                    const error = await response.json();
                    alert(`Failed to create post: ${error.message}`);
                }
            } catch (error) {
                console.error('Error creating post:', error);
                alert('An error occurred while creating the post.');
            }
        });
    }

    // Comment-related functions (for use in my-posts.ejs)
    async function createUserPost(post) {
        const postElement = document.createElement('div');
        postElement.className = 'post mb-6 rounded-lg overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow duration-300';
        postElement.dataset.id = post._id;

        const comments = loadCommentsFromLocalStorage(post._id);
        const bookmarked = isBookmarked(post._id);
        const liked = isLiked(post._id);
        const user = await isUserLoggedIn();

        console.log(`Creating post ${post._id}, user:`, user, 'comments:', comments);

        postElement.innerHTML = `
            <div class="relative">
                ${post.file ? `<img src="${post.file}" alt="Post media" class="w-full h-64 object-cover" onerror="this.style.display='none'">` : ''}
                <div class="p-4">
                    <h3 class="text-xl font-semibold mb-2">${post.content}</h3>
                    ${post.link ? `<a href="${post.link}" target="_blank" class="text-blue-500 underline">Visit Link</a>` : ''}
                    <p class="text-gray-600 text-sm mb-4">
                        Posted by <span class="font-medium">${post.userId.name || 'User'}</span>
                        <span class="text-gray-500 text-xs ml-2">${formatTimestamp(new Date(post.createdAt))}</span>
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
                    ${comments.map((comment, index) => {
            console.log(`Comment ${index} for post ${post._id}: author=${comment.author}, user=${user ? user.name : 'none'}`);
            return `
                            <div class="comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start" data-comment-index="${index}">
                                <div class="comment-content">
                                    <span class="font-medium">${comment.author}</span>
                                    <p class="mt-1">${comment.text}</p>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
                                    ${user && user.name === comment.author ? `
                                        <button class="edit-comment-btn text-blue-500 hover:text-blue-700" style="display: inline-block;">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="delete-comment-btn text-red-500 hover:text-red-700" style="display: inline-block;">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;

        addPostEventListeners(postElement, post, comments);
        return postElement;
    }

    async function addPostEventListeners(postElement, post, comments) {
        const postImage = postElement.querySelector('img');
        const likeBtn = postElement.querySelector('.like-btn');
        const commentBtn = postElement.querySelector('.comment-btn');
        const shareBtn = postElement.querySelector('.share-btn');
        const bookmarkBtn = postElement.querySelector('.bookmark-btn');
        const commentSection = postElement.querySelector('.comment-section');
        const postCommentBtn = postElement.querySelector('.post-comment-btn');
        const commentsContainer = postElement.querySelector('.comments-container');
        const commentCount = postElement.querySelector('.comment-count');
        const editCommentBtns = postElement.querySelectorAll('.edit-comment-btn');
        const deleteCommentBtns = postElement.querySelectorAll('.delete-comment-btn');

        console.log(`Attaching listeners for post ${post._id}: ${editCommentBtns.length} edit buttons, ${deleteCommentBtns.length} delete buttons`);

        if (postImage) {
            postImage.addEventListener('click', () => {
                if (post.file) {
                    window.open(post.file, '_blank');
                }
            });
        }

        if (likeBtn) {
            likeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!(await isUserLoggedIn())) {
                    alert('Kindly log in before liking a post.');
                    return;
                }
                const liked = likeBtn.querySelector('i').classList.contains('fas');
                if (liked) {
                    likeBtn.querySelector('i').classList.replace('fas', 'far');
                    saveLikesToLocalStorage(post._id, false);
                } else {
                    likeBtn.querySelector('i').classList.replace('far', 'fas');
                    saveLikesToLocalStorage(post._id, true);
                }
                syncBookmarkPost(post._id, 'like', !liked);
            });
        }

        if (commentBtn) {
            commentBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!(await isUserLoggedIn())) {
                    alert('Kindly log in before commenting.');
                    return;
                }
                commentSection.classList.toggle('hidden');
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = post.link || window.location.href;
                if (navigator.share) {
                    navigator.share({
                        title: post.content,
                        url: url
                    }).then(() => console.log('Shared successfully')).catch(console.error);
                } else {
                    navigator.clipboard.writeText(url).then(() => {
                        alert('Link copied to clipboard!');
                    });
                }
            });
        }

        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!(await isUserLoggedIn())) {
                    alert('Kindly log in before bookmarking a post.');
                    return;
                }
                const bookmarked = bookmarkBtn.querySelector('i').classList.contains('fas');
                if (bookmarked) {
                    removeBookmarkFromLocalStorage(post._id);
                    bookmarkBtn.querySelector('i').classList.replace('fas', 'far');
                } else {
                    saveBookmarkToLocalStorage({ id: post._id, content: post.content, file: post.file, author: post.userId.name });
                    bookmarkBtn.querySelector('i').classList.replace('far', 'fas');
                }
            });
        }

        if (postCommentBtn) {
            postCommentBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const user = await isUserLoggedIn();
                if (!user) {
                    alert('Kindly log in before commenting.');
                    return;
                }
                const commentText = postElement.querySelector('textarea').value.trim();
                if (!commentText) {
                    alert('Please enter a comment.');
                    return;
                }

                const timestamp = Date.now();
                const comment = {
                    author: user.name,
                    text: commentText,
                    timestamp: timestamp
                };

                comments.push(comment);
                saveCommentsToLocalStorage(post._id, comments);
                commentCount.textContent = comments.length;

                const commentElement = document.createElement('div');
                commentElement.className = 'comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start';
                commentElement.dataset.commentIndex = comments.length - 1;
                commentElement.innerHTML = `
                    <div class="comment-content">
                        <span class="font-medium">${comment.author}</span>
                        <p class="mt-1">${comment.text}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
                        <button class="edit-comment-btn text-blue-500 hover:text-blue-700" style="display: inline-block;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-comment-btn text-red-500 hover:text-red-700" style="display: inline-block;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `;
                commentsContainer.appendChild(commentElement);
                console.log(`Added comment to post ${post._id}:`, comment);

                postElement.querySelector('textarea').value = '';
                showToast('Comment added successfully!');
                syncBookmarkPost(post._id, 'comment', comments);

                // Add edit and delete event listeners to the new comment
                console.log(`Attaching listeners to new comment for post ${post._id}`);
                commentElement.querySelector('.edit-comment-btn').addEventListener('click', () => {
                    console.log(`Edit button clicked for comment ${comments.length - 1} on post ${post._id}`);
                    handleEditComment(post._id, comments, commentElement, commentCount);
                });
                commentElement.querySelector('.delete-comment-btn').addEventListener('click', () => {
                    console.log(`Delete button clicked for comment ${comments.length - 1} on post ${post._id}`);
                    handleDeleteComment(post._id, comments, commentElement, commentCount);
                });
            });
        }

        editCommentBtns.forEach((btn, index) => {
            console.log(`Attaching edit listener to button ${index} for post ${post._id}`);
            btn.addEventListener('click', () => {
                console.log(`Edit button ${index} clicked for post ${post._id}`);
                handleEditComment(post._id, comments, btn.closest('.comment'), commentCount);
            });
        });

        deleteCommentBtns.forEach((btn, index) => {
            console.log(`Attaching delete listener to button ${index} for post ${post._id}`);
            btn.addEventListener('click', () => {
                console.log(`Delete button ${index} clicked for post ${post._id}`);
                handleDeleteComment(post._id, comments, btn.closest('.comment'), commentCount);
            });
        });
    }

    async function handleEditComment(postId, comments, commentElement, commentCount) {
        const user = await isUserLoggedIn();
        if (!user) {
            alert('Kindly log in to edit a comment.');
            return;
        }

        const index = parseInt(commentElement.dataset.commentIndex);
        if (comments[index].author !== user.name) {
            alert('You can only edit your own comments.');
            return;
        }

        const commentContent = commentElement.querySelector('.comment-content');
        const currentText = comments[index].text;

        // Replace comment content with textarea and save button
        commentContent.innerHTML = `
            <textarea class="w-full p-2 border rounded mb-2 edit-comment-textarea">${currentText}</textarea>
            <button class="px-2 py-1 bg-green-500 text-white rounded save-comment-btn">Save</button>
        `;

        const saveBtn = commentElement.querySelector('.save-comment-btn');
        saveBtn.addEventListener('click', () => {
            const newText = commentElement.querySelector('.edit-comment-textarea').value.trim();
            if (!newText) {
                alert('Comment cannot be empty.');
                return;
            }

            comments[index].text = newText;
            saveCommentsToLocalStorage(postId, comments);

            // Restore comment display
            commentContent.innerHTML = `
                <span class="font-medium">${comments[index].author}</span>
                <p class="mt-1">${newText}</p>
            `;
            showToast('Comment updated successfully!');
            syncBookmarkPost(postId, 'comment', comments);
            console.log(`Updated comment at index ${index} for post ${postId}:`, comments[index]);

            // Re-attach edit and delete listeners
            commentElement.querySelector('.edit-comment-btn').addEventListener('click', () => handleEditComment(postId, comments, commentElement, commentCount));
            commentElement.querySelector('.delete-comment-btn').addEventListener('click', () => handleDeleteComment(postId, comments, commentElement, commentCount));
        });
    }

    async function handleDeleteComment(postId, comments, commentElement, commentCount) {
        const user = await isUserLoggedIn();
        if (!user) {
            alert('Kindly log in to delete a comment.');
            return;
        }

        const index = parseInt(commentElement.dataset.commentIndex);
        if (comments[index].author !== user.name) {
            alert('You can only delete your own comments.');
            return;
        }

        comments.splice(index, 1); // Remove comment
        saveCommentsToLocalStorage(postId, comments);
        commentElement.remove(); // Remove from DOM
        commentCount.textContent = comments.length; // Update count
        console.log(`Deleted comment at index ${index} for post ${postId}`);
        syncBookmarkPost(postId, 'comment', comments); // Sync bookmarks
    }

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
            const user = isUserLoggedIn();
            commentCount.textContent = value.length;
            commentsContainer.innerHTML = value.map((comment, index) => `
                <div class="comment mb-2 p-2 bg-gray-100 rounded flex justify-between items-start" data-comment-index="${index}">
                    <div class="comment-content">
                        <span class="font-medium">${comment.author}</span>
                        <p class="mt-1">${comment.text}</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="text-gray-500 text-sm">${formatTimestamp(comment.timestamp)}</span>
                        ${user && user.name === comment.author ? `
                            <button class="edit-comment-btn text-blue-500 hover:text-blue-700" style="display: inline-block;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-comment-btn text-red-500 hover:text-red-700" style="display: inline-block;">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('');

            // Add edit and delete listeners for bookmark comments
            bookmarkPost.querySelectorAll('.edit-comment-btn').forEach((btn, index) => {
                console.log(`Attaching edit listener to bookmark comment ${index} for post ${postId}`);
                btn.addEventListener('click', () => {
                    console.log(`Edit button ${index} clicked for bookmark post ${postId}`);
                    handleEditComment(postId, value, btn.closest('.comment'), commentCount);
                });
            });
            bookmarkPost.querySelectorAll('.delete-comment-btn').forEach((btn, index) => {
                console.log(`Attaching delete listener to bookmark comment ${index} for post ${postId}`);
                btn.addEventListener('click', () => {
                    console.log(`Delete button ${index} clicked for bookmark post ${postId}`);
                    handleDeleteComment(postId, value, btn.closest('.comment'), commentCount);
                });
            });
        }
    }

    // Story management with RandomUser.me
    async function fetchRandomIndianUsers() {
        try {
            console.log('Fetching Indian users from RandomUser.me');
            // Fetch 3 Indian users (nat=IN for India)
            const response = await fetch('https://randomuser.me/api/?results=3&nat=IN');

            if (response.ok) {
                const data = await response.json();
                const users = data.results.map(user => ({
                    firstName: user.name.first,
                    image: user.picture.large // Use larger image for better quality
                }));

                console.log('Fetched Indian users:', users);
                return users;
            } else {
                console.error('Failed to fetch Indian users:', response.status);
                return [
                    { firstName: 'Aarav', image: 'https://via.placeholder.com/64' },
                    { firstName: 'Vivaan', image: 'https://via.placeholder.com/64' },
                    { firstName: 'Aditya', image: 'https://via.placeholder.com/64' }
                ]; // Fallback Indian names
            }
        } catch (error) {
            console.error('Error fetching Indian users:', error);
            return [
                { firstName: 'Aarav', image: 'https://via.placeholder.com/64' },
                { firstName: 'Vivaan', image: 'https://via.placeholder.com/64' },
                { firstName: 'Aditya', image: 'https://via.placeholder.com/64' }
            ]; // Fallback Indian names
        }
    }

    function getLocalStories() {
        const localStories = localStorage.getItem('localStories');
        const parsed = localStories ? JSON.parse(localStories) : [];
        console.log('Loaded local stories:', parsed);
        return parsed;
    }

    function saveLocalStories(stories) {
        console.log('Saving local stories:', stories);
        localStorage.setItem('localStories', JSON.stringify(stories));
    }

    function renderStories(stories) {
        if (!storyContainer) {
            console.warn('story-container element not found');
            return;
        }

        console.log('Rendering stories:', stories);
        storyContainer.classList.add('flex', 'items-center', 'space-x-4', 'overflow-x-auto', 'pb-4', 'visible');
        storyContainer.style.display = 'flex'; // Ensure visibility
        const addStoryHTML = addStoryButton ? addStoryButton.outerHTML : '';

        storyContainer.innerHTML = addStoryHTML + stories.map(story => `
            <div class="story flex-shrink-0 text-center cursor-pointer" data-media="${story.media}">
                <img src="${story.media}" alt="Story" class="w-16 h-16 rounded-full object-cover border-2 border-blue-500">
                <p class="text-sm text-gray-700 mt-2">${story.username}</p>
            </div>
        `).join('');

        const newAddStoryButton = storyContainer.querySelector('#add-story-button');
        if (newAddStoryButton) {
            newAddStoryButton.addEventListener('click', handleAddStory);
        }

        const storyItems = storyContainer.querySelectorAll('.story');
        storyItems.forEach(item => {
            item.addEventListener('click', () => {
                const mediaUrl = item.dataset.media;
                if (storyImage) storyImage.src = mediaUrl;
                if (storyModal) storyModal.classList.remove('hidden');
            });
        });
    }

    async function updateStories() {
        const localStories = getLocalStories();
        const indianUsers = await fetchRandomIndianUsers();
        const randomStories = indianUsers.map(user => ({
            media: user.image,
            username: user.firstName
        }));
        const allStories = [...localStories, ...randomStories];
        renderStories(allStories);
    }

    async function handleAddStory() {
        const user = await isUserLoggedIn();
        if (!user) {
            alert('You must be logged in to add a story.');
            return;
        }

        const { file, url } = await handleMediaUpload();
        if (!file || !url) {
            alert('Please select an image to upload.');
            return;
        }

        const localStories = getLocalStories();
        localStories.unshift({ media: url, username: user.name }); // Add new story at start
        if (localStories.length > 5) localStories.pop(); // Limit to 5 stories
        saveLocalStories(localStories);
        showToast('Story added successfully!');
        await updateStories();
    }

    if (addStoryButton) {
        addStoryButton.addEventListener('click', handleAddStory);
    }

    if (closeStoryModalBtn) {
        closeStoryModalBtn.addEventListener('click', () => {
            if (storyModal) storyModal.classList.add('hidden');
        });
    }

    function init() {
        updateProfilePicture();
        updateStories();
    }

    init();
});