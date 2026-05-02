# AppFeed

An open protocol and registry for discovering, publishing, and installing micro-apps, tools, and skills.

Like RSS, but for developer tools. Authors publish `feed.json` files describing their tools. Users subscribe to authors, search registries, and install with one command.

## Packages

| Package | Description |
|---------|-------------|
| [`@phoenixaihub/appfeed-spec`](packages/spec) | Protocol spec — Zod schemas, TypeScript types, JSON Schema, validator |
| [`@phoenixaihub/appfeed-cli`](packages/cli) | CLI — init, validate, publish, search, install, follow, feed, export |
| [`@phoenixaihub/appfeed-server`](packages/server) | Registry server — Hono REST API, SQLite, RSS feeds, trending |
| [`@phoenixaihub/appfeed-web`](packages/web) | Static site generator — browsable registry from server data |

## Quick Start

```bash
# Install
npm install

# Build all packages
npm run build

# Run tests
npm test
```

## The Protocol

An AppFeed is a JSON file (`feed.json`) with this structure:

```json
{
  "title": "My Tools",
  "description": "Developer tools by phoenix",
  "author": "phoenix",
  "icon": "https://example.com/icon.png",
  "updated": "2026-05-01T00:00:00Z",
  "entries": [
    {
      "name": "cool-tool",
      "version": "1.2.0",
      "description": "A cool developer tool",
      "author": "phoenix",
      "tags": ["cli", "productivity"],
      "install": "npm install -g cool-tool",
      "homepage": "https://cool-tool.dev",
      "repository": "https://github.com/phoenix/cool-tool",
      "platforms": ["macos", "linux"],
      "category": "developer-tools"
    }
  ]
}
```

## CLI Usage

```bash
# Create feed.json from package.json
appfeed init

# Validate your feed
appfeed validate

# Publish to a registry
appfeed publish --registry http://localhost:3456

# Search for tools
appfeed search "cli tool" --registry http://localhost:3456

# Install a tool
appfeed install cool-tool --registry http://localhost:3456

# Follow an author's feed
appfeed follow https://example.com/feed.json

# View aggregated feed from followed authors
appfeed feed

# Export subscriptions
appfeed export --format opml
appfeed export --format json
```

## Server

```bash
# Start the registry server
cd packages/server
PORT=3456 npm start
```

### API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/publish` | Publish a feed (validates, upserts entries) |
| GET | `/search?q=query` | Search entries by name/description/tags |
| GET | `/browse` | Browse all entries (optional `?category=` filter) |
| GET | `/trending` | Time-decay ranked trending tools |
| GET | `/authors/:name` | Author profile + entries |
| GET | `/authors/:name/feed.xml` | RSS feed for an author |

## Static Site Generator

```bash
# Generate a browsable site from registry data
appfeed-web http://localhost:3456 ./site

# Generates: index.html, categories.html, authors.html,
# tool-*.html, author-*.html
```

## Architecture

```
feed.json (author) ──publish──▶ Registry Server ──browse──▶ Static Site
                                    │
CLI ──search/install───────────────┘
CLI ──follow──▶ ~/.appfeed/following.json ──feed──▶ Aggregated view
```

## License

MIT
