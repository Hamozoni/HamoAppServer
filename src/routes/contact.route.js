
import { Router } from 'express';
import { getAllContactsController, getContactController } from '../controllers/contact.controller.js';


const router = Router();


router.route('/')
    .get(getAllContactsController)

router.route('/:email')
    .get(getContactController)

export default router;


