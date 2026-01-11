import mongoose, { Schema } from "mongoose";
import type { IUser } from "../types/index.js";
import type { IMedia } from "./media.model.js";

export interface IStatus extends mongoose.Document {
    onwer: mongoose.Types.ObjectId | IUser;
    text?: string;
    mediaMeta?: mongoose.Types.ObjectId | IMedia;
    type: 'TEXT' | 'MEDIA';
    textBgColor?: string;
    fontFamily?: string;
    seenBy: mongoose.Types.ObjectId[] | IUser[];
    whoCanSee: 'ALL' | 'EXCEPT' | 'SELECTED';
    selectedUsers: mongoose.Types.ObjectId[] | IUser[];
    exceptedUsers: mongoose.Types.ObjectId[] | IUser[];
    createdAt: Date;
    updatedAt: Date;
}

const STATUS_SCHEMA = new Schema<IStatus>({
    onwer: { type: Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: false },
    mediaMeta: { type: Schema.Types.ObjectId, ref: 'Media' },
    type: { type: String, enum: ['TEXT', 'MEDIA'], default: 'TEXT' },
    textBgColor: { type: String, required: false },
    fontFamily: { type: String, required: false },
    seenBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    whoCanSee: { type: String, enum: ['ALL', 'EXCEPT', 'SELECTED'], default: 'ALL' },
    selectedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    exceptedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

const Status = mongoose.model<IStatus>('Status', STATUS_SCHEMA);

export default Status;
