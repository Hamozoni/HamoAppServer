export type FileType =
    | "image"
    | "video"
    | "audio"
    | "document";

export type FilePurpose =
    | "profile_picture"
    | "chat_media"
    | "status"
    | "voice_note"
    | "attachment";

export interface IBaseMetadata {
    size: number;          // bytes
    format: string;        // jpg, mp4, mp3, pdf
    mimeType: string;      // image/jpeg, video/mp4
}

export interface IImageMetadata extends IBaseMetadata {
    width: number;
    height: number;
}

export interface IVideoMetadata extends IBaseMetadata {
    width: number;
    height: number;
    duration: number;      // seconds
    fps?: number;
}

export interface IAudioMetadata extends IBaseMetadata {
    duration: number;
    bitrate?: number;
}

export interface IDocumentMetadata extends IBaseMetadata {
    pages?: number;
}

import { Schema, model, Types } from "mongoose";

const FileSchema = new Schema(
    {
        ownerId: {
            type: Types.ObjectId,
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["image", "video", "audio", "document"],
            required: true,
            index: true,
        },

        purpose: {
            type: String,
            enum: [
                "profile_picture",
                "chat_media",
                "status",
                "voice_note",
                "attachment",
            ],
            required: true,
            index: true,
        },

        // Cloudinary
        publicId: {
            type: String,
            required: true,
            unique: true,
        },

        resourceType: {
            type: String,
            enum: ["image", "video", "raw"],
            required: true,
        },

        secureUrl: {
            type: String,
            required: true,
        },

        metadata: {
            type: Schema.Types.Mixed,
            required: true,
        },

        usedBy: [
            {
                entityType: {
                    type: String,
                    enum: ["message", "status", "profile"],
                },
                entityId: Types.ObjectId,
            },
        ],

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
        thumbnailUrl: {
            type: String,
        },

        expiresAt: {
            type: Date,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

FileSchema.index({ ownerId: 1, purpose: 1 });
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default model("File", FileSchema);
