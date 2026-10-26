// import cloudinary from "../config/cloudinary.js";
// import dotenv from "dotenv";
// dotenv.config();

// export type CloudinaryResourceType = "image" | "video" | "raw" | "auto";

// export interface UploadSignatureOptions {
//     userId: string;
//     type: "image" | "video" | "audio" | "document";
//     folder?: string;
//     publicId?: string;
// }

// interface SignatureResponse {
//     signature: string;
//     timestamp: number;
//     cloudName: string;
//     apiKey: string;
//     folder: string;
//     resourceType: CloudinaryResourceType;
//     maxFileSize: number;
//     publicId?: any;
//     uploadUrl: string;
// }

// class CloudinaryService {

//     private cloudName = process.env.CLOUDINARY_NAME!;
//     private apiKey = process.env.CLOUDINARY_API_KEY!;
//     private apiSecret = process.env.CLOUDINARY_API_SECRET!;


//     /**
//      * Main entry to generate upload signature
//      */
//     public generateUploadSignature(
//         options: UploadSignatureOptions
//     ): SignatureResponse {
//         const timestamp = Math.round(Date.now() / 1000);

//         const {
//             resourceType,
//             maxFileSize,
//             folderName,
//         } = this.resolveUploadConfig(options.type);

//         const uploadFolder = this.buildFolder(
//             options.folder,
//             folderName,
//             options.userId
//         );

//         const paramsToSign: Record<string, any> = {
//             timestamp,
//             folder: uploadFolder,
//             resource_type: resourceType,
//             max_file_size: maxFileSize,
//         };

//         if (options.publicId) {
//             paramsToSign.public_id = options.publicId;
//         }

//         const signature = cloudinary.utils.api_sign_request(
//             paramsToSign,
//             this.apiSecret
//         );

//         return {
//             signature,
//             timestamp,
//             cloudName: this.cloudName,
//             apiKey: this.apiKey,
//             folder: uploadFolder,
//             resourceType,
//             maxFileSize,
//             publicId: options.publicId,
//             uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
//         };
//     }

//     /**
//      * Map logical type → Cloudinary config
//      */
//     private resolveUploadConfig(type: UploadSignatureOptions["type"]) {
//         switch (type) {
//             case "image":
//                 return {
//                     resourceType: "image" as const,
//                     maxFileSize: 10 * 1024 * 1024, // 10MB
//                     folderName: "images",
//                 };

//             case "video":
//                 return {
//                     resourceType: "video" as const,
//                     maxFileSize: 200 * 1024 * 1024, // 200MB
//                     folderName: "videos",
//                 };

//             case "audio":
//                 return {
//                     resourceType: "video" as const, // Cloudinary treats audio as video
//                     maxFileSize: 50 * 1024 * 1024, // 50MB
//                     folderName: "audio",
//                 };

//             case "document":
//                 return {
//                     resourceType: "raw" as const,
//                     maxFileSize: 25 * 1024 * 1024, // 25MB
//                     folderName: "documents",
//                 };

//             default:
//                 return {
//                     resourceType: "auto" as const,
//                     maxFileSize: 100 * 1024 * 1024,
//                     folderName: "uploads",
//                 };
//         }
//     }

//     // inside CloudinaryService class

//     public generateProfilePictureSignature(userId: string) {
//         const timestamp = Math.round(Date.now() / 1000);
//         const folder = `profile_pictures/${userId}`;
//         const publicId = `${folder}/avatar`;

//         const paramsToSign: Record<string, any> = {
//             timestamp,
//             folder,
//             public_id: publicId,
//             overwrite: true,
//             invalidate: true,
//         };

//         const signature = cloudinary.utils.api_sign_request(paramsToSign, this.apiSecret);

//         return {
//             timestamp,
//             folder,
//             overwrite: true,
//             invalidate: true,
//             cloudName: this.cloudName,
//             publicId,
//             signature,
//             apiKey: this.apiKey,
//             uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`
//         };
//     }


//     private buildFolder(
//         baseFolder: string | undefined,
//         typeFolder: string,
//         userId: string
//     ) {
//         if (baseFolder) {
//             return `${baseFolder}/${typeFolder}/${userId}`;
//         }

//         return `${typeFolder}/${userId}`;
//     };

//     // Add this method to your CloudinaryService class

//     public generateTempMediaSignature(
//         userId: string,
//         type: UploadSignatureOptions["type"]
//     ): SignatureResponse {
//         const timestamp = Math.round(Date.now() / 1000);
//         const { resourceType, maxFileSize, folderName } = this.resolveUploadConfig(type);
//         const folder = `sudachat/temp/${folderName}/${userId}`;

//         // ✅ Sign only folder — same minimal approach as profile picture
//         const paramsToSign: Record<string, any> = {
//             timestamp,
//             folder
//         };

//         const signature = cloudinary.utils.api_sign_request(
//             paramsToSign,
//             this.apiSecret
//         );

//         return {
//             signature,
//             timestamp,
//             cloudName: this.cloudName,
//             apiKey: this.apiKey,
//             folder,
//             resourceType,
//             maxFileSize,
//             uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/${resourceType}/upload`,
//         };
//     }

//     // Delete a file from Cloudinary by publicId
//     public async deleteFile(
//         publicId: string,
//         resourceType: CloudinaryResourceType = "image"
//     ): Promise<void> {
//         await cloudinary.uploader.destroy(publicId, {
//             resource_type: resourceType,
//             invalidate: true,
//         });
//         console.log(`🗑️ Deleted from Cloudinary: ${publicId}`);
//     }




// };

// export default new CloudinaryService();



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
    publicId?: string;
    overwrite?: boolean;
    invalidate?: boolean;
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


