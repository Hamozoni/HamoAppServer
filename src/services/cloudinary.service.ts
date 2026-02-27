import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();

export type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

export interface UploadSignatureOptions {
    userId: string;
    type: "image" | "video" | "audio" | "document";
    folder?: string;
    publicId?: string;
}

interface SignatureResponse {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    resourceType: CloudinaryResourceType;
    maxFileSize: number;
    publicId?: any;
}

class CloudinaryService {

    private cloudName = process.env.CLOUDINARY_NAME!;
    private apiKey = process.env.CLOUDINARY_API_KEY!;
    private apiSecret = process.env.CLOUDINARY_API_SECRET!;


    /**
     * Main entry to generate upload signature
     */
    public generateUploadSignature(
        options: UploadSignatureOptions
    ): SignatureResponse {
        const timestamp = Math.round(Date.now() / 1000);

        const {
            resourceType,
            maxFileSize,
            folderName,
        } = this.resolveUploadConfig(options.type);

        const uploadFolder = this.buildFolder(
            options.folder,
            folderName,
            options.userId
        );

        const paramsToSign: Record<string, any> = {
            timestamp,
            folder: uploadFolder,
            resource_type: resourceType,
            max_file_size: maxFileSize,
        };

        if (options.publicId) {
            paramsToSign.public_id = options.publicId;
        }

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            this.apiSecret
        );

        return {
            signature,
            timestamp,
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            folder: uploadFolder,
            resourceType,
            maxFileSize,
            publicId: options.publicId,
        };
    }

    /**
     * Map logical type → Cloudinary config
     */
    private resolveUploadConfig(type: UploadSignatureOptions["type"]) {
        switch (type) {
            case "image":
                return {
                    resourceType: "image" as const,
                    maxFileSize: 10 * 1024 * 1024, // 10MB
                    folderName: "images",
                };

            case "video":
                return {
                    resourceType: "video" as const,
                    maxFileSize: 200 * 1024 * 1024, // 200MB
                    folderName: "videos",
                };

            case "audio":
                return {
                    resourceType: "video" as const, // Cloudinary treats audio as video
                    maxFileSize: 50 * 1024 * 1024, // 50MB
                    folderName: "audio",
                };

            case "document":
                return {
                    resourceType: "raw" as const,
                    maxFileSize: 25 * 1024 * 1024, // 25MB
                    folderName: "documents",
                };

            default:
                return {
                    resourceType: "auto" as const,
                    maxFileSize: 100 * 1024 * 1024,
                    folderName: "uploads",
                };
        }
    }

    // inside CloudinaryService class

    public generateProfilePictureSignature(userId: string) {
        const timestamp = Math.round(Date.now() / 1000);
        const folder = `profile_pictures/${userId}`;
        const publicId = `${folder}/avatar`;

        const paramsToSign: Record<string, any> = {
            timestamp,
            folder,
            public_id: publicId,
            overwrite: true,
            invalidate: true,
        };

        const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);

        return {
            timestamp,
            folder,
            overwrite: true,
            invalidate: true,
            cloudName: this.cloudName,
            publicId,
            signature,
            apiKey: this.apiKey,
            uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`
        };
    }


    private buildFolder(
        baseFolder: string | undefined,
        typeFolder: string,
        userId: string
    ) {
        if (baseFolder) {
            return `${baseFolder}/${typeFolder}/${userId}`;
        }

        return `${typeFolder}/${userId}`;
    };

    // Add this method to your CloudinaryService class

    public generateTempMediaSignature(
        userId: string,
        type: UploadSignatureOptions["type"]
    ): SignatureResponse {
        const timestamp = Math.round(Date.now() / 1000);
        const { resourceType, maxFileSize, folderName } = this.resolveUploadConfig(type);

        // ✅ temp folder — separate from permanent files
        const folder = `sudachat/temp/${folderName}/${userId}`;

        const paramsToSign: Record<string, any> = {
            timestamp,
            folder,
            resource_type: resourceType,
            max_file_size: maxFileSize,
            // ✅ Auto delete from Cloudinary after 30 days safety net
            invalidate: true,
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            this.apiSecret
        );

        return {
            signature,
            timestamp,
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            folder,
            resourceType,
            maxFileSize,
        };
    }

    // Delete a file from Cloudinary by publicId
    public async deleteFile(
        publicId: string,
        resourceType: CloudinaryResourceType = "image"
    ): Promise<void> {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });
        console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
    }


};

export default new CloudinaryService();


