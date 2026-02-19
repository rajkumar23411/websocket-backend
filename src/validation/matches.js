import { z } from "zod";

export const MATCH_STATUS = {
    SCHEDULED: "scheduled",
    LIVE: "live",
    FINISHED: "finished",
};

const isoDateString = z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid ISO date string",
});

export const createMatchSchema = z
    .object({
        sport: z.string().min(1),
        homeTeam: z.string().min(1),
        awayTeam: z.string().min(1),
        startTime: isoDateString,
        endTime: isoDateString,
        homeScore: z.coerce.number().int().nonnegative().optional(),
        awayScore: z.coerce.number().int().nonnegative().optional(),
    })
    .superRefine((data, ctx) => {
        const start = new Date(data.startTime);
        const end = new Date(data.endTime);
        if (start > end) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Start time must be before end time",
                path: ["endTime"],
            });
        }
    });

export const updateScoreSchema = z.object({
    homeScore: z.coerce.number().int().nonnegative(),
    awayScore: z.coerce.number().int().nonnegative(),
});

export const listMatchesQuerySchema = z.object({
    sport: z.string().min(1).optional(),
    homeTeam: z.string().min(1).optional(),
    awayTeam: z.string().min(1).optional(),
    status: z.nativeEnum(MATCH_STATUS).optional(),
    startTime: isoDateString.optional(),
    endTime: isoDateString.optional(),
});
