// Local PostgreSQL for development, no system install needed.
// Uses the user, password, port and database name from DATABASE_URL in .env.
import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const url = new URL(process.env.DATABASE_URL);
const databaseDir = resolve(import.meta.dirname, "../.pgdata");
const database = url.pathname.replace(/^\//, "");

const pg = new EmbeddedPostgres({
  databaseDir,
  user: decodeURIComponent(url.username) || "postgres",
  password: decodeURIComponent(url.password),
  port: Number(url.port || 5432),
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => {},
});

if (!existsSync(resolve(databaseDir, "PG_VERSION"))) {
  console.log("Creating local database cluster in .pgdata ...");
  await pg.initialise();
}

await pg.start();

const client = pg.getPgClient();
await client.connect();
const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
await client.end();
if (exists.rowCount === 0) {
  await pg.createDatabase(database);
  console.log(`Created database "${database}"`);
}

console.log(`PostgreSQL ready on localhost:${url.port || 5432} (database "${database}"). Press Ctrl+C to stop.`);

const shutdown = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
