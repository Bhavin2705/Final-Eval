const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const axios = require('axios');
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

const checkAdminAuth = async (req, res, next) => {
    if (req.session.userId) {
        try {
            const user = await userModel.findById(req.session.userId);
            if (user && user.role === 'admin') {
                req.user = user;
                return next();
            }
        } catch (err) {
            return next(err);
        }
    }
    res.status(403).json({ message: 'Forbidden: Admin access required' });
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

// API Routes
// Authentication Routes
app.get('/api/v1/auth/check', checkAuth, async (req, res, next) => {
    try {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (err) {
        next(err);
    }
});

app.post('/api/v1/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        req.session.userId = user._id;
        await userModel.updateOne({ _id: user._id }, { lastLogin: new Date().toISOString() });
        res.json({
            message: 'Login successful',
            token: req.sessionID,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        next(err);
    }
});

app.post('/api/v1/auth/logout', checkAuth, (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.json({ message: 'Logged out' });
    });
});

// Admin Authentication Routes
app.post('/api/admin/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Missing email or password' });
        }
        const admin = await userModel.findOne({ email, role: 'admin' });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid admin credentials' });
        }
        req.session.userId = admin._id;
        await userModel.updateOne({ _id: admin._id }, { lastLogin: new Date().toISOString() });
        res.json({
            message: 'Admin login successful',
            user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
        });
    } catch (err) {
        next(err);
    }
});

app.get('/api/admin/me', checkAdminAuth, async (req, res, next) => {
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

// Moderator Authentication Routes
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

app.get('/api/moderator/me', checkModAuth, async (req, res, next) => {
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

// Owner Authentication Routes
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

// Admin Routes
app.post('/api/admin/users', checkAdminAuth, async (req, res, next) => {
    try {
        const { name, email, role, password } = req.body;
        if (!name || !email || !role || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        if (!['moderator', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Admins can only create moderators or users' });
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
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
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

app.get('/api/admin/users', checkAdminAuth, async (req, res, next) => {
    try {
        const users = await userModel.find({ role: { $in: ['moderator', 'user'] } })
            .select('_id name email role status lastLogin');
        res.json({
            users: users.map(user => ({
                id: user._id,
                name: user.name || (user.role === 'guest' ? 'Guest' : user.name),
                email: user.email || (user.role === 'guest' ? 'N/A' : user.email),
                role: user.role,
                status: user.status || 'active',
                lastLogin: user.lastLogin
            }))
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/admin/users', checkAdminAuth, async (req, res, next) => {
    try {
        const { id, name, email, role, status } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!['moderator', 'user'].includes(user.role)) {
            return res.status(403).json({ message: 'Admins can only modify moderators or users' });
        }
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) {
            if (email && email !== 'N/A') {
                const existingUser = await userModel.findOne({ email, _id: { $ne: id } });
                if (existingUser) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                updateData.email = email;
            }
        }
        if (role && ['moderator', 'user'].includes(role)) {
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
                status: updatedUser.status || 'active',
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/admin/users/ban', checkAdminAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!['moderator', 'user'].includes(user.role)) {
            return res.status(403).json({ message: 'Admins can only ban moderators or users' });
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

app.patch('/api/admin/users/unban', checkAdminAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!['moderator', 'user'].includes(user.role)) {
            return res.status(403).json({ message: 'Admins can only unban moderators or users' });
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

app.delete('/api/admin/users', checkAdminAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!['moderator', 'user'].includes(user.role)) {
            return res.status(403).json({ message: 'Admins can only delete moderators or users' });
        }
        await userModel.deleteOne({ _id: id });
        res.json({ message: 'User deleted' });
    } catch (err) {
        next(err);
    }
});

// Moderator Routes
app.get('/api/moderator/users', checkModAuth, async (req, res, next) => {
    try {
        const users = await userModel.find({ role: 'user' })
            .select('_id name email status lastLogin createdAt');
        const usersWithReports = await Promise.all(users.map(async (user) => {
            const reports = await reportModel.find({ userId: user._id, status: 'pending' });
            return {
                id: user._id,
                name: user.name,
                email: user.email,
                status: user.status || 'active',
                lastActive: user.lastLogin || 'Unknown',
                reports: reports.length,
                created: user.createdAt || new Date().toISOString()
            };
        }));
        res.json(usersWithReports);
    } catch (err) {
        next(err);
    }
});

app.get('/api/moderator/users/:id', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res)) return;
        const user = await userModel.findById(id).select('_id name email status lastLogin createdAt');
        if (!user || user.role !== 'user') {
            return res.status(404).json({ message: 'User not found or not a regular user' });
        }
        const reports = await reportModel.find({ userId: id, status: 'pending' });
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status || 'active',
            lastActive: user.lastLogin || 'Unknown',
            reports: reports.length,
            created: user.createdAt || new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

app.get('/api/moderator/reports', checkModAuth, async (req, res, next) => {
    try {
        const { userId, status } = req.query;
        const query = {};
        if (userId && validateObjectId(userId, res)) {
            query.userId = userId;
        }
        if (status) {
            query.status = status;
        }
        const reports = await reportModel.find(query).populate('userId reportedBy', 'name email');
        const formattedReports = reports.map(report => ({
            id: report._id,
            userId: report.userId._id,
            userName: report.userId.name,
            contentType: report.contentType || 'post',
            content: report.content || '',
            reason: report.reason || 'Unknown',
            reportedBy: report.reportedBy ? report.reportedBy.name : 'Anonymous',
            status: report.status || 'pending',
            date: report.createdAt.toISOString().split('T')[0]
        }));
        res.json(formattedReports);
    } catch (err) {
        next(err);
    }
});

app.get('/api/moderator/reports/:id', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!validateObjectId(id, res)) return;
        const report = await reportModel.findById(id).populate('userId reportedBy', 'name email');
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json({
            id: report._id,
            userId: report.userId._id,
            userName: report.userId.name,
            contentType: report.contentType || 'post',
            content: report.content || '',
            reason: report.reason || 'Unknown',
            reportedBy: report.reportedBy ? report.reportedBy.name : 'Anonymous',
            status: report.status || 'pending',
            date: report.createdAt.toISOString().split('T')[0]
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/moderator/reports/:id', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, resolvedDate } = req.body;
        if (!validateObjectId(id, res)) return;
        if (!status || !['pending', 'resolved', 'ignored'].includes(status)) {
            return res.status(400).json({ message: 'Valid status is required' });
        }
        const report = await reportModel.findByIdAndUpdate(
            id,
            { status, resolvedDate: resolvedDate || new Date().toISOString() },
            { new: true }
        );
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json({ message: 'Report updated', report });
    } catch (err) {
        next(err);
    }
});

app.post('/api/moderator/reports/:id/remove', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, resolvedDate, resolution } = req.body;
        if (!validateObjectId(id, res)) return;
        const report = await reportModel.findById(id);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        if (report.contentType === 'post') {
            await postModel.findOneAndDelete({ content: report.content });
        }
        await reportModel.findByIdAndUpdate(
            id,
            { status: status || 'resolved', resolvedDate: resolvedDate || new Date().toISOString(), resolution: resolution || 'content_removed' },
            { new: true }
        );
        res.json({ message: 'Content removed and report updated' });
    } catch (err) {
        next(err);
    }
});

app.post('/api/moderator/warnings', checkModAuth, async (req, res, next) => {
    try {
        const { userId, reason, message, date } = req.body;
        if (!userId || !reason || !message || !validateObjectId(userId, res)) {
            return res.status(400).json({ message: 'Missing required fields or invalid user ID' });
        }
        const user = await userModel.findById(userId);
        if (!user || user.role !== 'user') {
            return res.status(404).json({ message: 'User not found or not a regular user' });
        }
        const warning = await warningModel.create({
            userId,
            reason,
            message,
            date: date || new Date().toISOString()
        });
        res.json({ message: 'Warning issued', warning });
    } catch (err) {
        next(err);
    }
});

app.get('/api/moderator/warnings', checkModAuth, async (req, res, next) => {
    try {
        const { userId } = req.query;
        const query = userId && validateObjectId(userId, res) ? { userId } : {};
        const warnings = await warningModel.find(query).populate('userId', 'name email');
        const formattedWarnings = warnings.map(warning => ({
            id: warning._id,
            userId: warning.userId._id,
            userName: warning.userId.name,
            reason: warning.reason,
            message: warning.message,
            date: warning.date
        }));
        res.json(formattedWarnings);
    } catch (err) {
        next(err);
    }
});

app.patch('/api/moderator/users/ban', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'user') {
            return res.status(403).json({ message: 'Moderators can only ban regular users' });
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

app.patch('/api/moderator/users/unban', checkModAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'user') {
            return res.status(403).json({ message: 'Moderators can only unban regular users' });
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

// Owner Routes
app.post('/api/owner/users', checkOwnerAuth, async (req, res, next) => {
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
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
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

app.get('/api/owner/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const users = await userModel.find().select('_id name email role status lastLogin');
        res.json({
            users: users.map(user => ({
                id: user._id,
                name: user.name || (user.role === 'guest' ? 'Guest' : user.name),
                email: user.email || (user.role === 'guest' ? 'N/A' : user.email),
                role: user.role,
                status: user.status || 'active',
                lastLogin: user.lastLogin
            }))
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/owner/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id, name, email, role, status } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (id === req.session.userId && user.role === 'owner' && role && role !== 'owner') {
            return res.status(403).json({ message: 'You cannot change your own owner role' });
        }
        const updateData = {};
        if (name !== undefined) updateData.name = name || (role === 'guest' ? 'Guest' : name);
        if (email !== undefined) {
            if (email && email !== 'N/A') {
                const existingUser = await userModel.findOne({ email, _id: { $ne: id } });
                if (existingUser) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                updateData.email = email;
            } else {
                updateData.email = role === 'guest' ? 'N/A' : null;
            }
        }
        if (role && ['owner', 'admin', 'moderator', 'user', 'guest'].includes(role)) {
            updateData.role = role;
            if (role === 'guest') {
                updateData.email = 'N/A';
                updateData.name = 'Guest';
            }
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
                name: updatedUser.name || (updatedUser.role === 'guest' ? 'Guest' : updatedUser.name),
                email: updatedUser.email || (updatedUser.role === 'guest' ? 'N/A' : updatedUser.email),
                role: updatedUser.role,
                status: updatedUser.status || 'active',
                lastLogin: updatedUser.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/owner/users/demote', checkOwnerAuth, async (req, res, next) => {
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
        if (id === req.session.userId && user.role === 'owner') {
            return res.status(403).json({ message: 'You cannot demote your own owner account' });
        }
        user.role = 'user';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name || (user.role === 'guest' ? 'Guest' : user.name),
                email: user.email || (user.role === 'guest' ? 'N/A' : user.email),
                role: user.role,
                status: user.status || 'active',
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/owner/users/ban', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (id === req.session.userId && user.role === 'owner') {
            return res.status(403).json({ message: 'You cannot ban your own owner account' });
        }
        if (user.status === 'banned') {
            return res.status(400).json({ message: 'User is already banned' });
        }
        user.status = 'banned';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name || (user.role === 'guest' ? 'Guest' : user.name),
                email: user.email || (user.role === 'guest' ? 'N/A' : user.email),
                role: user.role,
                status: user.status || 'active',
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.patch('/api/owner/users/unban', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (id === req.session.userId && user.role === 'owner') {
            return res.status(403).json({ message: 'You cannot unban your own owner account' });
        }
        if (user.status !== 'banned') {
            return res.status(400).json({ message: 'User is not banned' });
        }
        user.status = 'active';
        await user.save();
        res.json({
            user: {
                id: user._id,
                name: user.name || (user.role === 'guest' ? 'Guest' : user.name),
                email: user.email || (user.role === 'guest' ? 'N/A' : user.email),
                role: user.role,
                status: user.status || 'active',
                lastLogin: user.lastLogin
            }
        });
    } catch (err) {
        next(err);
    }
});

app.delete('/api/owner/users', checkOwnerAuth, async (req, res, next) => {
    try {
        const { id } = req.body;
        if (!id || !validateObjectId(id, res)) {
            return;
        }
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (id === req.session.userId && user.role === 'owner') {
            return res.status(403).json({ message: 'You cannot delete your own owner account' });
        }
        await userModel.deleteOne({ _id: id });
        res.json({ message: 'User deleted' });
    } catch (err) {
        next(err);
    }
});

// General Routes
app.get(['/', '/register', '/login', '/owner', '/admin', '/moderator'], async (req, res, next) => {
    try {
        const page = req.path === '/' ? 'homePage' : req.path.slice(1);
        if (req.path === '/') {
            let user = { name: 'Guest', email: 'guest', role: 'guest' };
            if (req.session.userId) {
                user = await userModel.findById(req.session.userId).select('name email role');
            }
            res.render('homePage', { user });
        } else {
            res.render(`${page}.ejs`);
        }
    } catch (err) {
        next(err);
    }
});

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

app.get('/admin-dashboard', checkAdminAuth, (req, res) => {
    res.render('admin-dashboard.ejs');
});

app.get('/moderator-dashboard', checkModAuth, (req, res) => {
    res.render('moderator-dashboard.ejs');
});

app.get('/owner-dashboard', checkOwnerAuth, (req, res) => {
    res.render('owner-dashboard.ejs');
});

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

app.post('/logout', (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return next(err);
        }
        res.json({ message: 'Logged out' });
    });
});

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
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
        req.session.userId = newUser._id;
        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (err) {
        next(err);
    }
});

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

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(`Error on ${req.method} ${req.url}:`, err.message);
    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

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

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));