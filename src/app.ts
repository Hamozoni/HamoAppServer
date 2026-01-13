import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { config } from 'dotenv';

config();

const app = express();

app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // Enable if using cookies/auth
}));


app.use('/api', routes);


export default app;