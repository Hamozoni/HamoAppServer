import type { Request, Response } from "express";
import { CloudinaryService } from "../services/cloudinary.service.js";

const cloudinaryService = new CloudinaryService();
class CloudinaryController {

    public getUploadSignature(req: Request, res: Response) {
        const userId = (req as any).user.id; // from auth middleware
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { type, folder, publicId } = req.body;

        if (!type || !folder) {
            return res.status(400).json({ error: "Missing type or folder" });
        }

        const signature = cloudinaryService.generateUploadSignature({
            userId,
            type,
            folder,
            publicId,
        });

        res.json(signature);
    }
};

export default new CloudinaryController();

