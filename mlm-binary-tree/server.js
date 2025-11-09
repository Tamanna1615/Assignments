require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("Set MONGODB_URI in .env");
    process.exit(1);
}
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => { console.error(err); process.exit(1); });
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: MONGODB_URI }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    next();
});
app.use('/', authRoutes);
app.use('/members', memberRoutes);
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/members/dashboard');
    res.redirect('/login');
});
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
