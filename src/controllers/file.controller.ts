import type { Request, Response } from "express";

import CloudinaryService from "../services/cloudinary.service.js";
import FileService from "../services/file.service.js";

class FileController {

    // 1️⃣ Get signature for chat media upload
    async signature(req: Request, res: Response) {
        try {
            const { type } = req.body;

            if (!["image", "video", "audio", "document"].includes(type)) {
                return res.status(400).json({ message: "Invalid file type" });
            }

            const signature = CloudinaryService.generateTempMediaSignature(
                (req as any).user._id,
                type
            );

            return res.json(signature);
        } catch (err) {
            return res.status(500).json({ message: "Failed to generate signature" });
        }
    }

    // 2️⃣ Save file metadata after client uploads to Cloudinary
    async confirm(req: Request, res: Response) {
        try {
            const { cloudinaryData, type, messageId, chatId } = req.body;

            const file = await FileService.saveChatMedia(
                (req as any).user._id,
                cloudinaryData,
                { type, messageId, chatId }
            );

            return res.json({
                fileId: file._id,
                secureUrl: file.secureUrl,
                thumbnailUrl: file.thumbnailUrl,
                metadata: file.metadata,
            });
        } catch (err) {
            return res.status(500).json({ message: "Failed to save file" });
        }
    }


    // 3️⃣ Mark as downloaded by receiver
    async downloaded(req: Request, res: Response) {
        try {
            await FileService.markDownloaded((req as any).params.fileId, (req as any).user._id);
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ message: "Failed to mark downloaded" });
        }
    }
}


export default new FileController();