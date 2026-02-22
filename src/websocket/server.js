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

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        sendJSON(client, payload);
    }
}

const matchSubscribers = new Map();

function subscribe(match_id, socket) {
    if (!matchSubscribers.has(match_id)) {
        matchSubscribers.set(match_id, new Set());
    }

    matchSubscribers.get(match_id).add(socket);
}

function unsubscribe(match_id, socket) {
    const subscribers = matchSubscribers.get(match_id);

    if (!subscribers) return;

    subscribers.delete(socket);

    if (subscribers.size === 0) {
        matchSubscribers.delete(match_id);
    }
}

function cleanUpSubscriptions(socket) {
    for (const match_id of socket.subscriptions) {
        unsubscribe(match_id, socket);
    }

    socket.subscriptions.clear();
}

function broadcastToMatch(match_id, payload) {
    const subscribers = matchSubscribers.get(match_id);

    if (!subscribers || subscribers.size === 0) return;

    const messages = JSON.stringify(payload);

    for (const subscriber of subscribers) {
        if (subscriber.readyState === WebSocket.OPEN) {
            subscriber.send(messages);
        }
    }
}

function broadcastCommentary(match_id, commentary) {
    broadcastToMatch(match_id, {
        type: "commentary",
        commentary,
    });
}

function handleMessage(socket, data) {
    let message;

    try {
        message = JSON.parse(data);
        const matchId = message.match_id ?? message.matchId;

        if (message.type === "subscribe" && matchId) {
            subscribe(matchId, socket);
            socket.subscriptions.add(matchId);
            sendJSON(socket, {
                type: "success",
                message: "Subscribed to match.",
            });
        }

        if (message.type === "unsubscribe" && matchId) {
            unsubscribe(matchId, socket);
            socket.subscriptions.delete(matchId);
            sendJSON(socket, {
                type: "success",
                message: "Unsubscribed from match.",
            });
        }
    } catch (error) {
        console.error("Failed to handle message.", error);
        sendJSON(socket, {
            type: "error",
            message: "Invalid message.",
        });
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

        socket.subscriptions = new Set();

        sendJSON(socket, {
            type: "welcome",
            message: "Welcome to the websocket server",
        });

        socket.on("message", (data) => {
            handleMessage(socket, data);
        });

        socket.on("error", () => {
            socket.terminate();
            cleanUpSubscriptions(socket);
        });

        socket.on("close", (code, reason) => {
            console.log(`WebSocket closed: code=${code}, reason=${reason}`);
            socket.terminate();
            cleanUpSubscriptions(socket);
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
        broadcastToAll(wss, {
            type: "match_created",
            match,
        });
    }

    return {
        broadcastMatchCreated,
        broadcastCommentary,
    };
}
