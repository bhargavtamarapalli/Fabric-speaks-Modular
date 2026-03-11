import express from 'express';
import cookieParser from 'cookie-parser';
import { globalErrorHandler } from '@fs/shared';
import paymentRoutes from './routes/payment.routes';

const app = express();
const port = process.env.PORT || 4007;

app.use(express.json());
app.use(cookieParser());

app.use('/api', paymentRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'payment-service' });
});

app.use(globalErrorHandler);

app.listen(port, () => {
  console.log(`Payment Service running on port ${port}`);
});
