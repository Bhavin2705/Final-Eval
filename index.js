const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const userModel = require('./userModel');
const postModel = require('./postModel');
const messageModel = require('./messageModel');
const friendRequestModel = require('./friendRequestModel');
const reportModel = require('./reportModel');
const warningModel = require('./warningModel');
const storyModel = require('./storyModel');
const mimeTypes = require('./config/mime');

const app = express();
const PORT = process.env.PORT || 7000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/socialweb';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Enable CORS with specific origins
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGO_URI }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict'
    }
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalName));
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and MP4 are allowed.'));
        }
    }
});

// Static file serving
app.use('/components', express.static(path.join(__dirname, 'public', 'components'), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath);
        if (mimeTypes[ext]) {
            res.setHeader('Content-Type', mimeTypes[ext]);
        }
    }
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const checkAuth = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await userModel.findById(req.session.userId);
            if (user) {
                req.user = user;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
    res.status(401).json({ message: 'Unauthorized' });
};

const checkOwnerAuth = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await userModel.findById(req.session.userId);
            if (user && user.role === 'owner') {
                req.user = user;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
    res.status(403).json({ message: 'Forbidden: Owner access required' });
};

const checkModAuth = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await userModel.findById(req.session.userId);
            if (user && user.role === 'moderator') {
                req.user = user;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
    res.status(403).json({ message: 'Forbidden: Moderator access required' });
};

// Validate ObjectId
const validateObjectId = (id, res) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return false;
    }
    return true;
};

// Public Static Routes
app.get(['/', '/register', '/login', '/owner', '/moderator'], async (req, res, next) => {
    try {
        const page = req.path === '/' ? 'homePage' : req.path.slice(1);
        if (req.path === '/') {
            let user = null;
            if (req.session.userId) {
                user = await userModel.findById(req.session.userId).select('name email role');
            }
            res.render('homePage', { user: user || { name: 'Guest', email: 'guest', role: 'guest' } });
        } else {
            res.render(`${page}.ejs`);
        }
    } catch (err) {
        next(err);
    }
});

// Protected Static Routes
app.get('/messages', checkAuth, (req, res) => {
    res.render('messages.ejs');
});

app.get('/explore', checkAuth, (req, res) => {
    res.render('explore.ejs');
});

app.get('/my-posts', checkAuth, async (req, res, next) => {
    try {
        const posts = await postModel.find({ userId: req.session.userId });
        res.render('my-posts.ejs', { posts });
    } catch (err) {
        next(err);
    }
});

app.get('/bookmarks', checkAuth, (req, res) => {
    res.render('bookmarks.ejs');
});

app.get('/admin', checkOwnerAuth, (req, res) => {
    res.render('admin.ejs');
});

app.get('/moderator-dashboard', checkModAuth, (req, res) => {
    res.render('moderator-dashboard.ejs');
});

// Current User Route
app.get('/api/me', async (req, res, next) => {
    try {
        if (req.session.userId) {
            const user = await userModel.findById(req.session.userId).select('name email role');
            if (user) {
                return res.json({ user });
            }
        }
        res.json({ user: { name: 'Guest', email: 'guest', role: 'guest' } });
    } catch (err) {
        next(err);
    }
});

// Login Route (Regular Users)
app.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        if (user.role !== 'user') {
            return res.status(403).json({ message: 'Please use the designated login page for your role' });
        }
        req.session.userId = user._id;
        await userModel.updateOne({ _id: user._id }, { lastLogin: new Date().toISOString() });
        res.json({
            message: 'User login successful',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        next(err);
    }
});

// Owner Login Route
app.post('/api/owner/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }
        const owner = await userModel.findOne({ email, role: 'owner' });
        if (!owner) {
            return res.status(401).json({ message: 'Invalid owner credentials' });
        }
        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid owner credentials' });
        }
        req.session.userId = owner._id;
        await userModel.updateOne({ _id: owner._id }, { lastLogin: new Date().toISOString() });
        res.json({
            message: 'Owner login successful',
            user: { id: owner._id, name: owner.name, email: owner.email, role: owner.role }
        });
    } catch (err) {
        next(err);
    }
});

// Moderator Login Route
app.post('/api/moderator/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }
        const moderator = await userModel.findOne({ email, role: 'moderator' });
        if (!moderator) {
            return res.status(401).json({ message: 'Invalid moderator credentials' });
        }
        const isMatch = await bcrypt.compare(password, moderator.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid moderator credentials' });
        }
        req.session.userId = moderator._id;
        await userModel.updateOne({ _id: moderator._id }, { lastLogin: new Date().toISOString() });
        res.json({
            message: 'Moderator login successful',
            user: { id: moderator._id, name: moderator.name, email: moderator.email, role: moderator.role }
        });
    } catch (err) {
        next(err);
    }
});

// Logout Route
app.post('/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.json({ message: 'Logged out' });
    });
});

// User/Auth Routes
app.post('/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await userModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
            status: 'active',
            lastLogin: new Date().toISOString()
        });
        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        next(err);
    }
});

// Owner Routes
app.get('/api/owner/me', checkOwnerAuth, async (req, res, next) => {
    try {
        const user = await userModel.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        next(err);
    }
});

// User Management Routes
app.post('/api/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const { name, email, role, password } = req.body;
        if (!name || !email || !role || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (!['owner', 'admin', 'moderator', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await userModel.create({
            name,
            email,
            password: hashedPassword,
            role,
            status: 'active',
            lastLogin: new Date().toISOString()
        });
        res.status(201).json({
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                status: newUser.status,
                lastLogin: newUser.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.get('/api/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const users = await userModel.find().select('_id name email role status lastLogin');
        res.json({
            users: users.map(user => ({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin
            }))
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id, name, email, role, status } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const updateData = {};
        if (name) updateData.name = name;
        if (email) {
            const existingUser = await userModel.findOne({ email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = email;
        }
        if (role && ['owner', 'admin', 'moderator', 'user'].includes(role)) {
            updateData.role = role;
        }
        if (status && ['active', 'inactive', 'banned'].includes(status)) {
            updateData.status = status;
        }
        const updatedUser = await userModel.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                status: updatedUser.status,
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/users/demote', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id, fromRole } = req.body;
        if (!id || !fromRole || !['admin', 'moderator'].includes(fromRole)) {
            return res.status(400).json({ message: 'Invalid id or fromRole' });
        }
        if (!validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== fromRole) {
            return res.status(400).json({ message: `User is not a ${fromRole}` });
        }
        user.role = 'user';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/users/ban', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status === 'banned') {
            return res.status(400).json({ message: 'User is already banned' });
        }
        user.status = 'banned';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/users/unban', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.status !== 'banned') {
            return res.status(400).json({ message: 'User is not banned' });
        }
        user.status = 'active';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.delete('/api/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        await userModel.deleteOne({ _id: id });
        res.json({ message: 'User deleted' });
    } catch (err) {
        next(err);
    }
});

// Moderator Routes
app.get('/api/moderator/reports', checkModAuth, async (req, res, next) => {
    try {
        const reports = await reportModel.find();
        res.json(reports);
    } catch (err) {
        next(err);
    }
});

app.post('/api/moderator/warnings', checkModAuth, async (req, res, next) => {
    try {
        const { userId, reason, message } = req.body;
        if (!userId || !reason || !message || !validateObjectId(userId, res)) {
            return;
        }
        const newWarning = await warningModel.create({
            userId,
            reason,
            message
        });
        res.json({ message: 'Warning issued', warning: newWarning });
    } catch (err) {
        next(err);
    }
});

// Profile Routes
app.get('/profile', checkAuth, async (req, res, next) => {
    try {
        const user = await userModel.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.render('profile.ejs', {
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/profile/update', checkAuth, async (req, res, next) => {
    try {
        const { name, email } = req.body;
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }
        const existingUser = await userModel.findOne({ email, _id: { $ne: req.session.userId } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }
        const user = await userModel.findByIdAndUpdate(
            req.session.userId,
            { name, email },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({
            message: 'Profile updated',
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/profile/password', checkAuth, async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) {
            return res.status(400).json({ message: 'New password required' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        const user = await userModel.findByIdAndUpdate(
            req.session.userId,
            { password: hashedPassword },
            { new: true }
        );
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'Password updated' });
    } catch (err) {
        next(err);
    }
});

// Posts Routes
app.post('/api/posts', checkAuth, upload.single('fileUpload'), async (req, res, next) => {
    try {
        const { content, linkInput } = req.body;
        if (!content && !req.file && !linkInput) {
            return res.status(400).json({ message: 'Content, file, or link is required' });
        }
        const newPost = await postModel.create({
            userId: req.session.userId,
            content: content || '',
            file: req.file ? `/uploads/${req.file.filename}` : null,
            link: linkInput || null,
            createdAt: new Date()
        });
        const populatedPost = await postModel.findById(newPost._id).populate('userId', 'name email');
        res.json({ message: 'Post created', post: populatedPost });
    } catch (err) {
        next(err);
    }
});

app.get('/api/posts', async (req, res, next) => {
    try {
        const posts = await postModel.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        next(err);
    }
});

app.patch('/api/posts', checkAuth, async (req, res, next) => {
    try {
        const { id, content, link } = req.body;
        if (!id || !content || !validateObjectId(id, res)) {
            return;
        }
        const updateData = { content };
        if (link !== undefined) updateData.link = link;
        const post = await postModel.findOneAndUpdate(
            { _id: id, userId: req.session.userId },
            updateData,
            { new: true }
        ).populate('userId', 'name email');
        if (!post) {
            return res.status(404).json({ message: 'Post not found or unauthorized' });
        }
        res.json({ message: 'Post updated', post });
    } catch (err) {
        next(err);
    }
});

app.delete('/api/posts', checkAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const post = await postModel.findOneAndDelete({ _id: id, userId: req.session.userId });
        if (!post) {
            return res.status(404).json({ message: 'Post not found or unauthorized' });
        }
        res.json({ message: 'Post deleted' });
    } catch (err) {
        next(err);
    }
});

// Messages Routes
app.post('/api/messages', checkAuth, async (req, res, next) => {
    try {
        const { message, recipientId } = req.body;
        if (!message || !recipientId || !validateObjectId(recipientId, res)) {
            return;
        }
        const newMessage = await messageModel.create({
            userId: req.session.userId,
            recipientId,
            message,
            read: false
        });
        res.json({ message: 'Message sent', chat: newMessage });
    } catch (err) {
        next(err);
    }
});

app.get('/api/messages', checkAuth, async (req, res, next) => {
    try {
        const messages = await messageModel.find({
            $or: [{ userId: req.session.userId }, { recipientId: req.session.userId }]
        }).populate('userId recipientId', 'name email');
        res.json(messages);
    } catch (err) {
        next(err);
    }
});

app.get('/api/messages/unread-count', checkAuth, async (req, res, next) => {
    try {
        const count = await messageModel.countDocuments({
            recipientId: req.session.userId,
            read: false
        });
        res.json({ count });
    } catch (err) {
        next(err);
    }
});

// Friend Requests Routes
app.post('/api/friend-requests', checkAuth, async (req, res, next) => {
    try {
        const { friendId } = req.body;
        if (!friendId || !validateObjectId(friendId, res)) {
            return;
        }
        const existingRequest = await friendRequestModel.findOne({
            userId: req.session.userId,
            friendId,
            status: 'pending'
        });
        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already sent' });
        }
        const newRequest = await friendRequestModel.create({
            userId: req.session.userId,
            friendId,
            status: 'pending'
        });
        res.json({ message: 'Friend request sent', request: newRequest });
    } catch (err) {
        next(err);
    }
});

app.get('/api/friend-requests', checkAuth, async (req, res, next) => {
    try {
        const requests = await friendRequestModel.find({
            $or: [{ userId: req.session.userId }, { friendId: req.session.userId }]
        }).populate('userId friendId', 'name email');
        res.json(requests);
    } catch (err) {
        next(err);
    }
});

app.patch('/api/friend-requests/:id', checkAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        if (!status || !['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }
        const request = await friendRequestModel.findOneAndUpdate(
            { _id: id, friendId: req.session.userId },
            { status },
            { new: true }
        );
        if (!request) {
            return res.status(404).json({ message: 'Friend request not found or unauthorized' });
        }
        res.json({ message: 'Friend request updated', request });
    } catch (err) {
        next(err);
    }
});

app.delete('/api/friend-requests/:id', checkAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const request = await friendRequestModel.findOneAndDelete({
            _id: id,
            $or: [{ userId: req.session.userId }, { friendId: req.session.userId }]
        });
        if (!request) {
            return res.status(404).json({ message: 'Friend request not found or unauthorized' });
        }
        res.json({ message: 'Friend request deleted' });
    } catch (err) {
        next(err);
    }
});

// Story Routes
app.post('/api/stories', checkAuth, upload.single('media'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Media is required' });
        }
        const story = await storyModel.create({
            userId: req.session.userId,
            media: `/uploads/${req.file.filename}`,
            username: req.user.name,
            createdAt: new Date()
        });
        res.json({ message: 'Story created', story });
    } catch (err) {
        next(err);
    }
});

app.get('/api/stories', async (req, res, next) => {
    try {
        const stories = await storyModel.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);
        res.json(stories);
    } catch (err) {
        next(err);
    }
});

// Reddit Route
app.get('/reddit-posts', async (req, res, next) => {
    const subreddit = req.query.subreddit || 'technology';
    const after = req.query.after || '';
    if (!/^[a-zA-Z0-9_]+$/.test(subreddit)) {
        return res.status(400).json({ error: 'Invalid subreddit name' });
    }
    try {
        const response = await axios.get(`https://www.reddit.com/r/${subreddit}/new.json?after=${after}`, {
            headers: { 'User-Agent': 'SocialApp/1.0' }
        });
        if (response.status !== 200) {
            throw new Error(`Reddit API returned status: ${response.status}`);
        }
        res.json(response.data);
    } catch (err) {
        next(err);
    }
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`Error on ${req.method} ${req.url}:`, err.message);
    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));