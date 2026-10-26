import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from 'dotenv';
import helmet from 'helmet';
import xss from 'xss-clean';
import ExpressMongoSanitize from 'express-mongo-sanitize';

config();

const app = express();

app.use(express.json());
app.use(ExpressMongoSanitize());
app.use(helmet());
app.use(xss());

app.use(cors());
process.on('unhandledRejection', (e) => console.error('UNHANDLED REJECTION', e));
process.on('uncaughtException', (e) => console.error('UNCAUGHT EXCEPTION', e));
app.use('/api', routes);
export default app;