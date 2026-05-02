import { z } from "zod";

// --- Entry Schema ---

export const AppEntrySchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/, "Must be semver"),
  description: z.string(),
  author: z.string(),
  tags: z.array(z.string()).default([]),
  install: z.string().describe("Shell command to install this tool"),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  changelog: z.string().optional(),
  platforms: z
    .array(z.enum(["macos", "linux", "windows", "web", "any"]))
    .default(["any"]),
  category: z.string().default("uncategorized"),
});

export type AppEntry = z.infer<typeof AppEntrySchema>;

// --- Feed Schema ---

export const AppFeedSchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  author: z.string(),
  icon: z.string().url().optional(),
  updated: z.string().datetime(),
  entries: z.array(AppEntrySchema).min(1, "Feed must have at least one entry"),
});

export type AppFeed = z.infer<typeof AppFeedSchema>;

// --- Validator ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFeed(json: unknown): ValidationResult {
  const result = AppFeedSchema.safeParse(json);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    ),
  };
}

// --- JSON Schema export (static) ---

export const APPFEED_JSON_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "AppFeed",
  type: "object",
  required: ["title", "author", "updated", "entries"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    author: { type: "string" },
    icon: { type: "string", format: "uri" },
    updated: { type: "string", format: "date-time" },
    entries: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["name", "version", "description", "author", "install"],
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          description: { type: "string" },
          author: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          install: { type: "string" },
          homepage: { type: "string", format: "uri" },
          repository: { type: "string", format: "uri" },
          changelog: { type: "string" },
          platforms: {
            type: "array",
            items: {
              type: "string",
              enum: ["macos", "linux", "windows", "web", "any"],
            },
          },
          category: { type: "string" },
        },
      },
    },
  },
} as const;
