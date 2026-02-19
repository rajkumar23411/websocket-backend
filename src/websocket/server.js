import { WebSocketServer } from "ws";
import { WebSocket } from "ws";

function sendJSON(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return false;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        sendJSON(client, payload);
    }
}

export function attachWebSocketServer(server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws",
        maxPayload: 1024 * 1024 * 10,
    });

    wss.on("connection", (socket) => {
        sendJSON(socket, {
            type: "welcome",
            message: "Welcome to the websocket server",
        });

        socket.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, {
            type: "match_created",
            match,
        });
    }

    return {
        broadcastMatchCreated,
    };
}
