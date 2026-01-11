import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/index.js";

export interface ICall extends mongoose.Document {
    caller: mongoose.Types.ObjectId | IUser;
    callee: mongoose.Types.ObjectId | IUser;
    type: 'AUDIO' | 'VEDIO';
    callStatus: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'MISSED';
    duration: number;
    createdAt: Date;
    updatedAt: Date;
}

const CALL_SCHEMA = new Schema<ICall>({
    caller: { type: Schema.Types.ObjectId, ref: "User" },
    callee: { type: Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ['AUDIO', 'VEDIO'], default: 'AUDIO' },
    callStatus: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'MISSED'], default: 'PENDING' },
    duration: { type: Number, default: 0 },
}, { timestamps: true });

const Call = mongoose.model<ICall>('Call', CALL_SCHEMA);

export default Call;
