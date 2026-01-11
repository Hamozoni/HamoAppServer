import { Router } from 'express';
import { getAllStatus } from '../controllers/status.controller.js';

const router = Router();

router.route('/')
    .get(getAllStatus);

export default router;
