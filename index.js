const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { hash } = require('crypto');
const userModel = require('./userModel');

const app = express();
const PORT = process.env.PORT || 7000;

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/socialweb')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Enable CORS for all routes
app.use(cors());

// File paths
const FILES = {
    users: path.join(__dirname, 'users.json'),
    messages: path.join(__dirname, 'messages.json'), // Handles chats/messages
    posts: path.join(__dirname, 'posts.json'),       // Handles posts
    friendRequests: path.join(__dirname, 'friendRequests.json')
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure file exists and read data
async function readFileData(filePath) {
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, JSON.stringify([]));
    }
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data || '[]');
}

// Write data to file
async function writeFileData(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ====================== ROUTES ======================

// Static Routes
app.get(['/', '/messages', '/explore', '/register', '/login'], (req, res) => {
    const page = req.path === '/' ? 'homePage' : req.path.slice(1);
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
});

// User/Auth Routes
app.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await userModel.create({
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({ 
            message: 'User registered successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (err) {
        console.error('Error registering user:', err);
        res.status(500).json({ message: 'Error registering user' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }

        // Find user from MongoDB
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        // Normal User Login Success
        return res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Error logging in:', err);
        res.status(500).json({ message: 'Error logging in' });
    }
});



// app.get('/ownerlogin', async (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'ownerlogin.html'));
// });
app.get('/owner',(req,res)=>{
    res.sendFile(path.join(__dirname, 'public', 'ownerlogin.html'));
})


app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/profile', async (req, res) => {
    try {
        const data = await readFileData(FILES.users);
        res.render('profile.ejs', { user: data[0] || {} });
    } catch (err) {
        console.error('Error fetching profile:', err);  
        res.status(500).json({ message: 'Error fetching profile', error: err.message });
    }
});

app.post('/api/profile/update', async (req, res) => {
    try {
        const { name, email } = req.body;
        const data = await readFileData(FILES.users);
        if (data[0]) {
            data[0] = { ...data[0], name, email };
            await writeFileData(FILES.users, data);
            res.json({ message: 'Profile updated', user: data[0] });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Error updating profile', error: err.message });
    }
});

app.post('/api/profile/password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        const data = await readFileData(FILES.users);
        if (data[0]) {
            data[0].password = newPassword;
            await writeFileData(FILES.users, data);
            res.json({ message: 'Password updated' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error updating password:', err);
        res.status(500).json({ message: 'Error updating password', error: err.message });
    }
});

// ====================== POSTS ROUTES ======================

// Create a new post
app.post('/api/posts', async (req, res) => {
    try {
        const { content, userId } = req.body;
        const data = await readFileData(FILES.posts);
        const newPost = {
            id: data.length + 1, // Assign sequential ID
            userId: userId || 'test-user',
            content,
            timestamp: new Date().toISOString(),
            likes: [],
            shares: [],
            comments: [],
            bookmarks: []
        };
        data.push(newPost);
        await writeFileData(FILES.posts, data);
        res.json({ message: 'Post created', post: newPost });
    } catch (err) {
        console.error('Error creating post:', err);
        res.status(500).json({ message: 'Error creating post', error: err.message });
    }
});

// Fetch all posts
app.get('/api/posts', async (req, res) => {
    try {
        const data = await readFileData(FILES.posts);
        res.json(data);
    } catch (err) {
        console.error('Error fetching posts:', err);
        res.status(500).json({ message: 'Error fetching posts', error: err.message });
    }
});

// Update a post
app.put('/api/posts', async (req, res) => {
    try {
        const { id, content } = req.body;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === id);
        if (postIndex !== -1) {
            data[postIndex].content = content;
            await writeFileData(FILES.posts, data);
            res.json({ message: 'Post updated', post: data[postIndex] });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        console.error('Error updating post:', err);
        res.status(500).json({ message: 'Error updating post', error: err.message });
    }
});

// Delete a post
app.delete('/api/posts', async (req, res) => {
    try {
        const { id } = req.query;
        let data = await readFileData(FILES.posts);
        data = data.filter(p => p.id !== Number(id));
        await writeFileData(FILES.posts, data);
        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ message: 'Error deleting post', error: err.message });
    }
});

// Like a post
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1 && !data[postIndex].likes.includes('test-user')) {
            data[postIndex].likes.push('test-user');
            await writeFileData(FILES.posts, data);
        }
        res.json({ message: 'Post liked', likes: data[postIndex]?.likes });
    } catch (err) {
        console.error('Error liking post:', err);
        res.status(500).json({ message: 'Error liking post', error: err.message });
    }
});

// Unlike a post
app.post('/api/posts/:id/unlike', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1) {
            data[postIndex].likes = data[postIndex].likes.filter(user => user !== 'test-user');
            await writeFileData(FILES.posts, data);
        }
        res.json({ message: 'Post unliked', likes: data[postIndex]?.likes });
    } catch (err) {
        console.error('Error unliking post:', err);
        res.status(500).json({ message: 'Error unliking post', error: err.message });
    }
});

// Comment on a post
app.post('/api/posts/:id/comment', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1) {
            const comment = { id: data[postIndex].comments.length + 1, userId: 'test-user', content, timestamp: new Date().toISOString() };
            data[postIndex].comments.push(comment);
            await writeFileData(FILES.posts, data);
            res.json({ message: 'Comment added', comment });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        console.error('Error commenting on post:', err);
        res.status(500).json({ message: 'Error commenting on post', error: err.message });
    }
});

// Update a comment on a post
app.put('/api/posts/:id/comment/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const { content } = req.body;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1) {
            const commentIndex = data[postIndex].comments.findIndex(c => c.id === Number(commentId));
            if (commentIndex !== -1) {
                data[postIndex].comments[commentIndex].content = content;
                await writeFileData(FILES.posts, data);
                res.json({ message: 'Comment updated', comment: data[postIndex].comments[commentIndex] });
            } else {
                res.status(404).json({ message: 'Comment not found' });
            }
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        console.error('Error updating comment:', err);
        res.status(500).json({ message: 'Error updating comment', error: err.message });
    }
});

// Delete a comment on a post
app.delete('/api/posts/:id/comment/:commentId', async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1) {
            data[postIndex].comments = data[postIndex].comments.filter(c => c.id !== Number(commentId));
            await writeFileData(FILES.posts, data);
            res.json({ message: 'Comment deleted' });
        } else {
            res.status(404).json({ message: 'Post not found' });
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ message: 'Error deleting comment', error: err.message });
    }
});

// Bookmark a post
app.post('/api/posts/:id/bookmark', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1 && !data[postIndex].bookmarks.includes('test-user')) {
            data[postIndex].bookmarks.push('test-user');
            await writeFileData(FILES.posts, data);
        }
        res.json({ message: 'Post bookmarked', bookmarks: data[postIndex]?.bookmarks });
    } catch (err) {
        console.error('Error bookmarking post:', err);
        res.status(500).json({ message: 'Error bookmarking post', error: err.message });
    }
});

// Unbookmark a post
app.post('/api/posts/:id/unbookmark', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readFileData(FILES.posts);
        const postIndex = data.findIndex(p => p.id === Number(id));
        if (postIndex !== -1) {
            data[postIndex].bookmarks = data[postIndex].bookmarks.filter(user => user !== 'test-user');
            await writeFileData(FILES.posts, data);
        }
        res.json({ message: 'Post unbookmarked', bookmarks: data[postIndex]?.bookmarks });
    } catch (err) {
        console.error('Error unbookmarking post:', err);
        res.status(500).json({ message: 'Error unbookmarking post', error: err.message });
    }
});

// ====================== MESSAGES ROUTES ======================

// Create a new message (chat)
app.post('/api/messages', async (req, res) => {
    try {
        const { message, userId } = req.body;
        const data = await readFileData(FILES.messages);
        const newMessage = {
            id: data.length + 1, // Assign sequential ID
            userId: userId || 'test-user',
            message,
            timestamp: new Date().toISOString()
        };
        data.push(newMessage);
        await writeFileData(FILES.messages, data);
        res.json({ message: 'Message sent', chat: newMessage });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Error sending message', error: err.message });
    }
});

// Fetch all messages (chats)
app.get('/api/messages', async (req, res) => {
    try {
        const data = await readFileData(FILES.messages);
        res.json(data);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Error fetching messages', error: err.message });
    }
});

// ====================== FRIEND REQUESTS ROUTES ======================

// Send a friend request
app.post('/api/friend-requests', async (req, res) => {
    try {
        const { userId, friendId } = req.body;
        const data = await readFileData(FILES.friendRequests);
        const request = { id: data.length + 1, userId, friendId, status: 'pending' }; // Assign sequential ID
        data.push(request);
        await writeFileData(FILES.friendRequests, data);
        res.json({ message: 'Friend request sent', request });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ message: 'Error sending friend request', error: err.message });
    }
});

// Fetch all friend requests
app.get('/api/friend-requests', async (req, res) => {
    try {
        const data = await readFileData(FILES.friendRequests);
        res.json(data);
    } catch (err) {
        console.error('Error fetching friend requests:', err);
        res.status(500).json({ message: 'Error fetching friend requests', error: err.message });
    }
});

// Update friend request status
app.put('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const data = await readFileData(FILES.friendRequests);
        const requestIndex = data.findIndex(r => r.id === Number(id));
        if (requestIndex !== -1) {
            data[requestIndex].status = status;
            await writeFileData(FILES.friendRequests, data);
            res.json({ message: 'Friend request updated', request: data[requestIndex] });
        } else {
            res.status(404).json({ message: 'Friend request not found' });
        }
    } catch (err) {
        console.error('Error updating friend request:', err);
        res.status(500).json({ message: 'Error updating friend request', error: err.message });
    }
});

// Delete a friend request
app.delete('/api/friend-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let data = await readFileData(FILES.friendRequests);
        data = data.filter(r => r.id !== Number(id));
        await writeFileData(FILES.friendRequests, data);
        res.json({ message: 'Friend request deleted' });
    } catch (err) {
        console.error('Error deleting friend request:', err);
        res.status(500).json({ message: 'Error deleting friend request', error: err.message });
    }
});

// ====================== EXTERNAL API ROUTES ======================

// Fetch Reddit posts
app.get('/reddit-posts', async (req, res) => {
    const subreddit = req.query.subreddit || 'technology';
    const after = req.query.after || '';
    if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) {
        return res.status(400).json({ error: 'Invalid subreddit name' });
    }
    try {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/new.json?after=${after}`, {
            headers: {
                'User-Agent': 'SocialApp/1.0'
            }
        });
        if (response.status !== 200) {
            throw new Error(`Reddit API returned status: ${response.status}`);
        }
        res.json(response.data);
    } catch (err) {
        console.error('Error fetching Reddit posts:', err);
        res.status(500).json({ message: 'Error fetching Reddit posts', error: err.message });
    }
});

// Fetch user's own posts
app.get('/my-posts', async (req, res) => {
    try {
        const data = await readFileData(FILES.posts);
        res.json(data);
    } catch (err) {
        console.error('Error fetching my posts:', err);
        res.status(500).json({ message: 'Error fetching my posts', error: err.message });
    }
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));