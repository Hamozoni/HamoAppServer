import mongoose from "mongoose";

const MESSAGE_SCHEMA = new mongoose.Schema({
    onwer: {type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String },
    mediaMeta: { type: mongoose.Schema.Types.ObjectId,ref: 'File' },
    call:  { type: mongoose.Schema.Types.ObjectId,ref: 'Call'},
    type: {type: String,enum: ['TEXT', 'MEDIA','CALL'],default: 'TEXT'},
    status: { 
        type: String, 
        enum: ['SENT', 'DELIVERED', 'READ','PENDING'], 
        default: 'SENT' 
    },
    deletedFor: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    isReply: {type: Boolean, default: false},
    replyTo: {type: mongoose.Schema.Types.ObjectId, ref: 'Message'}
},{timestamps: true});


const Message = mongoose.model('Message',MESSAGE_SCHEMA);

export default Message;