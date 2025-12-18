
import dotenv from "dotenv";
import http from 'http';
import cron from 'node-cron'

import app from "./src/app.js";
import { Server } from "socket.io";
import connect_db from "./src/config/db.js";

// importing Status and file models for deleting expired status
import Status from "./src/models/status.model.js";
import Media from "./src/models/media.model.js";

import cloudinary from "./src/config/cloudinary.js";



dotenv.config();

connect_db();



const server = http.createServer(app);

const socket_io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    // allowedHeaders: ["Authorization"],
    extraHeaders: {
      "Access-Control-Allow-Origin": "*"
    }, // If using auth headers
    credentials: true // Only needed if using cookies/auth
  }
});

// app.set('io', socket_io);

const online_users = new Map();

// handling socket io emmits

socket_io.on('connection', socket => {

  const { user_id } = socket.handshake.auth;

});



// deleting expired statuses and related files from cloudinary

cron.schedule('*/30 * * * *', async () => {

  const expireTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const expiredStatus = await Status.find({ createdAt: { $lt: expireTime } }).populate('file')

  for (const status of expiredStatus) {
    try {
      if (status.type === 'MEDIA' && status.file) {
        await cloudinary.uploader.destroy(status.mediaMeta.fileURLId);
        await Media.findByIdAndDelete(status.mediaMeta._id);
      };
      await status.deleteOne();
    }
    catch {

    }
  }

});

server.listen(process.env.PORT, () => {
  console.log(`server is listening to port ${process.env.PORT}`);
});