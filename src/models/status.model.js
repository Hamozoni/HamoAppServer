import mongoose from "mongoose";

const STATUS_SCHEMA = new mongoose.Schema({
    onwer: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    text: {type: String,require : false},
    mediaMeta: {type: mongoose.Schema.Types.ObjectId, ref: 'Media'},
    type: {type: String,enum: ['TEXT','MEDIA'],default: 'TEXT'},
    textBgColor: {type: String,require : false},
    fontFamily: {type: String,require : false},
    seenBy: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    whoCanSee: {type: String,enum: ['ALL','EXCEPT',"SELECTED"],default: 'ALL'},
    selectedUsers : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
    exceptedUsers : [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
},{timestamps: true});


const Status = mongoose.model('Status',STATUS_SCHEMA);

export default Status;