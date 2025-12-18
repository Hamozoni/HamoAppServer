import mongoose from "mongoose";


const CHANNEL_SCHEMA = new mongoose.Schema({
    onwer : {type: mongoose.Schema.Types.ObjectId,ref: 'User'},
    followers : [{type: mongoose.Schema.Types.ObjectId,ref: 'User'}],
    name: {type: String, require: true},
    description: {type: String, require: true},
    messages: [{type: mongoose.Schema.Types.ObjectId,ref: 'Message'}],
    lastMessage: {type: mongoose.Schema.Types.ObjectId,ref: 'Message'},
    photoURL: {type: String},
    photoURLId: {type: String},

},{timestamps: true});


const Channel = mongoose.model('Channel',CHANNEL_SCHEMA);

export default Channel