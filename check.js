const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const userModel = require('./userModel'); // Adjust path to your userModel

async function checkCreateOwner() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/socialweb');
        console.log('Connected to MongoDB');

        // Check for existing owner
        const existingOwner = await userModel.findOne({ role: 'owner' });
        if (existingOwner) {
            console.log('Owner found:', {
                email: existingOwner.email,
                name: existingOwner.name,
                role: existingOwner.role
            });
            return;
        }

        // Create owner if none exists
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('owner123', salt);

        const owner = await userModel.create({
            name: 'Owner User',
            email: 'owner@social.com',
            password: hashedPassword,
            role: 'owner',
            status: 'active',
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });

        console.log('Owner created:', {
            email: owner.email,
            name: owner.name,
            role: owner.role
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        mongoose.disconnect();
    }
}

checkCreateOwner();