const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
    const { member_code, password } = req.body;
    if (!member_code || !password) return res.render('login', { error: 'Provide code & password' });
    const user = await Member.findOne({ member_code });
    if (!user) return res.render('login', { error: 'Invalid credentials' });
    const ok = await user.verifyPassword(password);
    if (!ok) return res.render('login', { error: 'Invalid credentials' });
    req.session.user = { id: user._id, member_code: user.member_code, name: user.name };
    res.redirect('/members/dashboard');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

router.get('/create-root', async (req, res) => {
    const existingRoot = await Member.findOne({ position_at_sponsor: 'root' });
    if (existingRoot) return res.send('Root exists. Delete manually if you want to recreate.');
    const root = new Member({
        name: 'ROOT',
        email: 'root@example.com'
    });
    await root.setPassword('rootpass');
    root.member_code = await Member.generateMemberCode();
    root.position_at_sponsor = 'root';
    await root.save();
    res.send(`Root created. member_code: ${root.member_code} password: rootpass`);
});

module.exports = router;
