// server.js - The Gatekeeper for Code Academy

const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read users from the JSON file
const readUsers = (callback) => {
    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
        if (err) {
            // If the file doesn't exist, start with an empty array
            if (err.code === 'ENOENT') {
                return callback(null, []);
            }
            return callback(err);
        }
        try {
            const users = JSON.parse(data);
            callback(null, users);
        } catch (parseErr) {
            callback(parseErr);
        }
    });
};

// Helper function to write users to the JSON file
const writeUsers = (users, callback) => {
    fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8', (err) => {
        if (err) {
            return callback(err);
        }
        callback(null);
    });
};

// --- API Routes ---

// Signup Door: Handle new student registration
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    readUsers(async (err, users) => {
        if (err) {
            console.error('Error reading users file:', err);
            return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
        }

        // Check if student already exists
        const userExists = users.some(user => user.username.toLowerCase() === username.toLowerCase());
        if (userExists) {
            return res.status(409).json({ success: false, message: 'Username is already taken.' });
        }

        try {
            // Hash the password for security
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

            // Add the new student
            const newUser = { username, password: hashedPassword };
            users.push(newUser);

            // Save the updated list
            writeUsers(users, (writeErr) => {
                if (writeErr) {
                    console.error('Error writing users file:', writeErr);
                    return res.status(500).json({ success: false, message: 'Server error. Could not register user.' });
                }
                res.status(201).json({ success: true, message: 'Signup successful! You can now log in.' });
            });
        } catch (hashErr) {
            console.error('Error hashing password:', hashErr);
            return res.status(500).json({ success: false, message: 'Server error during registration.' });
        }
    });
});

// Login Door: Handle existing student login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    readUsers((err, users) => {
        if (err) {
            console.error('Error reading users file:', err);
            return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
        }

        // Find the student
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username and password.' });
        }

        // Compare the provided password with the stored hash
        bcrypt.compare(password, user.password, (compareErr, isMatch) => {
            if (compareErr) {
                console.error('Error comparing passwords:', compareErr);
                return res.status(500).json({ success: false, message: 'Server error during login.' });
            }

            if (isMatch) {
                res.status(200).json({ success: true, message: `Welcome back to the portal, ${user.username}!` });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username and password.' });
            }
        });
    });
});

// --- HTML Routes ---

// Serve the main login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Gatekeeper App is listening on http://localhost:${PORT}`);
});
