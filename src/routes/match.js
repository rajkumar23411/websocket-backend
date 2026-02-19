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

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid query.",
            details: parsed.error.issues,
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
        console.error("Failed to list matches.", error);
        return res.status(500).json({
            error: "Internal server error.",
        });
    }
});

matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            error: "Invalid payload.",
            details: parsed.error.issues,
        });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed?.data || {};

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

        if (req.app.locals.broadcastMatchCreated) {
            req.app.locals.broadcastMatchCreated(event);
        }

        res.status(201).json({
            message: "Match created successfully.",
            data: event,
        });
    } catch (error) {
        console.error("Failed to create match.", error);
        return res.status(500).json({
            error: "Internal server error.",
        });
    }
});
