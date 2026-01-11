import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/index.js";
import type { IChat } from "./chat.model.js";

export interface IGroup extends mongoose.Document {
    chat: mongoose.Types.ObjectId | IChat;
    groupName: string;
    admins: mongoose.Types.ObjectId[] | IUser[];
    photoURL?: string;
    photoURLId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GROUP_SCHEMA = new Schema<IGroup>({
    chat: { type: Schema.Types.ObjectId, ref: 'Chat' },
    groupName: { type: String, required: true },
    admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    photoURL: { type: String },
    photoURLId: { type: String },
}, { timestamps: true });

const Group = mongoose.model<IGroup>('Group', GROUP_SCHEMA);

export default Group;
