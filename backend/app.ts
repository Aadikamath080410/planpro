import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import roomRoutes from './modules/room/room.routes';
import arRoutes from './modules/ar/ar.routes';
import ecommerceRoutes from './modules/ecommerce/ecommerce.routes';
import aiRoutes from './modules/ai/ai.routes';
import comparisonRoutes from './modules/comparison/comparison.routes';

const app = express();

// Global Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Routes Mounting
app.use('/api/rooms', roomRoutes);
app.use('/api/ar', arRoutes);
app.use('/api/ecommerce', ecommerceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/comparison', comparisonRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
