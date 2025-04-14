// Global variables
let users = [
    { id: 1, name: "Emma Wilson", avatar: "EW", lastMessage: "", time: "", status: "online", unreadCount: 2 },
    { id: 2, name: "Liam Anderson", avatar: "LA", lastMessage: "", time: "", status: "online", unreadCount: 0 },
    { id: 3, name: "Sophia Martinez", avatar: "SM", lastMessage: "", time: "", status: "offline", unreadCount: 5 },
    { id: 4, name: "Noah Thompson", avatar: "NT", lastMessage: "", time: "", status: "online", unreadCount: 0 },
    { id: 5, name: "Olivia Brown", avatar: "OB", lastMessage: "", time: "", status: "offline", unreadCount: 1 },
    { id: 6, name: "William Davis", avatar: "WD", lastMessage: "", time: "", status: "online", unreadCount: 0 },
    { id: 7, name: "Ava Garcia", avatar: "AG", lastMessage: "", time: "", status: "offline", unreadCount: 0 },
    { id: 8, name: "James Miller", avatar: "JM", lastMessage: "", time: "", status: "online", unreadCount: 3 }
];

let activeChat = null;
let chatMessages = JSON.parse(localStorage.getItem('chatMessages')) || {};
let isTyping = false;
let currentFilter = 'all';

// Message response categories
const messageResponses = {
    greetings: {
        messages: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "hi there"],
        responses: [
            "Hey! How are you doing today?",
            "Hello! Great to hear from you!",
            "Hi there! How can I help you today?",
            "Hey! Hope you're having a good day!",
            "Hello! How's everything going?",
            "Hi! It's great to see your message!"
        ]
    },
    goodbyes: {
        messages: ["bye", "goodbye", "see you", "talk to you later", "catch you later", "have a good day", "good night"],
        responses: [
            "Goodbye! Have a great rest of your day!",
            "Take care! Looking forward to our next chat!",
            "See you soon! Have a wonderful time!",
            "Bye for now! Thanks for the chat!",
            "Have a great one! Talk to you later!",
            "Take care! Let's catch up again soon!"
        ]
    },
    thanks: {
        messages: ["thank you", "thanks", "appreciate it", "thank you so much", "thanks a lot"],
        responses: [
            "You're welcome! Happy to help!",
            "Anytime! Don't hesitate to ask if you need anything else!",
            "My pleasure! Let me know if you need anything more!",
            "Glad I could help! Have a great day!",
            "You're welcome! Feel free to reach out anytime!"
        ]
    },
    general: {
        messages: ["how are you", "how's it going", "what's up", "how have you been"],
        responses: [
            "I'm doing great, thanks for asking! How about you?",
            "All good here! How's your day going?",
            "Pretty good! What's new with you?",
            "Doing well, thanks! How are things on your end?",
            "Everything's good! How have you been?"
        ]
    }
};

// Initialize emoji picker
const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍',
    '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓'];

const emojiPicker = document.getElementById('emoji-picker');
emojiPicker.innerHTML = emojis.map(emoji =>
    `<button class="p-1 text-xl hover:bg-gray-100 rounded" onclick="insertEmoji('${emoji}')">${emoji}</button>`
).join('');

// Helper function for consistent timestamp formatting
function formatTimestamp(date) {
    return new Date(date).toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}

// Helper function to get relative time
function getRelativeTime(timestamp) {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

// Update users array with last messages
function updateUsersWithLastMessages() {
    users.forEach(user => {
        if (chatMessages[user.id] && chatMessages[user.id].length > 0) {
            const lastMessage = chatMessages[user.id][chatMessages[user.id].length - 1];
            user.lastMessage = lastMessage.text;
            user.time = lastMessage.timestamp; // Ensure this is the correct timestamp
        }
    });
}


// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    updateUsersWithLastMessages();

    // Search functionality
    document.getElementById('search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const chatElements = document.querySelectorAll('#chat-list > div');

        chatElements.forEach(element => {
            const userId = element.getAttribute('data-user-id');
            const user = users.find(u => u.id === parseInt(userId));
            const matches = user.name.toLowerCase().includes(searchTerm) ||
                (user.lastMessage && user.lastMessage.toLowerCase().includes(searchTerm));
            element.style.display = matches ? 'block' : 'none';
        });
    });

    // Filter buttons
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            updateFilterButtons();
            renderChatList();
        });
    });

    // Message input
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Emoji picker toggle
    // Emoji picker toggle
    document.getElementById('emoji-button').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent the click event from propagating to the document
        emojiPicker.classList.toggle('active');
    });

    // Close emoji picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#emoji-picker') && !e.target.closest('#emoji-button')) {
            emojiPicker.classList.remove('active');
        }
    });


    // File attachment
    document.getElementById('attachment-button').addEventListener('click', handleAttachment);

    // Initial render
    renderChatList();
});

function renderChatList() {
    const chatList = document.getElementById('chat-list');

    // Update status of users based on the existing condition
    users.forEach(user => {
        user.status = user.status === 'online' ? 'online' : 'offline';
    });

    const filteredUsers = users.filter(user => {
        switch (currentFilter) {
            case 'unread':
                return user.unreadCount > 0;
            case 'online':
                return user.status === 'online';
            default:
                return true;
        }
    });

    chatList.innerHTML = filteredUsers.map(user => {
        const unreadMessageText = user.unreadCount > 0 ? `${user.unreadCount} new messages` : 'No new messages';
        const unreadBadge = user.unreadCount > 0 ? `<div class="unread-badge">${user.unreadCount}</div>` : '';

        return `
            <div onclick="openChat(${user.id})" 
                 data-user-id="${user.id}"
                 class="p-4 border-b hover:bg-gray-50 cursor-pointer ${activeChat === user.id ? 'bg-blue-50 text-gray-800' : ''} relative">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                  ${user.avatar}
                </div>
                ${user.status === 'online'
                ? '<div class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>'
                : ''}
                ${unreadBadge}
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-start">
                  <h3 class="font-semibold text-gray-800">${user.name}</h3>
                  <span class="text-xs text-gray-500">${user.time ? getRelativeTime(user.time) : ''}</span>
                </div>
                <div class="flex items-start text-sm text-gray-500 truncate">
                    <p class="truncate">${user.lastMessage || unreadMessageText}</p>
                </div>
              </div>
            </div>
          </div>
        `;
    }).join('');
}


// Open chat
// Open chat
function openChat(userId) {
    activeChat = userId;
    const user = users.find(u => u.id === userId);

    // Show the chat interface and hide empty state
    showChat(userId);

    // Update chat header
    document.getElementById('active-chat-name').textContent = user.name;
    document.getElementById('active-chat-status').textContent = user.status === 'online' ? 'Active now' : 'Offline';
    document.getElementById('active-status-indicator').className =
        `absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`;

    // Update user's unread count
    user.unreadCount = 0;

    // Render messages and update chat list
    renderMessages(userId);
    renderChatList();

    // Focus message input
    document.getElementById('message-input').focus();
}

// Show chat interface
function showChat(chatId) {
    // Hide empty state
    document.getElementById('empty-state').classList.add('hidden');

    // Show chat interface elements
    document.getElementById('chat-header').classList.remove('hidden');
    document.getElementById('chat-messages').classList.remove('hidden');
    document.getElementById('message-input-container').classList.remove('hidden');
}

// Hide chat interface
function hideChat() {
    // Show empty state
    document.getElementById('empty-state').classList.remove('hidden');

    // Hide chat interface elements
    document.getElementById('chat-header').classList.add('hidden');
    document.getElementById('chat-messages').classList.add('hidden');
    document.getElementById('message-input-container').classList.add('hidden');

    // Reset active chat
    activeChat = null;
}
// Render messages
function renderMessages(userId) {
    const messagesContainer = document.getElementById('chat-messages');
    const messages = chatMessages[userId] || [];

    messagesContainer.innerHTML = messages.map((msg, index) => `
      <div class="flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'} mb-4">
        <div class="message-bubble ${msg.sender === 'me'
            ? 'bg-blue-500 text-white'
            : 'bg-white text-gray-800'} rounded-lg px-4 py-2 shadow">
          ${index === 0 || messages[index - 1].sender !== msg.sender
            ? `<p class="text-xs mb-1 ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'}">${msg.sender === 'me' ? 'You' : users.find(u => u.id === userId).name
            }</p>`
            : ''}
          <p>${msg.text}</p>
          <span class="text-xs ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-500'}">
            ${getRelativeTime(msg.timestamp)}
          </span>
        </div>
      </div>
    `).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    if (!activeChat) return;

    const input = document.getElementById('message-input');
    const messageText = input.value.trim();

    if (messageText) {
        const timestamp = new Date().toISOString();
        const newMessage = {
            sender: 'me',
            text: messageText,
            timestamp: timestamp
        };

        if (!chatMessages[activeChat]) {
            chatMessages[activeChat] = [];
        }
        chatMessages[activeChat].push(newMessage);

        // Update last message in users array (just update lastMessage)
        const userIndex = users.findIndex(u => u.id === activeChat);
        users[userIndex].lastMessage = messageText;

        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
        input.value = '';
        renderMessages(activeChat);
        renderChatList();
        simulateResponse(messageText); // Pass message text for checking emojis
    }
}


function simulateResponse(messageText) {
    // Check if the message contains only an emoji
    if (/^[\p{Emoji}\u200B]+$/u.test(messageText)) {
        // Show typing indicator before the response
        isTyping = true;
        renderChatList();

        setTimeout(() => {
            isTyping = false;
            const responseText = "Sorry, I don't understand.";
            const timestamp = new Date().toISOString();
            const newMessage = {
                sender: 'bot',
                text: responseText,
                timestamp: timestamp
            };

            if (!chatMessages[activeChat]) {
                chatMessages[activeChat] = [];
            }
            chatMessages[activeChat].push(newMessage);

            // Update last message in users array
            const userIndex = users.findIndex(u => u.id === activeChat);
            users[userIndex].lastMessage = responseText;
            users[userIndex].time = timestamp;

            localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
            renderMessages(activeChat);
            renderChatList();
        }, 1500); // Adjust delay time (2000ms = 2 seconds) to match your desired typing duration

        return;
    }

    // Continue with normal message responses
    if (!activeChat || users.find(u => u.id === activeChat).status === 'offline') return; // Only respond if the user is online

    isTyping = true;
    renderChatList();

    setTimeout(() => {
        isTyping = false;
        const lastMessage = chatMessages[activeChat][chatMessages[activeChat].length - 1];
        const lowercaseMessage = lastMessage.text.toLowerCase();

        // Find the appropriate response category
        let responseText = "";
        for (const [category, data] of Object.entries(messageResponses)) {
            if (data.messages.some(msg => lowercaseMessage.includes(msg))) {
                responseText = data.responses[Math.floor(Math.random() * data.responses.length)];
                break;
            }
        }

        // If no specific response category matched, use contextual responses
        if (!responseText) {
            const contextualResponses = [
                "That's interesting! Tell me more about that.",
                "I see what you mean. What are your thoughts on this?",
                "That makes sense. How do you feel about it?",
                "Thanks for sharing that with me!",
                "I understand. Let's discuss this further.",
                "That's a good point! I hadn't thought about it that way..."
            ];
            responseText = contextualResponses[Math.floor(Math.random() * contextualResponses.length)];
        }

        // Simulate the bot typing response
        const timestamp = new Date().toISOString();
        const newMessage = {
            sender: 'bot',
            text: responseText,
            timestamp: timestamp
        };

        if (!chatMessages[activeChat]) {
            chatMessages[activeChat] = [];
        }
        chatMessages[activeChat].push(newMessage);

        // Update last message in users array
        const userIndex = users.findIndex(u => u.id === activeChat);
        users[userIndex].lastMessage = responseText;
        users[userIndex].time = timestamp;

        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
        renderMessages(activeChat);
        renderChatList();
    }, 2500); // Adjust delay time (2000ms = 2 seconds) for normal responses
}



// Handle file attachment
function handleAttachment() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const messageInput = document.getElementById('message-input');
            messageInput.value = `Attached: ${file.name}`;
            messageInput.focus();
        }
    };
    input.click();
}
// Insert emoji into message input
function insertEmoji(emoji) {
    const input = document.getElementById('message-input');
    input.value += emoji;
    input.focus();
}

// Handle file attachment
function handleAttachment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf,video/*';

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const messageText = `<a href="${event.target.result}" target="_blank">Attachment: ${file.name}</a>`;
                sendMessageWithAttachment(messageText);
            };
            reader.readAsDataURL(file);
        }
    });
    fileInput.click();
}

// Send message with file attachment
function sendMessageWithAttachment(messageText) {
    if (!activeChat) return;

    const timestamp = new Date().toISOString();
    const newMessage = {
        sender: 'me',
        text: messageText,
        timestamp: timestamp
    };

    if (!chatMessages[activeChat]) {
        chatMessages[activeChat] = [];
    }
    chatMessages[activeChat].push(newMessage);

    const userIndex = users.findIndex(u => u.id === activeChat);
    users[userIndex].lastMessage = messageText;
    users[userIndex].time = timestamp;

    localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    renderMessages(activeChat);
    renderChatList();
    simulateResponse();
}

// Update filter buttons based on current filter
function updateFilterButtons() {
    document.querySelectorAll('[data-filter]').forEach(button => {
        button.classList.remove('text-blue-500');
        if (button.dataset.filter === currentFilter) {
            button.classList.add('text-blue-500');
        }
    });
}
// Add event listeners for dynamic interaction
document.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => {
        // Remove active class from all buttons
        document.querySelectorAll("button").forEach(btn => btn.classList.remove("active"));
        // Add active class to the clicked button
        button.classList.add("active");
    });
});