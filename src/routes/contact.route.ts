import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import contactsController from "../controllers/contacts.cotroller.js";

const router = Router();

router.get("/sync", authMiddleware, contactsController.getContacts);