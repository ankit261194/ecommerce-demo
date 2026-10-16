const { Server } = require('socket.io');

let io = null;
const activeTrackingRooms = new Map(); // orderId -> Set of socket IDs

/**
 * Initialize Socket.io server attached to HTTP server instance
 * @param {import('http').Server} httpServer
 */
const init = (httpServer) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  io.on('connection', (socket) => {
    // Client joins order-specific tracking telemetry room
    socket.on('join_tracking_room', ({ orderId, taskId, role }) => {
      const roomKey = `order_${orderId || taskId}`;
      socket.join(roomKey);

      if (!activeTrackingRooms.has(roomKey)) {
        activeTrackingRooms.set(roomKey, new Set());
      }
      activeTrackingRooms.get(roomKey).add(socket.id);

      socket.emit('joined_room', {
        success: true,
        room: roomKey,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        message: `Connected to live telemetry stream for ${roomKey}`,
      });
    });

    // Client leaves room
    socket.on('leave_tracking_room', ({ orderId, taskId }) => {
      const roomKey = `order_${orderId || taskId}`;
      socket.leave(roomKey);
      if (activeTrackingRooms.has(roomKey)) {
        activeTrackingRooms.get(roomKey).delete(socket.id);
        if (activeTrackingRooms.get(roomKey).size === 0) {
          activeTrackingRooms.delete(roomKey);
        }
      }
    });

    // Rider sends live GPS telemetry update directly over socket
    socket.on('rider:ping_location', (payload) => {
      const { orderId, taskId, lat, lng, speed, heading, batteryLevel } = payload || {};
      const roomKey = `order_${orderId || taskId}`;

      const telemetryData = {
        lat: Number(lat),
        lng: Number(lng),
        speed: Number(speed || 0),
        heading: Number(heading || 0),
        batteryLevel: Number(batteryLevel || 100),
        timestamp: new Date().toISOString(),
        isSimulated: Boolean(payload.isSimulated),
      };

      // Broadcast to all clients watching this order/task
      io.to(roomKey).emit('rider:location_update', {
        orderId,
        taskId,
        location: telemetryData,
      });
    });

    socket.on('disconnect', () => {
      // Clean up socket from tracking rooms
      for (const [roomKey, socketSet] of activeTrackingRooms.entries()) {
        if (socketSet.has(socket.id)) {
          socketSet.delete(socket.id);
          if (socketSet.size === 0) {
            activeTrackingRooms.delete(roomKey);
          }
        }
      }
    });
  });

  return io;
};

/**
 * Get active Socket.io instance
 */
const getIO = () => {
  return io;
};

/**
 * Broadcast rider location update to subscribers of an order
 */
const emitRiderLocation = (orderId, locationData) => {
  if (!io) return false;
  const roomKey = `order_${orderId}`;
  io.to(roomKey).emit('rider:location_update', {
    orderId,
    location: locationData,
    timestamp: new Date().toISOString(),
  });
  return true;
};

/**
 * Broadcast order status change to tracking subscribers
 */
const emitOrderStatus = (orderId, statusData) => {
  if (!io) return false;
  const roomKey = `order_${orderId}`;
  io.to(roomKey).emit('order:status_update', {
    orderId,
    status: statusData,
    timestamp: new Date().toISOString(),
  });
  return true;
};

/**
 * Broadcast ETA & distance update to tracking subscribers
 */
const emitEtaUpdate = (orderId, etaData) => {
  if (!io) return false;
  const roomKey = `order_${orderId}`;
  io.to(roomKey).emit('telemetry:eta_update', {
    orderId,
    eta: etaData,
    timestamp: new Date().toISOString(),
  });
  return true;
};

module.exports = {
  init,
  getIO,
  emitRiderLocation,
  emitOrderStatus,
  emitEtaUpdate,
};
