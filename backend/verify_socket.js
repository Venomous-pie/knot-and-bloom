import { io } from "socket.io-client";

const socket = io("http://localhost:3030");

socket.on("connect", () => {
    console.log("Connected to WebSocket Server:", socket.id);
});

socket.on("product:updated", (data) => {
    console.log("EVENT RECEIVED: product:updated", data);
});

socket.on("disconnect", () => {
    console.log("Disconnected from WebSocket Server");
});

// Keep alive
setInterval(() => {}, 1000);
