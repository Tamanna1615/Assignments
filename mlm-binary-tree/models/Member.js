const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Counter = require('./Counter');

const MemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String },
    passwordHash: { type: String, required: true },
    member_code: { type: String, unique: true }, // generated
    sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    sponsor_code: { type: String, default: null },
    left_member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    right_member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
    left_count: { type: Number, default: 0 },
    right_count: { type: Number, default: 0 },
    position_at_sponsor: { type: String, enum: ['left', 'right', 'root'], default: 'root' },
    createdAt: { type: Date, default: Date.now }
});

MemberSchema.statics.generateMemberCode = async function () {
    const res = await Counter.findOneAndUpdate(
        { name: 'member_code' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return `M${String(res.seq).padStart(4, '0')}`;
};

MemberSchema.methods.setPassword = async function (plain) {
    this.passwordHash = await bcrypt.hash(plain, 10);
};

MemberSchema.methods.verifyPassword = async function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

const Member = mongoose.model('Member', MemberSchema);
module.exports = Member;
