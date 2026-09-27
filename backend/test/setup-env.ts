import "dotenv/config";

// The units under test never query the database; config only needs these to be present at import time.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "test-secret";
process.env.ENABLE_JOBS = "false";
