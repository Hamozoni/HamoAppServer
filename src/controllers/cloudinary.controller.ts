import type { Request, Response } from "express";
import cloudinaryService from "../services/cloudinary.service.js";

class CloudinaryController {

    public getProfileUploadSignature(req: Request, res: Response) {
        const userId = (req as any)?.userId;;

        const data = cloudinaryService.generateProfilePictureSignature(userId);

        return res.status(200).json(data);
    }

    public getUploadSignature(req: Request, res: Response) {
        const userId = (req as any).userId; // from auth middleware

        const { type } = req.body;

        const signature = cloudinaryService.generateTempMediaSignature(userId, type);

        return res.status(200).json(signature);
    }
};

export default new CloudinaryController();

