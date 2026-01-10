import mongoose from 'mongoose';

const USER_SCHEMA = new mongoose.Schema({
    displayName: {type: String,require: true},
    phoneNumber: {type: String,require: true,unique: true},
    email: {type: String,require: true,unique: true},
    bio: {type: String,require: false,default:'Hey there! I am using WhatsApp.'},
    emailVerified:{type: Boolean, default: false },
    photoURL: {type: String,require: true,default: './placeholder_avatar.jpg'},
    photoPoblicId: {type: String,require: false},
    lastLoginAt: {type: Date,require: true,default: Date.now()},
    contacts: [{type: mongoose.Schema.Types.ObjectId,ref: 'User'}],
    blockedContacts: [{type: mongoose.Schema.Types.ObjectId,ref: "User"}],
    devices: [{type: String,require: true}],
},{timestamps: true});

 const User = mongoose.model('User',USER_SCHEMA);

 export default User;