/// <reference path="./types/express.d.ts" />
import express from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({ origin: config.cors.allowedOrigins }));
app.use(express.json({ limit: '10mb' }));

app.use(routes);
app.use(errorHandler);

export default app;
