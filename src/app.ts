import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from 'dotenv';
// import helmet from 'helmet';
// import xss from 'xss-clean';
// import ExpressMongoSanitize from 'express-mongo-sanitize';

config();

const app = express();

app.use(express.json());
// app.use(ExpressMongoSanitize());
// app.use(helmet());
// app.use(xss());

app.use(cors({
  origin: "http://172.20.10.2:8081",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use('/api', routes);
export default app;