import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalErrorHandler } from '@fs/shared/middleware';
import { cartRouter } from './routes/cart.routes';
import { logger } from '@fs/shared/logger';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
    res.json({ success: true, service: 'cart-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/cart', cartRouter);

// Error Handler
app.use(globalErrorHandler);

const port = env.APP_PORT;
app.listen(port, () => {
    logger.info(`Cart Service listening on port ${port}`);
});

export default app;
