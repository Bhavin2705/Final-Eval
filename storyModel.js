const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    media: { type: String, required: true }, // Path to uploaded media
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Story', storySchema);