import { Router } from 'express';
import authRoute from "./auth.route.js";
import cloudinaryRoute from "./cloudinary.route.js";
import profileRoute from "./profile.route.js";
import contactRoute from "./contact.route.js";
import fileRoute from "./file.route.js";

const router = Router();

router.use('/auth', authRoute);
router.use('/cloudinary', cloudinaryRoute);
router.use('/profile', profileRoute);
router.use('/contacts', contactRoute);
router.use('/file', fileRoute);

export default router;
