#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { createApp } from "./index.js";

const port = parseInt(process.env.PORT ?? "3456", 10);
const dbPath = process.env.DB_PATH ?? "appfeed.db";

const { app } = createApp(undefined);
// Re-create with file-backed DB for production
import { createDb } from "./db.js";
const db = createDb(dbPath);
const { app: prodApp } = createApp(db);

serve({ fetch: prodApp.fetch, port }, () => {
  console.log(`🚀 AppFeed server running on http://localhost:${port}`);
});
