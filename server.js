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
const connectedDevices = {};

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("register", (data) => {
    const { deviceId, deviceType } = data;
    connectedDevices[deviceId] = { socketId: socket.id, deviceType };
    console.log(`Device registered: ${deviceId} as ${deviceType}`);
  });

  socket.on("callUser", (data) => {
    const { elderlyDeviceId, offer } = data;
    const elderlyDevice = connectedDevices[elderlyDeviceId];

    if (elderlyDevice) {
      console.log(`Sending offer to ${elderlyDeviceId}`);
      io.to(elderlyDevice.socketId).emit("incomingCall", {
        offer,
        helperDeviceId: Object.keys(connectedDevices).find(
          (deviceId) => connectedDevices[deviceId].socketId === socket.id
        ),
      });
    }
  });

  socket.on("answerCall", (data) => {
    const { helperDeviceId, answer } = data;
    const helperDevice = connectedDevices[helperDeviceId];

    if (helperDevice) {
      console.log(`Sending answer to ${helperDeviceId}`);
      io.to(helperDevice.socketId).emit("callAnswered", { answer });
    }
  });

  socket.on("iceCandidate", (data) => {
    const { targetDeviceId, candidate } = data;
    const targetDevice = connectedDevices[targetDeviceId];

    if (targetDevice) {
      console.log(`Forwarding ICE candidate to ${targetDeviceId}`);
      io.to(targetDevice.socketId).emit("iceCandidate", { candidate });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const deviceId = Object.keys(connectedDevices).find(
      (id) => connectedDevices[id].socketId === socket.id
    );
    if (deviceId) delete connectedDevices[deviceId];
  });
});

app.get("/", (req, res) => res.send("Server is running"));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
