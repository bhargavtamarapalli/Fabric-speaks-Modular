import express from 'express';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from '@fs/shared';

const app = express();
const port = process.env.PORT || 4006;

app.use(express.json());
app.use(cookieParser());

import orderRoutes from './routes/order.routes';
app.use('/api', orderRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'order-service' });
});

app.use(globalErrorHandler);

app.listen(port, () => {
  console.log(`Order Service running on port ${port}`);
});
