
import dotenv from "dotenv";
import http from 'http';
import app from "./src/app.js";
import connect_db from "./src/config/db.js";
import SocketService from "./src/services/socket.services.js";




dotenv.config();

connect_db();



const server = http.createServer(app);

const socket = new SocketService(server);

app.set('socket',socket)

// const socket_io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL,
//     methods: ["GET", "POST"],
//     // allowedHeaders: ["Authorization"],
//     extraHeaders: {
//       "Access-Control-Allow-Origin": "*"
//     }, // If using auth headers
//     credentials: true // Only needed if using cookies/auth
//   }
// });




// deleting expired statuses and related files from cloudinary

// cron.schedule('*/30 * * * *', async () => {

//   const expireTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
//   const expiredStatus = await Status.find({ createdAt: { $lt: expireTime } }).populate('file')

//   for (const status of expiredStatus) {
//     try {
//       if (status.type === 'MEDIA' && status.file) {
//         await cloudinary.uploader.destroy(status.mediaMeta.fileURLId);
//         await Media.findByIdAndDelete(status.mediaMeta._id);
//       };
//       await status.deleteOne();
//     }
//     catch {

//     }
//   }

// });

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`server is listening to port ${PORT}`);
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the other process or use a different port.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', err);
    process.exit(1);
  }
});