import cloudinary from "../config/cloudinary.js";
import File from "../models/file.model.js";
import type { UploadApiResponse } from "cloudinary";

interface FileUpload {
    mimetype: string;
    buffer: Buffer;
    originalname: string;
    size: number;
}

export const upload_file = async (file: FileUpload, folder: string, duration: number = 0) => {
    const type = file.mimetype.split('/')[0];
    const resource_type = type === 'image' ? 'image' : type === 'application' ? 'raw' : 'video';

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type,
                folder: `${folder}/${type}`,
            },
            (error, result) => {
                if (error) reject(error);
                else if (result) resolve(result);
                else reject(new Error('Upload failed'));
            }
        );

        uploadStream.end(file?.buffer);
    });

    const file_result = await File.create({
        name: file?.originalname,
        type: type?.toUpperCase(),
        url: result?.secure_url,
        public_id: result?.public_id,
        size: file?.size,
        duration,
    });

    return file_result;
};
