document.addEventListener('DOMContentLoaded', () => {
    const bookmarksContainer = document.getElementById('bookmarks');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.querySelector('.modal-close');

    // Utility functions for localStorage
    function saveBookmarksToLocalStorage(bookmarks) {
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }

    function loadBookmarksFromLocalStorage() {
        return JSON.parse(localStorage.getItem('bookmarks')) || [];
    }

    function saveCommentsToLocalStorage(postId, comments) {
        localStorage.setItem(`comments_${postId}`, JSON.stringify(comments));
    }

    function loadCommentsFromLocalStorage(postId) {
        const comments = localStorage.getItem(`comments_${postId}`);
        return comments ? JSON.parse(comments) : [];
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

    function formatTimestamp(timestamp) {
        const now = Date.now();
        const secondsAgo = Math.floor((now - timestamp) / 1000);
        if (secondsAgo < 60) return `${secondsAgo} seconds ago`;
        if (secondsAgo < 3600) return `${Math.floor(secondsAgo / 60)} minutes ago`;
        if (secondsAgo < 86400) return `${Math.floor(secondsAgo / 3600)} hours ago`;
        return `${Math.floor(secondsAgo / 86400)} days ago`;
    }

    function isUserLoggedIn() {
        const loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        return loggedInUser && loggedInUser.name !== 'Guest';
    }

    function loadBookmarks() {
        const bookmarks = loadBookmarksFromLocalStorage();
        bookmarksContainer.innerHTML = '';

        if (bookmarks.length === 0) {
            bookmarksContainer.innerHTML = '<p class="text-gray-500 text-center">No bookmarks yet.</p>';
            return;
        }

        bookmarks.forEach(post => {
            const bookmarkElement = createBookmarkElement(post);
            bookmarksContainer.appendChild(bookmarkElement);
        });
    }

    function createBookmarkElement(post) {
        const bookmarkElement = document.createElement('div');
        bookmarkElement.className = 'bookmark-card bg-white rounded-lg shadow-md p-4 flex flex-col space-y-4';
        bookmarkElement.dataset.id = post.id; // Add data-id for easier reference

        const comments = loadCommentsFromLocalStorage(post.id);
        const liked = isLiked(post.id);

        bookmarkElement.innerHTML = `
            <div class="flex items-center space-x-4">
                <img src="${post.thumbnail}" alt="${post.title}" class="w-24 h-24 object-cover rounded-md" onerror="this.style.display='none'">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900">${post.title}</h3>
                    <p class="text-sm text-gray-600">Posted by <span class="font-medium">${post.author}</span></p>
                    <p class="text-xs text-gray-500">${formatTimestamp(post.created)}</p>
                </div>
            </div>
            <div class="flex justify-between items-center text-gray-500">
                <button class="like-btn flex items-center space-x-1 hover:text-red-500">
                    <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
                    <span>Likes</span>
                </button>
                <button class="comment-btn flex items-center space-x-1 hover:text-blue-500">
                    <i class="far fa-comment"></i>
                    <span class="comment-count">${comments.length}</span>
                </button>
                <button class="share-btn flex items-center space-x-1 hover:text-green-500">
                    <i class="fas fa-share-alt"></i>
                    <span>Share</span>
                </button>
                <button class="remove-bookmark-btn flex items-center space-x-1 hover:text-yellow-600">
                    <i class="fas fa-bookmark"></i>
                    <span>Unbookmark</span>
                </button>
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

        // Add event listeners
        addBookmarkEventListeners(bookmarkElement, post, comments);
        return bookmarkElement;
    }

    function addBookmarkEventListeners(bookmarkElement, post, comments) {
        const likeBtn = bookmarkElement.querySelector('.like-btn');
        const commentBtn = bookmarkElement.querySelector('.comment-btn');
        const shareBtn = bookmarkElement.querySelector('.share-btn');
        const removeBookmarkBtn = bookmarkElement.querySelector('.remove-bookmark-btn');
        const commentSection = bookmarkElement.querySelector('.comment-section');
        const postCommentBtn = bookmarkElement.querySelector('.post-comment-btn');
        const commentsContainer = bookmarkElement.querySelector('.comments-container');
        const commentCount = bookmarkElement.querySelector('.comment-count');

        // Like functionality
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
            // Sync with main feed
            syncFeedPost(post.id, 'like', !liked);
        });

        // Comment functionality
        commentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isUserLoggedIn()) {
                alert('Kindly log in before commenting.');
                return;
            }
            commentSection.classList.toggle('hidden');
        });

        postCommentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isUserLoggedIn()) {
                alert('Kindly log in before commenting.');
                return;
            }
            const commentText = bookmarkElement.querySelector('textarea').value.trim();
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

            bookmarkElement.querySelector('textarea').value = '';
            // Sync with main feed
            syncFeedPost(post.id, 'comment', comments);
        });

        // Share functionality
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

        // Remove bookmark functionality
        removeBookmarkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let bookmarks = loadBookmarksFromLocalStorage();
            bookmarks = bookmarks.filter(b => b.id !== post.id);
            saveBookmarksToLocalStorage(bookmarks);
            bookmarkElement.remove();

            if (bookmarks.length === 0) {
                bookmarksContainer.innerHTML = '<p class="text-gray-500 text-center">No bookmarks yet.</p>';
            }
            // Sync with main feed
            syncFeedPost(post.id, 'bookmark', false);
        });
    }

    // Sync changes with the main feed
    function syncFeedPost(postId, action, value) {
        const feedPost = document.querySelector(`.post[data-id="${postId}"]`);
        if (!feedPost) return;

        if (action === 'like') {
            const likeBtn = feedPost.querySelector('.like-btn i');
            if (value) likeBtn.classList.replace('far', 'fas');
            else likeBtn.classList.replace('fas', 'far');
        } else if (action === 'comment') {
            const commentCount = feedPost.querySelector('.comment-count');
            const commentsContainer = feedPost.querySelector('.comments-container');
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
        } else if (action === 'bookmark') {
            const bookmarkBtn = feedPost.querySelector('.bookmark-btn i');
            if (value) bookmarkBtn.classList.replace('far', 'fas');
            else bookmarkBtn.classList.replace('fas', 'far');
        }
    }

    modalClose.addEventListener('click', () => modal.classList.add('hidden'));

    // Initial load
    loadBookmarks();
});