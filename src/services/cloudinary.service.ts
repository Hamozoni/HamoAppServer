import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();

export type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

export interface UploadSignatureOptions {
    userId: string;
    type: "image" | "video" | "audio" | "document" | "auto";
    folder?: string;
    publicId?: string;
}

export interface SignatureResponse {
    signature: string;
    timestamp: number;
    cloudName: string;
    apiKey: string;
    folder: string;
    resourceType: CloudinaryResourceType;
    maxFileSize?: number; // NOT signed. For client-side validation only.
    publicId?: string | undefined;
    overwrite?: boolean | undefined;
    invalidate?: boolean | undefined;
    uploadUrl: string;
}

class CloudinaryService {
    private cloudName = process.env.CLOUDINARY_NAME!;
    private apiKey = process.env.CLOUDINARY_API_KEY!;
    private apiSecret = process.env.CLOUDINARY_API_SECRET!;

    /**
     * RULE: paramsToSign must contain EXACTLY the fields the client
     * appends to FormData (besides file, api_key, signature).
     * Never sign: file, cloud_name, resource_type, api_key.
     * resource_type is part of the URL, not a signed param.
     */
    private sign(params: Record<string, any>): string {
        return cloudinary.utils.api_sign_request(params, this.apiSecret);
    }

    private now(): number {
        return Math.round(Date.now() / 1000);
    }

    /** Map logical type -> Cloudinary config */
    private resolveUploadConfig(type: UploadSignatureOptions["type"]) {
        switch (type) {
            case "image":
                return { resourceType: "image" as const, maxFileSize: 10 * 1024 * 1024, folderName: "images" };
            case "video":
                return { resourceType: "video" as const, maxFileSize: 200 * 1024 * 1024, folderName: "videos" };
            case "audio":
                // Cloudinary treats audio as "video"
                return { resourceType: "video" as const, maxFileSize: 50 * 1024 * 1024, folderName: "audio" };
            case "document":
                return { resourceType: "raw" as const, maxFileSize: 25 * 1024 * 1024, folderName: "documents" };
            default:
                return { resourceType: "auto" as const, maxFileSize: 100 * 1024 * 1024, folderName: "uploads" };
        }
    }

    private buildFolder(baseFolder: string | undefined, typeFolder: string, userId: string) {
        return baseFolder
            ? `${baseFolder}/${typeFolder}/${userId}`
            : `${typeFolder}/${userId}`;
    }

    private uploadUrl(resourceType: CloudinaryResourceType) {
        return `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`;
    }

    /** Generic signature for any media type */
    public generateUploadSignature(options: UploadSignatureOptions): SignatureResponse {
        const timestamp = this.now();
        const { resourceType, maxFileSize, folderName } = this.resolveUploadConfig(options.type);
        const folder = this.buildFolder(options.folder, folderName, options.userId);

        const paramsToSign: Record<string, any> = { timestamp, folder };
        if (options.publicId) paramsToSign.public_id = options.publicId;

        return {
            signature: this.sign(paramsToSign),
            timestamp,
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            folder,
            resourceType,
            maxFileSize,
            publicId: options.publicId,
            uploadUrl: this.uploadUrl(resourceType),
        };
    }

    /** Temp chat media (moved/saved later by saveChatMedia) */
    public generateTempMediaSignature(
        userId: string,
        type: UploadSignatureOptions["type"]
    ): SignatureResponse {
        const timestamp = this.now();
        const { resourceType, maxFileSize, folderName } = this.resolveUploadConfig(type);
        const folder = `sudachat/temp/${folderName}/${userId}`;

        const paramsToSign = { timestamp, folder };

        return {
            signature: this.sign(paramsToSign),
            timestamp,
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            folder,
            resourceType,
            maxFileSize,
            uploadUrl: this.uploadUrl(resourceType),
        };
    }

    /** Profile picture (overwrites the previous avatar) */
    public generateProfilePictureSignature(userId: string): SignatureResponse {
        const timestamp = this.now();
        const folder = `profile_pictures/${userId}`;
        const publicId = `${folder}/avatar`;

        const paramsToSign = {
            timestamp,
            folder,
            public_id: publicId,
            overwrite: true,
            invalidate: true,
        };

        return {
            signature: this.sign(paramsToSign),
            timestamp,
            cloudName: this.cloudName,
            apiKey: this.apiKey,
            folder,
            resourceType: "image",
            maxFileSize: 5 * 1024 * 1024,
            publicId,
            overwrite: true,
            invalidate: true,
            uploadUrl: this.uploadUrl("image"),
        };
    }

    public async deleteFile(
        publicId: string,
        resourceType: CloudinaryResourceType = "image"
    ): Promise<void> {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });
    }
}

export default new CloudinaryService();


