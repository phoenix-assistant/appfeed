#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { validateFeed, type AppFeed } from "@phoenixaihub/appfeed-spec";

const program = new Command();
const APPFEED_DIR = join(homedir(), ".appfeed");
const FOLLOWING_PATH = join(APPFEED_DIR, "following.json");

function ensureDir() {
  if (!existsSync(APPFEED_DIR)) mkdirSync(APPFEED_DIR, { recursive: true });
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function getFollowing(): string[] {
  ensureDir();
  if (!existsSync(FOLLOWING_PATH)) return [];
  return JSON.parse(readFileSync(FOLLOWING_PATH, "utf-8"));
}

function saveFollowing(urls: string[]) {
  ensureDir();
  writeFileSync(FOLLOWING_PATH, JSON.stringify([...new Set(urls)], null, 2));
}

program.name("appfeed").description("AppFeed CLI — discover, publish, and install micro-apps").version("0.1.0");

// --- init ---
program.command("init").description("Create feed.json from package.json").action(() => {
  const pkgPath = join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) {
    console.error("No package.json found in current directory");
    process.exit(1);
  }
  const pkg = readJson(pkgPath) as Record<string, unknown>;
  const feed: AppFeed = {
    title: `${pkg.name ?? "my-feed"}`,
    description: (pkg.description as string) ?? "",
    author: typeof pkg.author === "string" ? pkg.author : "unknown",
    updated: new Date().toISOString(),
    entries: [
      {
        name: (pkg.name as string) ?? "my-tool",
        version: (pkg.version as string) ?? "0.0.1",
        description: (pkg.description as string) ?? "",
        author: typeof pkg.author === "string" ? pkg.author : "unknown",
        install: `npm install ${pkg.name ?? "my-tool"}`,
        tags: Array.isArray(pkg.keywords) ? (pkg.keywords as string[]) : [],
        platforms: ["any"],
        category: "uncategorized",
      },
    ],
  };
  writeFileSync("feed.json", JSON.stringify(feed, null, 2));
  console.log("✅ Created feed.json");
});

// --- validate ---
program.command("validate").description("Validate feed.json").argument("[file]", "Path to feed.json", "feed.json").action((file: string) => {
  if (!existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  const data = readJson(file);
  const result = validateFeed(data);
  if (result.valid) {
    console.log("✅ Valid feed");
  } else {
    console.error("❌ Invalid feed:");
    result.errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
});

// --- publish ---
program.command("publish").description("Publish feed to a registry").requiredOption("--registry <url>", "Registry URL").action(async (opts: { registry: string }) => {
  const data = readJson("feed.json");
  const result = validateFeed(data);
  if (!result.valid) {
    console.error("❌ Invalid feed:", result.errors.join(", "));
    process.exit(1);
  }
  const res = await fetch(`${opts.registry}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.ok) {
    console.log("✅ Published");
  } else {
    console.error(`❌ Publish failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
});

// --- search ---
program.command("search").description("Search the registry").argument("<query>", "Search query").requiredOption("--registry <url>", "Registry URL").action(async (query: string, opts: { registry: string }) => {
  const res = await fetch(`${opts.registry}/search?q=${encodeURIComponent(query)}`);
  const data = (await res.json()) as Array<{ name: string; description: string; version: string; author: string }>;
  if (!data.length) {
    console.log("No results found.");
    return;
  }
  for (const item of data) {
    console.log(`${item.name}@${item.version} — ${item.description} (by ${item.author})`);
  }
});

// --- install ---
program.command("install").description("Install a tool by running its install command").argument("<tool>", "Tool name").option("--registry <url>", "Registry URL").action(async (tool: string, opts: { registry?: string }) => {
  if (opts.registry) {
    const res = await fetch(`${opts.registry}/search?q=${encodeURIComponent(tool)}`);
    const data = (await res.json()) as Array<{ name: string; install: string }>;
    const match = data.find((d) => d.name === tool);
    if (!match) {
      console.error(`Tool "${tool}" not found in registry`);
      process.exit(1);
    }
    console.log(`Running: ${match.install}`);
    execSync(match.install, { stdio: "inherit" });
  } else {
    // Try local feed.json
    if (!existsSync("feed.json")) {
      console.error("No feed.json found and no --registry specified");
      process.exit(1);
    }
    const feed = readJson("feed.json") as AppFeed;
    const entry = feed.entries.find((e) => e.name === tool);
    if (!entry) {
      console.error(`Tool "${tool}" not found in feed.json`);
      process.exit(1);
    }
    console.log(`Running: ${entry.install}`);
    execSync(entry.install, { stdio: "inherit" });
  }
});

// --- follow ---
program.command("follow").description("Follow an author's feed URL").argument("<url>", "Author feed URL").action((url: string) => {
  const following = getFollowing();
  following.push(url);
  saveFollowing(following);
  console.log(`✅ Following ${url}`);
});

// --- feed ---
program.command("feed").description("Aggregate updates from followed feeds").action(async () => {
  const following = getFollowing();
  if (!following.length) {
    console.log("Not following anyone. Use `appfeed follow <url>` to add feeds.");
    return;
  }
  const allEntries: Array<{ name: string; version: string; description: string; author: string; source: string }> = [];
  for (const url of following) {
    try {
      const res = await fetch(url);
      const feed = (await res.json()) as AppFeed;
      for (const entry of feed.entries) {
        allEntries.push({ ...entry, source: url });
      }
    } catch {
      console.error(`⚠️ Failed to fetch ${url}`);
    }
  }
  if (!allEntries.length) {
    console.log("No entries found.");
    return;
  }
  for (const e of allEntries) {
    console.log(`${e.name}@${e.version} — ${e.description} (by ${e.author})`);
  }
});

// --- export ---
program.command("export").description("Export followed feeds").option("--format <format>", "Output format: opml or json", "json").action((opts: { format: string }) => {
  const following = getFollowing();
  if (opts.format === "opml") {
    const items = following.map((u) => `    <outline type="rss" xmlUrl="${u}" />`).join("\n");
    console.log(`<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>AppFeed Subscriptions</title></head>\n  <body>\n${items}\n  </body>\n</opml>`);
  } else {
    console.log(JSON.stringify(following, null, 2));
  }
});

program.parse();
