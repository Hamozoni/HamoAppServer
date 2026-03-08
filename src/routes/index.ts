import { Router } from 'express';
import authRoutes from "./auth.route.js";
import cloudinaryRoutes from "./cloudinary.route.js";
import profileRoutes from "./profile.route.js";
import contactRoutes from "./contact.route.js";
import fileRoutes from "./file.route.js";
import messageRoutes from "./message.route.js"

const router = Router();

router.use('/auth', authRoutes);
router.use('/cloudinary', cloudinaryRoutes);
router.use('/profile', profileRoutes);
router.use('/contacts', contactRoutes);
router.use('/file', fileRoutes);
router.use("/messages", messageRoutes);
export default router;
