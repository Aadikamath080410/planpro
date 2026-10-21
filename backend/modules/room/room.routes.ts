import { Router } from 'express';
import * as roomController from './room.controller';

const router = Router();

router.post('/', roomController.createRoom);
router.get('/:id', roomController.getRoom);
router.put('/:id', roomController.updateRoom);

export default router;
