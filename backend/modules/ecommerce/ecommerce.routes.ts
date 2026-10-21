import { Router } from 'express';

const router = Router();

router.get('/products', (req, res) => res.json({ message: 'Products placeholder' }));
router.get('/cart', (req, res) => res.json({ message: 'Cart placeholder' }));

export default router;
