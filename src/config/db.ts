import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const dbUrl = process.env.DATABASE_URL;
const connect_db = async () => {
    try {
        if (!dbUrl) {
            throw new Error('DATABASE_URL is not defined in environment variables');
        }
        await mongoose.connect(dbUrl);
        console.log("Database connected successfully!");
    } catch (error) {
        console.log("Database connection failed!");
        process.exit(1);

    }
};

export default connect_db;