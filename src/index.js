import express from "express";
import { matchRouter } from "./routes/match.js";
import { attachWebSocketServer } from "./websocket/server.js";
import http from "node:http";
import { securityMiddleware } from "./arcjet.js";
import { commentaryRouter } from "./routes/commentary.js";

const PORT = Number(process.env.PORT ?? 6666);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(securityMiddleware());

// app routes
app.get("/", (req, res) => {
    return res.status(200).json({
        message: "Welcome to websocket backend server.",
    });
});
app.use("/matches", matchRouter);
app.use("/matches/:matchId/commentary", commentaryRouter);

// attach websocket server
const { broadcastMatchCreated, broadcastCommentary } =
    attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
    const baseURL =
        HOST === "0.0.0.0"
            ? `http://localhost:${PORT}`
            : `http://${HOST}:${PORT}`;

    const wsURL = baseURL.replace(/^http(s?):\/\//, "ws$1://");

    console.log(`Server is running on ${baseURL}`);
    console.log(`WebSocket server is running on ${wsURL}/ws`);
});
