const express = require("express");
const http = require("http");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Store connected devices
const connectedDevices = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Register device (helper or elderly)
  socket.on("register", (data) => {
    const { deviceId, deviceType } = data;
    connectedDevices[deviceId] = {
      socketId: socket.id,
      deviceType,
    };
    console.log(`Device registered: ${deviceId} as ${deviceType}`);
    io.emit(
      "deviceStatusChange",
      Object.keys(connectedDevices).map((id) => ({
        deviceId: id,
        deviceType: connectedDevices[id].deviceType,
        online: true,
      }))
    );
  });

  // Initiating call
  socket.on("callUser", (data) => {
    const { elderlyDeviceId, offer } = data;
    const elderlyDevice = connectedDevices[elderlyDeviceId];

    if (elderlyDevice) {
      io.to(elderlyDevice.socketId).emit("incomingCall", {
        offer,
        helperDeviceId: Object.keys(connectedDevices).find(
          (deviceId) => connectedDevices[deviceId].socketId === socket.id
        ),
      });
    }
  });

  // Answering call
  socket.on("answerCall", (data) => {
    const { helperDeviceId, answer } = data;
    const helperDevice = connectedDevices[helperDeviceId];

    if (helperDevice) {
      io.to(helperDevice.socketId).emit("callAnswered", { answer });
    }
  });

  // ICE candidates
  socket.on("iceCandidate", (data) => {
    const { targetDeviceId, candidate } = data;
    const targetDevice = connectedDevices[targetDeviceId];

    if (targetDevice) {
      io.to(targetDevice.socketId).emit("iceCandidate", { candidate });
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // Find and remove the disconnected device
    const deviceId = Object.keys(connectedDevices).find(
      (id) => connectedDevices[id].socketId === socket.id
    );

    if (deviceId) {
      delete connectedDevices[deviceId];
      io.emit("deviceStatusChange", [{ deviceId, online: false }]);
    }
  });
});
app.get("/", (req, res) => {
  res.send("Server is running");
  // Or if you want to serve an HTML file:
  // res.sendFile(__dirname + '/public/index.html');
});
app.use(express.static("public"));
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
