import mongoose, { Schema } from "mongoose";

export interface IMedia extends mongoose.Document {
    name: string;
    type: 'AUDIO' | 'IMAGE' | 'VIDEO' | 'APPLICATION';
    fileURL: string;
    fileURLId: string;
    fileSize: number;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}

const MEDIA_SCHEMA = new Schema<IMedia>({
    name: { type: String, required: true },
    type: { type: String, enum: ['AUDIO', 'IMAGE', 'VIDEO', 'APPLICATION'], default: 'IMAGE' },
    fileURL: { type: String, required: true },
    fileURLId: { type: String, required: true },
    fileSize: { type: Number, required: true },
    duration: { type: Number }
}, { timestamps: true });

const Media = mongoose.model<IMedia>('File', MEDIA_SCHEMA);

export default Media;
