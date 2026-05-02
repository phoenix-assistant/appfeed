import { describe, it, expect } from "vitest";
import { validateFeed, AppFeedSchema, AppEntrySchema } from "../src/index.js";

const validFeed = {
  title: "My Tools",
  author: "phoenix",
  updated: "2026-05-01T00:00:00Z",
  entries: [
    {
      name: "cool-tool",
      version: "1.0.0",
      description: "A cool tool",
      author: "phoenix",
      install: "npm i -g cool-tool",
    },
  ],
};

describe("validateFeed", () => {
  it("accepts a valid feed", () => {
    const r = validateFeed(validFeed);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects feed with no entries", () => {
    const r = validateFeed({ ...validFeed, entries: [] });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("entries");
  });

  it("rejects missing title", () => {
    const { title, ...rest } = validFeed;
    const r = validateFeed(rest);
    expect(r.valid).toBe(false);
  });

  it("rejects invalid version", () => {
    const bad = {
      ...validFeed,
      entries: [{ ...validFeed.entries[0], version: "bad" }],
    };
    const r = validateFeed(bad);
    expect(r.valid).toBe(false);
  });
});

describe("AppEntrySchema", () => {
  it("defaults platforms to ['any']", () => {
    const entry = AppEntrySchema.parse({
      name: "t",
      version: "1.0.0",
      description: "d",
      author: "a",
      install: "npm i t",
    });
    expect(entry.platforms).toEqual(["any"]);
  });
});
