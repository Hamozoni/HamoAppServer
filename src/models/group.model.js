import mongoose from "mongoose";

const GROUP_SCHEMA = new mongoose.Schema({
    chat: {type: mongoose.Schema.Types.ObjectId,ref: 'Chat'},
    groupName: {type: String, require: true},
    admins: [{type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    photoURL: {type: String},
    photoURLId: {type: String},
  }, { timestamps: true});

  const Group = mongoose.model('Group',GROUP_SCHEMA);

  export default Group;