const express = require('express');
const router = express.Router();
const ensureAuth = require('../middleware/auth');
const Member = require('../models/Member');

router.get('/dashboard', ensureAuth, async (req, res) => {
    const me = await Member.findById(req.session.user.id);
    res.render('dashboard', { me });
});

router.get('/join', ensureAuth, (req, res) => {
    res.render('join', { error: null, values: {} });
});

async function findFirstAvailableOnSide(startMember, side) {
    let current = startMember;
    while (true) {
        if (!current[`${side}_member`]) {
            return { parent: current, side };
        }
        current = await Member.findById(current[`${side}_member`]);
        if (!current) {
            return { parent: current, side };
        }
    }
}

async function updateCountsUpward(parent, childId, side) {
    let cur = parent;
    let child = childId;
    while (cur) {
        if (cur.left_member && cur.left_member.toString() === child.toString()) {
            cur.left_count = (cur.left_count || 0) + 1;
        } else if (cur.right_member && cur.right_member.toString() === child.toString()) {
            cur.right_count = (cur.right_count || 0) + 1;
        } else {

        }
        await cur.save();
        child = cur._id;
        if (!cur.sponsor) break;
        cur = await Member.findById(cur.sponsor);
    }
}

router.post('/join', ensureAuth, async (req, res) => {
    try {
        const { name, email, mobile, sponsor_code, position, password } = req.body;
        const values = { name, email, mobile, sponsor_code, position };

        if (!name || !email || !sponsor_code || !position || !password) {
            return res.render('join', { error: 'Please fill all required fields', values });
        }

        const sponsor = await Member.findOne({ member_code: sponsor_code });
        if (!sponsor) {
            return res.render('join', { error: 'Invalid Sponsor Code.', values });
        }

        let attachParent = null;
        let attachSide = position === 'Left' ? 'left' : 'right';

        if (!sponsor[`${attachSide}_member`]) {
            attachParent = sponsor;
        } else {
            const found = await findFirstAvailableOnSide(sponsor, attachSide);
            attachParent = found.parent;
            attachSide = found.side;
        }

        if (!attachParent) {
            return res.render('join', { error: 'Could not find slot to attach. Try another sponsor', values });
        }

        const newMember = new Member({
            name,
            email,
            mobile,
            sponsor: attachParent._id,
            sponsor_code: sponsor.member_code,
            position_at_sponsor: attachSide
        });
        await newMember.setPassword(password);
        newMember.member_code = await Member.generateMemberCode();
        await newMember.save();

        attachParent[`${attachSide}_member`] = newMember._id;
        await attachParent.save();

        await updateCountsUpward(attachParent, newMember._id, attachSide);

        res.render('join', { error: null, values: {}, success: `Member created. Code: ${newMember.member_code}` });
    } catch (err) {
        console.error(err);
        let msg = 'Error during join';
        if (err.code === 11000) msg = 'Email or member code already exists';
        res.render('join', { error: msg, values: req.body });
    }
});

router.get('/profile', ensureAuth, async (req, res) => {
    const me = await Member.findById(req.session.user.id).lean();
    res.render('profile', { me });
});

router.get('/downline/:side', ensureAuth, async (req, res) => {
    const side = req.params.side;
    if (!['left', 'right'].includes(side)) return res.redirect('/members/dashboard');

    const me = await Member.findById(req.session.user.id)
        .populate({ path: `${side}_member`, select: 'name member_code left_count right_count' })
        .lean();

    const immediate = me[`${side}_member`];

    const subtree = [];
    const queue = [];
    if (immediate) queue.push({ nodeId: immediate._id, depth: 1 });

    while (queue.length) {
        const { nodeId, depth } = queue.shift();
        const node = await Member.findById(nodeId).select('name member_code left_member right_member left_count right_count').lean();
        if (!node) continue;
        subtree.push({ ...node, depth });
        if (depth < 3) {
            if (node.left_member) queue.push({ nodeId: node.left_member, depth: depth + 1 });
            if (node.right_member) queue.push({ nodeId: node.right_member, depth: depth + 1 });
        }
    }

    res.render('downline', { side, immediate, subtree });
});

module.exports = router;
