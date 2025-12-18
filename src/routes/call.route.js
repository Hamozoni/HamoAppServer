import { Router } from "express";
import { getCalls } from "../controllers/call.controller.js";

const router = Router();

router.route('/')
    .get(getCalls)

export default router