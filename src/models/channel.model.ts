import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/index.js";
import type { IMessage } from "./message.model.js";

export interface IChannel extends mongoose.Document {
    onwer: mongoose.Types.ObjectId | IUser;
    followers: mongoose.Types.ObjectId[] | IUser[];
    name: string;
    description: string;
    messages: mongoose.Types.ObjectId[] | IMessage[];
    lastMessage?: mongoose.Types.ObjectId | IMessage;
    photoURL?: string;
    photoURLId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CHANNEL_SCHEMA = new Schema<IChannel>({
    onwer: { type: Schema.Types.ObjectId, ref: 'User' },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    name: { type: String, required: true },
    description: { type: String, required: true },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
    lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
    photoURL: { type: String },
    photoURLId: { type: String },
}, { timestamps: true });

const Channel = mongoose.model<IChannel>('Channel', CHANNEL_SCHEMA);

export default Channel;
