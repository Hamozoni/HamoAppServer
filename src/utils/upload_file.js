import cloudinary from "../config/cloudinary.js";
import File from "../models/file.model.js";


export const upload_file = async(file,folder,duration = 0)=> {

          const type = file.mimetype.split('/')[0];
          const resource_type = type === 'image' ? 'image' : type === 'application' ? 'raw' : 'video';

          const result = await new Promise((resolve, reject) => {

                const uploadStream = cloudinary.uploader.upload_stream(
                  {
                    resource_type,  // <–– This is the key!
                    folder: `${folder}/${type}`, // Optional: Organize files in Cloudinary
                  },
                  (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
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
}