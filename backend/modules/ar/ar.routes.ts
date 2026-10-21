import { Router } from 'express';

const router = Router();

router.get('/sessions', (req, res) => res.json({ message: 'AR Sessions placeholder' }));

export default router;
