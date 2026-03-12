import { Pool } from "pg";

declare global {
    // eslint-disable-next-line no-var
    var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL não foi definida no arquivo .env.local");
}

export const pool =
    global.pgPool ??
    new Pool({
        connectionString,
        ssl:
            process.env.DATABASE_SSL === "true"
                ? { rejectUnauthorized: false }
                : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    });

if (process.env.NODE_ENV !== "production") {
    global.pgPool = pool;
}