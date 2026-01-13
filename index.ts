
import dotenv from "dotenv";
import http from 'http';
import app from "./src/app.js";
import connect_db from "./src/config/db.js";



dotenv.config();

connect_db();



const server = http.createServer(app);

// const socket = new SocketService(server);

// app.set('socket', socket);

const PORT = process.env.PORT || 5500;

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