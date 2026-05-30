import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import patientRouter from './routes/patientRouter.js';
import doctorRouter from './routes/doctorRouter.js';
import appointmentRouter from './routes/appointmentRouter.js';
import authRouter from './routes/authRouter.js';
import hospitalRouter from './routes/hospitalRouter.js';
import visitorCounterRouter from './routes/visitorCounterRouter.js';
import ambulanceRouter from './routes/ambulanceRoutes.js';
import emergencyRouter from './routes/emergencyRouter.js';
import bloodBankRouter from './routes/bloodBankRoutes.js';
import bloodRequestRouter from './routes/bloodRequestRoutes.js';
import donorRouter from './routes/donorRoutes.js';
import dbConnect from './utils/dbConnect.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
dotenv.config({ path: path.join(currentDirPath, '.env') });

const localOrigins = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:5173',
  'http://localhost:5174',
];

const envOrigins = [
  ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : []),
  process.env.FRONTEND_URL,
]
  .map((origin) => String(origin || '').trim())
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...localOrigins, ...envOrigins]));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Welcome to the Doctor Appointment System! [v2]');
});

app.use('/patients', patientRouter);
app.use('/doctors', doctorRouter);
app.use('/appointments', appointmentRouter);
app.use('/auth', authRouter);
app.use('/hospitals', hospitalRouter);
app.use('/visitor-counter', visitorCounterRouter);
app.use('/api/ambulances', ambulanceRouter);
app.use('/api/emergency', emergencyRouter);
app.use('/api/bloodbanks', bloodBankRouter);
app.use('/api/blood-requests', bloodRequestRouter);
app.use('/api/donors', donorRouter);

// ===== SOCKET.IO EVENT HANDLERS =====
const connectedUsers = new Map(); // { userId: { socketId, role, rooms } }

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // User joins with authentication
  socket.on('user:register', ({ userId, role, appointmentId, doctorId }) => {
    connectedUsers.set(userId, {
      socketId: socket.id,
      role,
      appointments: appointmentId ? [appointmentId] : [],
      doctors: doctorId ? [doctorId] : [],
    });

    // Join rooms for real-time updates
    if (appointmentId) socket.join(`appointment:${appointmentId}`);
    if (doctorId) socket.join(`doctor:${doctorId}`);
    if (role === 'patient' && userId) socket.join(`patient:${userId}`);
    if (role === 'doctor' && userId) socket.join(`doctor:${userId}`);
    if (role === 'hospital' && userId) socket.join(`hospital:${userId}`);
    if (role === 'driver' && userId) socket.join(`ambulance:${userId}`);
    if (role === 'hospital') socket.join('hospitals:blood');
    if (role === 'doctor') socket.join(`doctors:availability`);
    if (role === 'admin') socket.join(`admin:notifications`);

    console.log(`👤 User registered: ${userId} (${role})`);
  });

  // Listen for appointment status updates
  socket.on('appointment:updateStatus', (data) => {
    // This will be emitted from controllers after DB update
    io.to(`appointment:${data.appointmentId}`).emit('appointment:statusChanged', {
      appointmentId: data.appointmentId,
      status: data.status,
      updatedAt: new Date(),
    });
  });

  // Listen for doctor availability changes
  socket.on('doctor:updateAvailability', (data) => {
    io.to(`doctor:${data.doctorId}`).emit('doctor:availabilityChanged', {
      doctorId: data.doctorId,
      available: data.available,
      reason: data.reason,
      updatedAt: new Date(),
    });

    // Notify all connected users about doctor availability
    io.to('doctors:availability').emit('doctor:available', {
      doctorId: data.doctorId,
      available: data.available,
    });
  });

  // User leaves/disconnects
  socket.on('disconnect', () => {
    for (const [userId, data] of connectedUsers.entries()) {
      if (data.socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`❌ User disconnected: ${userId}`);
        break;
      }
    }
  });
});

// Export io instance for use in controllers
export { io, connectedUsers };

const startServer = async () => {
  try {
    await dbConnect();

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 Socket.io ready for real-time updates`);
    });
  } catch (error) {
    console.error('Server startup failed:', error?.message || error);
    process.exit(1);
  }
};

startServer();