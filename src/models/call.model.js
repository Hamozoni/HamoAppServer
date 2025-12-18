import mongoose from "mongoose";

const CALL_SCHEMA = new mongoose.Schema({
    caller: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    callee: {type: mongoose.Schema.Types.ObjectId, ref: "User"},
    type : {type: String , enum: ['AUDIO','VEDIO'],default : 'AUDIO'},
    callStatus: {type: String, enum: ['PENDING','ACCEPTED','REJECTED','MISSED'],default : 'PENDING'},
    duration: {type: Number, default : 0},
},{timestamps: true});

const Call = mongoose.model('Call',CALL_SCHEMA);

export default Call;