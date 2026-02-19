import { WebSocketServer, WebSocket } from "ws";

function sendJSON(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return false;

    try {
        socket.send(JSON.stringify(payload));
        return true;
    } catch (error) {
        console.error("Failed to send JSON to WebSocket.", error);
        return false;
    }
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

        socket.on("close", (code, reason) => {
            console.log(`WebSocket closed: code=${code}, reason=${reason}`);
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
