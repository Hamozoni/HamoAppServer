import { Router } from 'express';
import authRoute from "./auth.route.js";
import cloudinaryRoute from "./cloudinary.route.js";

const router = Router();

router.use('/auth', authRoute);
router.use('/cloudinary', cloudinaryRoute);

export default router;
