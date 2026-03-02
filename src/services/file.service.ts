import fileModel from "../models/file.model.js";
import CloudinaryService from "./cloudinary.service.js";
import { Types } from "mongoose";

class FileService {

    // Called after client uploads to Cloudinary
    async saveChatMedia(
        userId: string,
        cloudinaryData: any,
        options: {
            type: "image" | "video" | "audio" | "document";
            purpose?: string;
            messageId?: string;
            chatId?: string;
        }
    ) {
        const resourceType =
            options.type === "document" ? "raw" :
                options.type === "audio" ? "video" :
                    options.type;

        const file = await fileModel.create({
            ownerId: new Types.ObjectId(userId),
            type: options.type,
            purpose: options.purpose ?? "chat_media",
            publicId: cloudinaryData.public_id,
            resourceType,
            secureUrl: cloudinaryData.secure_url,
            thumbnailUrl: cloudinaryData.resource_type === "video"
                ? cloudinaryData.secure_url.replace(/\.[^/.]+$/, ".jpg")
                : null,
            metadata: {
                size: cloudinaryData.bytes,
                format: cloudinaryData.format,
                mimeType: `${cloudinaryData.resource_type}/${cloudinaryData.format}`,
                width: cloudinaryData.width ?? null,
                height: cloudinaryData.height ?? null,
                duration: cloudinaryData.duration ?? null,
            },
            usedBy: options.messageId ? [{
                entityType: "message",
                entityId: new Types.ObjectId(options.messageId),
            }] : [],
            downloaded: false,
            deleteAfter: null,
        });

        return file;
    }

    // Mark file as downloaded by receiver → starts deletion countdown
    async markDownloaded(fileId: string, userId: string) {
        const file = await fileModel.findById(fileId);
        if (!file || file.isDeleted) return;

        const alreadyDownloaded = file.downloadedBy?.some(
            (d: any) => d.userId.toString() === userId
        );
        if (alreadyDownloaded) return;

        const deleteAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await fileModel.findByIdAndUpdate(fileId, {
            downloaded: true,
            downloadedAt: new Date(),
            deleteAfter,
            $push: {
                downloadedBy: {
                    userId: new Types.ObjectId(userId),
                    downloadedAt: new Date(),
                },
            },
        });
    }

    // Cron — delete expired files from Cloudinary
    async cleanupExpiredFiles() {
        const expired = await fileModel.find({
            downloaded: true,
            isDeleted: false,
            deleteAfter: { $lt: new Date() },
        });

        console.log(`🧹 Cleaning ${expired.length} expired files`);

        for (const file of expired) {
            try {
                await CloudinaryService.deleteFile(
                    file.publicId,
                    file.resourceType as any
                );
                await fileModel.findByIdAndUpdate(file._id, { isDeleted: true });
            } catch (err) {
                console.error(`Failed to delete ${file.publicId}:`, err);
            }
        }
    }
}

export default new FileService();