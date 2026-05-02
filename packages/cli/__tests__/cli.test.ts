import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const CLI = join(import.meta.dirname, "..", "dist", "cli.js");
const run = (args: string) => execSync(`node ${CLI} ${args}`, { encoding: "utf-8", cwd: import.meta.dirname });

describe("appfeed cli", () => {
  it("shows help", () => {
    const out = run("--help");
    expect(out).toContain("appfeed");
  });

  it("validates a valid feed", () => {
    const feed = {
      title: "Test",
      author: "test",
      updated: new Date().toISOString(),
      entries: [{ name: "t", version: "1.0.0", description: "d", author: "a", install: "echo hi" }],
    };
    const p = join(import.meta.dirname, "test-feed.json");
    writeFileSync(p, JSON.stringify(feed));
    try {
      const out = run(`validate ${p}`);
      expect(out).toContain("Valid");
    } finally {
      if (existsSync(p)) unlinkSync(p);
    }
  });

  it("rejects invalid feed", () => {
    const p = join(import.meta.dirname, "bad-feed.json");
    writeFileSync(p, JSON.stringify({ bad: true }));
    try {
      execSync(`node ${CLI} validate ${p}`, { encoding: "utf-8", cwd: import.meta.dirname });
      expect.unreachable("should have thrown");
    } catch (e: unknown) {
      const err = e as { stderr: string };
      expect(err.stderr).toContain("Invalid");
    } finally {
      if (existsSync(p)) unlinkSync(p);
    }
  });
});
