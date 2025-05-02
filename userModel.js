const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: function () {
            return this.role !== 'guest'; // Password required unless role is guest
        }
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'moderator', 'user', 'guest'],
        default: 'user'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned'],
        default: 'active'
    },
    lastLogin: { type: String }
});

module.exports = mongoose.model('User', userSchema);