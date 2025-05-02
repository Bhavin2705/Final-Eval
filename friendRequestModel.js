const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    friendId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FriendRequest', friendRequestSchema);