require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { ObjectId } = require('mongodb'); // Import ObjectId for MongoDB object IDs
const multer = require("multer");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: "uploads/" });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
    });

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    medications: { type: Array, default: [] }, // Default to an empty array
    age: { type: Number, default: null }, // Default to null if not provided
    allergies: { type: String, default: '' }, // Default to an empty string
    blood: { type: String, default: '' },
    history: { type: String, default: '' },
    verificationToken: { 
        type: String, 
        default: null 
    },
    tokenExpiresAt: {
        type: Date,
        default: null
    }
});

const User = mongoose.model('User', userSchema);

// Middleware to authenticate the user
const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from header
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403); // Forbidden
            }
            req.user = user; // Store user information in request
            next();
        });
    } else {
        res.sendStatus(401); // Unauthorized
    }
};

// Register endpoint
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body; // Default to an empty array

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            username, 
            email, 
            password: hashedPassword, 
            medications: [], 
            age: null, 
            blood: '', 
            allergies: '', 
            history: '' 
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login  
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' }); // 400 Missing Data
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username, medications: user.medications },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, username: user.username, userId: user._id, medications: user.medications, message: 'Login successful' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Save medication
app.post('/medications', authenticateJWT, async (req, res) => {
    const { name, time, quantity, days } = req.body;

    if (!name || !time || !quantity || !days) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.medications.push({ name, time, quantity, days });
        await user.save();

        res.status(201).json({ message: 'Medication added successfully' });
    } catch (error) {
        console.error('Error saving medication:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Profile update
app.post('/profile', async (req, res) => {
    const { age, bloodType, allergies, medicalHistory, userId } = req.body;

    // Ensure all required fields are provided
    if (!age || !bloodType || !allergies || !medicalHistory || !userId) {
        return res.status(400).json({ message: 'All fields (age, bloodType, allergies, medicalHistory, userId) are required' });
    }

    try {
        const result = await User.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { age, blood: bloodType, allergies, history: medicalHistory } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User profile updated successfully' });
    } catch (error) {
        console.error('Error during profile update:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Profile get
app.post('/profile/get', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const user = await User.findById(userId); // Retrieve user by ID

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure you access the correct fields from the schema
        return res.status(200).json({ 
            age: user.age, 
            bloodType: user.blood, 
            allergies: user.allergies,
            medicalHistory: user.history,
            message: 'User profile retrieved successfully' 
        });
    } catch (error) {
        console.error('Error during profile retrieval:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});


// Get medications for the logged-in user
app.get('/medications', authenticateJWT, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.medications || []);
    } catch (error) {
        console.error('Error retrieving medications:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/medications/edit/:medicationIndex', authenticateJWT, async (req, res) => {
    const { medicationIndex } = req.params;
    const userId = req.user.userId; // Assumes user is added to req in `authenticate` middleware
    const { name, time, quantity, days } = req.body;

    try {
        // Validate input data
        if (!name) {
            return res.status(400).json({ message: 'Medication name is required.' });
        }

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the medicationIndex is valid
        if (
            isNaN(medicationIndex) || // Ensure it's a number
            medicationIndex < 0 || 
            medicationIndex >= user.medications.length
        ) {
            return res.status(400).json({ message: 'Invalid medication index.' });
        }

        // Update only the fields provided in the request body
        user.medications[medicationIndex] = {
            ...user.medications[medicationIndex],
            ...(name && { name }),
            ...(time && { time }),
            ...(quantity && { quantity }),
            ...(days && { days }),
        };

        // Save the updated user document
        await user.save();

        // Respond with the updated medication
        const updatedMedication = user.medications[medicationIndex];
        res.status(200).json(updatedMedication);

    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({ message: 'An error occurred while updating the medication.' });
    }
});

app.delete('/medications/remove/:medicationIndex', authenticateJWT, async (req, res) => {
    const { medicationIndex } = req.params;
    const userId = req.user.userId; // Assumes user is added to req in `authenticate` middleware

    try {
        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the medicationIndex is valid
        if (
            isNaN(medicationIndex) || // Ensure it's a number
            medicationIndex < 0 || 
            medicationIndex >= user.medications.length
        ) {
            return res.status(400).json({ message: 'Invalid medication index.' });
        }

        // Remove the medication using splice
        user.medications.splice(medicationIndex, 1);

        // Save the updated user document
        await user.save();

        // Respond with success message
        res.status(200).json({ message: 'Medication removed successfully.' });

    } catch (error) {
        console.error('Error removing medication:', error);
        res.status(500).json({ message: 'An error occurred while removing the medication.' });
    }
});

app.post("/upload-and-send", upload.single("pdf-file"), async (req, res) => {
    const { email } = req.body;
    const pdfPath = req.file.path;
    const pdfName = req.file.originalname;

    if (!email || !pdfPath) {
        return res.status(400).json({ message: "Invalid data" });
    }

    const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });

    try {
        await transporter.sendMail({
            from: '"PDF Service" <your-email@gmail.com>',
            to: email,
            subject: "Uploaded PDF",
            text: "Please find the attached PDF file.",
            attachments: [
                {
                    filename: pdfName,
                    path: pdfPath,
                },
            ],
        });

        fs.unlinkSync(pdfPath);
        res.json({ message: "PDF sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Error sending email" });
    }
});

// Send Reset Password Email
app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        // Check if the email exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Email not found' });
        }

        // Generate a secure verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.tokenExpiresAt = Date.now() + 3600000; // Token valid for 1 hour
        await user.save();

        const resetLink = `${process.env.baseUrl}/reset-password.html?token=${verificationToken}`;

        // Set up Nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL, // Your email
                pass: process.env.PASSWORD // Your email password
            }
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link to reset your password: ${resetLink}\n\nIf you did not request this, please ignore this email.`
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Reset link sent to your email' });
    } catch (error) {
        console.error('Error in forgot-password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Reset Password
app.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Find the user with the token
        const user = await User.findOne({
            verificationToken: token,
            tokenExpiresAt: { $gt: Date.now() } // Ensure the token is still valid
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the password and clear the token
        user.password = hashedPassword;
        user.verificationToken = null;
        user.tokenExpiresAt = null;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error in reset-password:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const port = process.env.PORT || 5500;
app.listen(port, () => console.log(`Server running on port ${port}`));