import express from "express";
import { matchRouter } from "./routes/match.js";
import { attachWebSocketServer } from "./websocket/server.js";
import http from "node:http";

const PORT = Number(process.env.PORT ?? 6666);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = express();

const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World");
});

// app routes
app.use("/matches", matchRouter);

// attach websocket server
const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
    const baseURL =
        HOST === "0.0.0.0"
            ? `http://localhost:${PORT}`
            : `http://${HOST}:${PORT}`;
    const wsURL = baseURL.replace("http://", "ws://");

    console.log(`Server is running on ${baseURL}`);
    console.log(`WebSocket server is running on ${wsURL}/ws`);
});
