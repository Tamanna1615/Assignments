const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const SALT_ROUNDS = 10;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
const readUsers = (callback) => {
    fs.readFile(USERS_FILE, 'utf8', (err, data) => {
        if (err) {
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
const writeUsers = (users, callback) => {
    fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8', (err) => {
        if (err) {
            return callback(err);
        }
        callback(null);
    });
};
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
        const userExists = users.some(user => user.username.toLowerCase() === username.toLowerCase());
        if (userExists) {
            return res.status(409).json({ success: false, message: 'Username is already taken.' });
        }
        try {
            const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
            const newUser = { username, password: hashedPassword };
            users.push(newUser);
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
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials. Please check your username and password.' });
        }
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
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});
app.listen(PORT, () => {
    console.log(`Gatekeeper App is listening on http://localhost:${PORT}`);
});
