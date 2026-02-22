import { Router } from "express";

import { db } from "../database/database.js";
import { commentary } from "../database/schema.js";
import { matchIdSchema } from "../validation/matches.js";
import {
    createCommentarySchema,
    listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

commentaryRouter.post("/", async (req, res) => {
    const paramsResult = matchIdSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({
            error: "Invalid match ID.",
            details: paramsResult.error.issues,
        });
    }

    const bodyResult = createCommentarySchema.safeParse(req.body);

    if (!bodyResult.success) {
        return res.status(400).json({
            error: "Invalid payload.",
            details: bodyResult.error.issues,
        });
    }

    try {
        const { minute, ...rest } = bodyResult.data;

        const [result] = await db
            .insert(commentary)
            .values({
                matchId: paramsResult.data.matchId,
                minute,
                ...rest,
            })
            .returning();

        if (req.app.locals.broadcastCommentary) {
            req.app.locals.broadcastCommentary(
                paramsResult.data.matchId,
                result
            );
        }

        res.status(201).json({
            message: "Commentary created successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Failed to create commentary.", error);
        return res.status(500).json({
            error: "Internal server error.",
            details: error.message,
        });
    }
});

commentaryRouter.get("/", async (req, res) => {
    const paramsResult = matchIdSchema.safeParse(req.params);

    if (!paramsResult.success) {
        return res.status(400).json({
            error: "Invalid match ID.",
            details: paramsResult.error.issues,
        });
    }

    const queryResult = listCommentaryQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
        return res.status(400).json({
            error: "Invalid query.",
            details: queryResult.error.issues,
        });
    }

    try {
        const { matchId } = paramsResult.data;
        const { limit } = queryResult.data;

        const safeLimit = Math.min(limit ?? 50, MAX_LIMIT);

        const result = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(safeLimit);

        if (!result.length) {
            return res.status(404).json({
                error: "No commentary found.",
            });
        }

        return res.status(200).json({
            message: "Commentary listed successfully.",
            data: result,
        });
    } catch (error) {
        console.error("Failed to list commentary.", error);
        return res.status(500).json({
            error: "Internal server error.",
            details: error.message,
        });
    }
});
