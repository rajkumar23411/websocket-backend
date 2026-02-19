import {
    integer,
    jsonb,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

export const matchStatusEnum = pgEnum("match_status", [
    "scheduled",
    "live",
    "finished",
]);

export const matches = pgTable("matches", {
    id: uuid("id").primaryKey().defaultRandom(),
    sport: text("sport").notNull(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    homeScore: integer("home_score").notNull().default(0),
    awayScore: integer("away_score").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentary = pgTable("commentary", {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
        .notNull()
        .references(() => matches.id),
    minute: integer("minute").notNull(),
    sequence: integer("sequence").notNull(),
    period: integer("period").notNull(),
    eventType: text("event_type").notNull(),
    actor: text("actor").notNull(),
    team: text("team").notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});
