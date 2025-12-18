import mongoose from "mongoose";

const CHAT_SCHEMA = new mongoose.Schema({
    participants: [{type: mongoose.Schema.Types.ObjectId,ref: 'User'}], 
    lastMssage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    deleetedFor: [{type: String}],
    isGroup: {type : Boolean, default : false},
    groupName: {type: String, require: true},
    admins: [{type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    photoURL: {type: String},
    photoURLId: {type: String},
  }, { timestamps: true});

  const Chat = mongoose.model('Chat',CHAT_SCHEMA);

  export default Chat;