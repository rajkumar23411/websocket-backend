import arcjet, { detectBot, shield, slidingWindow } from "@arcjet/node";

const arcjetKey = process.env.ARCJET_API_KEY;
const arcjetMode = process.env.ARCJET_MODE === "DRY_RUN" ? "DRY_RUN" : "LIVE";

if (!arcjetKey) {
    throw new Error("ARCJET_API_KEY is required");
}

const baseRules = [
    shield({ mode: arcjetMode }),
    detectBot({
        mode: arcjetMode,
        allow: ["CATEGORY:SEARCH_ENGINE", "CATEGORY:PREVIEW"],
    }),
    slidingWindow({ mode: arcjetMode, interval: "10s", max: 50 }),
];

export const httpArcjet = arcjet({
    apiKey: arcjetKey,
    mode: arcjetMode,
    rules: baseRules,
});

export const socketArcjet = arcjet({
    apiKey: arcjetKey,
    mode: arcjetMode,
    rules: baseRules,
});

export const securityMiddleware = () => {
    return async (req, res, next) => {
        try {
            const decision = await httpArcjet.protect(req);

            if (decision.isDenied()) {
                if (decision.reason.isRateLimit()) {
                    console.log(
                        "Rate Limit Exceeded:",
                        decision.reason.details
                    );
                    return res.status(429).json({
                        error: "Too Many Requests.",
                    });
                }

                return res.status(403).json({
                    error: "Forbidden.",
                });
            }
        } catch (error) {
            console.log("Arcject Middleware Error:", error);
            return res.status(500).json({
                error: "Service Unavailable.",
            });
        }

        next();
    };
};
