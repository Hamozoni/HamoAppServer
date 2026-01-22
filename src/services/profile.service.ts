import fileModel from "../models/file.model.js";
import userModel from "../models/user.model.js";

class ProfileService {

    async updateProfilePicture(userId: string, cloudinaryData: any) {
        // Mark old avatar deleted
        await fileModel.updateMany(
            { ownerId: userId, purpose: "profile_picture" },
            { isDeleted: true }
        );

        const file = await fileModel.create({
            ownerId: userId,
            type: "image",
            purpose: "profile_picture",
            publicId: cloudinaryData.public_id,
            resourceType: "image",
            secureUrl: cloudinaryData.secure_url,
            metadata: {
                width: cloudinaryData.width,
                height: cloudinaryData.height,
                size: cloudinaryData.bytes,
                format: cloudinaryData.format,
                mimeType: cloudinaryData.resource_type + "/" + cloudinaryData.format,
            },
        });

        await userModel.updateOne(
            { _id: userId },
            { profilePictureFileId: file._id }
        );

        return file;
    }

}

export default new ProfileService();
