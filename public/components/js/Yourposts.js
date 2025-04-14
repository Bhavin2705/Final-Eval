let currentUser = null;
let posts = [];
let selectedFiles = [];

// File handling setup
const fileDropZone = document.getElementById('fileDropZone');
const fileInput = document.getElementById('fileInput');
const previewGrid = document.getElementById('previewGrid');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    fileDropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    fileDropZone.addEventListener(eventName, () => {
        fileDropZone.classList.add('drag-over');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    fileDropZone.addEventListener(eventName, () => {
        fileDropZone.classList.remove('drag-over');
    });
});

fileDropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    const newFiles = Array.from(files).filter(file => {
        return file.type.startsWith('image/') || file.type.startsWith('video/');
    });

    selectedFiles = [...selectedFiles, ...newFiles];
    updatePreview();
}

function updatePreview() {
    previewGrid.innerHTML = selectedFiles.map((file, index) => {
        const isVideo = file.type.startsWith('video/');
        const url = URL.createObjectURL(file);
        return `
                    <div class="preview-item">
                        ${isVideo ? `
                            <video src="${url}" class="preview-media"></video>
                        ` : `
                            <img src="${url}" class="preview-media" alt="Preview">
                        `}
                        <button onclick="removeFile(${index})" class="remove-preview">
                            <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                `;
    }).join('');
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    updatePreview();
}

// Add to your existing JavaScript
function initEmojiPicker() {
    const emojis = ['👍', '❤️', '😂', '😲', '😢', '😡'];

    document.querySelectorAll('.post').forEach(post => {
        const postId = post.getAttribute('data-post-id');
        const reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'emoji-picker hidden absolute bottom-full left-0 bg-white p-2 rounded-lg shadow-lg z-50';

        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-btn p-1 hover:bg-gray-100 rounded';
            button.textContent = emoji;
            button.onclick = () => addReaction(postId, emoji);
            reactionsContainer.appendChild(button);
        });

        const reactionButton = post.querySelector('.reaction-button');
        if (reactionButton) {
            reactionButton.appendChild(reactionsContainer);
            reactionButton.addEventListener('click', () => {
                reactionsContainer.classList.toggle('hidden');
            });
        }
    });
}

async function fetchUserData() {
    if (localStorage.getItem('currentUser')) {
        currentUser = JSON.parse(localStorage.getItem('currentUser'));
        updateUserDisplay();
    } else {
        const response = await fetch('https://randomuser.me/api/?nat=in');
        const data = await response.json();
        currentUser = {
            name: `${data.results[0].name.first} ${data.results[0].name.last}`,
            image: data.results[0].picture.large
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserDisplay();
    }
}

function updateUserDisplay() {
    document.getElementById('currentUserImg').src = currentUser.image;
    document.getElementById('currentUserName').textContent = currentUser.name;
}

async function createPost() {
    const content = document.getElementById('postInput').value.trim();
    if (!content && selectedFiles.length === 0) return;

    const mediaFiles = await Promise.all(selectedFiles.map(async file => {
        return {
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image'
        };
    }));

    const post = {
        id: Date.now(),
        content,
        author: currentUser,
        likes: 0,
        comments: [],
        timestamp: new Date().toISOString(),
        isLiked: false,
        bookmarked: false,
        media: mediaFiles
    };

    posts.unshift(post);
    document.getElementById('postInput').value = '';
    selectedFiles = [];
    updatePreview();
    renderPosts();

    setTimeout(() => {
        const firstPost = document.querySelector('.post');
        if (firstPost) {
            firstPost.style.opacity = '1';
            firstPost.style.transform = 'translateY(0)';
        }
    }, 50);
}

function toggleLike(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.isLiked = !post.isLiked;
        post.likes += post.isLiked ? 1 : -1;

        const likeButton = document.querySelector(`#like-${postId}`);
        likeButton.classList.add('like-animation');
        setTimeout(() => likeButton.classList.remove('like-animation'), 300);

        renderPosts();
    }
}

function toggleBookmark(postId) {
    const post = posts.find(p => p.id === postId);
    if (post) {
        post.bookmarked = !post.bookmarked;
        renderPosts();
    }
}

function addComment(postId) {
    const commentInput = document.getElementById(`commentInput-${postId}`);
    const content = commentInput.value.trim();
    if (!content) return;

    const post = posts.find(p => p.id === postId);
    if (post) {
        post.comments.push({
            id: Date.now(),
            content,
            author: currentUser,
            likes: 0,
            replies: [],
            timestamp: new Date().toISOString()
        });
        commentInput.value = '';
        renderPosts();
    }
}

function addReply(postId, commentId) {
    const replyInput = document.getElementById(`replyInput-${postId}-${commentId}`);
    const content = replyInput.value.trim();
    if (!content) return;

    const post = posts.find(p => p.id === postId);
    const comment = post.comments.find(c => c.id === commentId);
    if (comment) {
        comment.replies.push({
            id: Date.now(),
            content,
            author: currentUser,
            timestamp: new Date().toISOString()
        });
        replyInput.value = '';
        renderPosts();
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}
function showTypingIndicator(postId) {
    const post = document.querySelector(`#post-${postId}`);
    if (!post) return;

    const template = document.getElementById('typingIndicator');
    const indicator = template.content.cloneNode(true);

    const commentsSection = post.querySelector('.comments-section');
    if (commentsSection) {
        commentsSection.prepend(indicator);
        setTimeout(() => {
            const activeIndicator = commentsSection.querySelector('.typing-indicator');
            if (activeIndicator) activeIndicator.remove();
        }, 3000);
    }
}

function addReaction(postId, emoji) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.reactions) post.reactions = {};
    post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    renderPosts();
}

// Enhance the share functionality
async function sharePost(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const shareData = {
        title: 'Check out this post!',
        text: post.content,
        url: window.location.href + `#post-${postId}`
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback for browsers that don't support native sharing
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
            window.open(shareUrl, '_blank');
        }
    } catch (err) {
        console.error('Error sharing:', err);
    }
}

// Add post statistics tracking
function updatePostStats(postId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.stats) {
        post.stats = {
            views: 0,
            shares: 0,
            saves: 0
        };
    }

    post.stats.views++;
    renderPosts();
}


function renderPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = posts.map(post => `
        <div class="glass-effect rounded-xl shadow-lg p-6 mb-6 post-transition post-hover post" style="opacity: 0; transform: translateY(20px); transition: all 0.3s ease-out;">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center">
                    <div class="relative">
                        <img class="w-12 h-12 rounded-full mr-4 border-2 border-blue-500 object-cover" src="${post.author.image}" alt="${post.author.name}">
                        <div class="absolute bottom-0 right-4 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-800">${post.author.name}</h3>
                        <p class="text-gray-500 text-sm">${formatTimestamp(post.timestamp)}</p>
                    </div>
                </div>
                <button class="text-gray-500 hover:text-gray-700">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                    </svg>
                </button>
                
            </div>
            ${post.content ? `<p class="text-gray-800 mb-4 text-lg">${post.content}</p>` : ''}
            ${post.media && post.media.length > 0 ? `
                <div class="media-grid mb-4">
                    ${post.media.map(media =>
        media.type === 'video' ?
            `<video src="${media.url}" class="media-item" controls></video>` :
            `<img src="${media.url}" class="media-item" alt="Post media">`
    ).join('')}
                </div>
            ` : ''}
            <div class="flex items-center justify-between mb-4 border-t border-b py-2">
                <button onclick="toggleLike(${post.id})" id="like-${post.id}" class="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition duration-200">
                    <svg class="w-6 h-6 ${post.isLiked ? 'text-red-500 fill-current' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span>${post.likes}</span>
                </button>
                <button class="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition duration-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                    </svg>
                    <span>${post.comments.length}</span>
                </button>
                <button onclick="sharePost(${post.id})" class="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition duration-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                    </svg>
                </button>

                <button onclick="toggleBookmark(${post.id})" class="flex items-center space-x-2 text-gray-500 hover:text-yellow-500 transition duration-200">
                    <svg class="w-6 h-6 ${post.bookmarked ? 'text-yellow-500 fill-current' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                </button>
                
            </div>
            <div class="border-t pt-4">
                <div class="flex mb-4">
                    <input id="commentInput-${post.id}" 
                        class="flex-1 p-2 border rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/50" 
                        placeholder="Write a comment..."
                        onkeypress="if(event.key === 'Enter') addComment(${post.id})">
                    <button onclick="addComment(${post.id})" 
                        class="bg-blue-600 text-white px-4 rounded-r-xl hover:bg-blue-700 transition duration-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-4">
                    ${post.comments.map(comment => `
                        <div class="pl-4 border-l-2 border-blue-200">
                            <div class="flex items-center mb-2">
                                <img class="w-8 h-8 rounded-full mr-2 border border-blue-500" src="${comment.author.image}" alt="${comment.author.name}">
                                <div>
                                    <h4 class="font-semibold text-gray-800">${comment.author.name}</h4>
                                    <p class="text-gray-500 text-xs">${formatTimestamp(comment.timestamp)}</p>
                                </div>
                            </div>
                            <p class="text-gray-800 ml-10 mb-2">${comment.content}</p>
                            <div class="ml-10 mb-2">
                                <div class="flex mb-2">
                                    <input id="replyInput-${post.id}-${comment.id}" 
                                        class="flex-1 p-2 border rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white/50" 
                                        placeholder="Write a reply..."
                                        onkeypress="if(event.key === 'Enter') addReply(${post.id}, ${comment.id})">
                                    <button onclick="addReply(${post.id}, ${comment.id})" 
                                        class="bg-blue-600 text-white px-4 rounded-r-xl hover:bg-blue-700 transition duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                                        </svg>
                                    </button>
                                </div>
                                ${comment.replies.map(reply => `
                                    <div class="pl-4 border-l-2 border-gray-200 mt-2">
                                        <div class="flex items-center mb-1">
                                            <img class="w-6 h-6 rounded-full mr-2 border border-blue-500" src="${reply.author.image}" alt="${reply.author.name}">
                                            <div>
                                                <h5 class="font-semibold text-gray-800">${reply.author.name}</h5>
                                                <p class="text-gray-500 text-xs">${formatTimestamp(reply.timestamp)}</p>
                                            </div>
                                        </div>
                                        <p class="text-gray-800 ml-8">${reply.content}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.post').forEach((post, index) => {
        setTimeout(() => {
            post.style.opacity = '1';
            post.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'n') {
            document.getElementById('postInput').focus();
        }
    });
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-slide-up');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.post').forEach(post => {
        observer.observe(post);
    });
});

// Initialize the application
fetchUserData();

function sharePost(postId) {
    const post = posts.find(post => post.id === postId);
    const postUrl = window.location.href + `#post-${postId}`;
    const shareText = `Check out this post by ${post.author.name}: ${post.content || 'No content available'}`;

    if (navigator.share) {
        navigator.share({
            title: 'Post Sharing',
            text: shareText,
            url: postUrl
        }).catch(error => console.error('Error sharing:', error));
    } else {
        alert('Sharing is not supported on this browser.');
    }
}

fetchUserData();

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        createPost();
    }
});