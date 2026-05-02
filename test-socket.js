const { io } = require("socket.io-client");

const socket = io("http://localhost:3030", {
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("Connected with ID:", socket.id);
  socket.emit("join", "user_1");
  console.log("Joined room user_1");
});

socket.on("notification:new", (data) => {
  console.log("RECEIVED notification:new", data);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});

setTimeout(() => {
  console.log("Test timeout, closing...");
  socket.close();
  process.exit(0);
}, 20000);
