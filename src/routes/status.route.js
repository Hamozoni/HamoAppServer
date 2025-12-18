import {Router} from 'express';
import { getAllStatus } from '../controllers/status.controller.js';
// import uploadMiddleware from '../middleware/upload.middleware.js';


const router = Router();


router.route('/')
.get(getAllStatus)

export default router