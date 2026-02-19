import { WebSocketServer, WebSocket } from "ws";
import { socketArcjet } from "../arcjet.js";

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

    wss.on("connection", async (socket) => {
        if (socketArcjet) {
            try {
                const decision = await socketArcjet.protect(socket);

                if (decision.isDenied()) {
                    const code = decision.reason.isRateLimit() ? 1013 : 1008;
                    const reason = decision.reason.isRateLimit()
                        ? "Too Many Requests."
                        : "Access Denied.";

                    socket.close(code, reason);
                    return;
                }
            } catch (error) {
                console.error("Arcject Middleware Error:", error);
                socket.close(1008, "Service Unavailable.");
            }
        }

        socket.isAlive = true;

        socket.on("pong", () => {
            socket.isAlive = true;
        });

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

    const interval = setInterval(() => {
        for (const client of wss.clients) {
            if (client.isAlive === false) {
                client.terminate();
                continue;
            }
            client.isAlive = false;
            client.ping();
        }
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
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
