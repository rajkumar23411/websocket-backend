import { Router } from "express";

import { db } from "../database/database.js";
import {
    createMatchSchema,
    listMatchesQuerySchema,
} from "../validation/matches.js";
import { matches } from "../database/schema.js";
import { getMatchStatus } from "../utils/match-status.js";
import { desc } from "drizzle-orm";

const MAX_LIMIT = 100;

export const matchRouter = Router();

matchRouter.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    console.log({
        parsed,
    });

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid query.",
            details: JSON.stringify(parsed.error),
        });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit);

        return res.status(200).json({
            message: "Matches listed successfully.",
            data,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to list matches.",
            details: JSON.stringify(error),
        });
    }
});

matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    const { startTime, endTime, homeScore, awayScore } = parsed?.data || {};

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid payload.",
            details: JSON.stringify(parsed.error),
        });
    }

    try {
        const [event] = await db
            .insert(matches)
            .values({
                ...parsed.data,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore ?? 0,
                awayScore: awayScore ?? 0,
                status: getMatchStatus(startTime, endTime),
            })
            .returning();

        res.status(201).json({
            message: "Match created successfully.",
            data: event,
        });
    } catch (error) {
        return res.status(500).json({
            error: "Internal server error.",
            details: JSON.stringify(error),
        });
    }
});
