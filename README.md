# Bounty Notion Sync

Automatically syncs bounties from the [AI Bounty Board](https://bounty.owockibot.xyz) to a Notion database, with status tracking and earnings calculation.

## Features

- **Auto-import** new bounties into your Notion database
- **Status tracking** - detects and updates claimed/completed changes
- **Earnings totals** - tracks total USDC earned from completed bounties
- **Configurable polling** - set your preferred sync interval
- **@notionhq/client SDK** - official Notion API integration
- **Persistent state** - remembers which bounties have been synced

## Quick Start

### 1. Set Up Notion

Follow the detailed setup instructions in [notion-template.md](./notion-template.md) to create your database and integration.

**Quick version:**
1. Create a Notion database with these properties: Title, Reward (Number), Status (Select), Tags (Multi-select), Created (Date), Claimed By (Text), URL (URL), Bounty ID (Number)
2. Create an integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Connect the integration to your database (... menu > Connections)

### 2. Configure

```bash
# Install dependencies
bun install

# Set up environment
cp .env.example .env
```

Edit `.env` with your Notion token and database ID:

```
NOTION_TOKEN=ntn_your_token_here
NOTION_DATABASE_ID=your_database_id_here
```

### 3. Run

```bash
# Start continuous sync
bun run start

# Or run once
bun run sync
```

## How It Works

1. Fetches all bounties from the bounty board API
2. Compares with previously synced bounties (stored in `sync-state.json`)
3. Creates Notion pages for new bounties
4. Updates Notion pages when bounty status changes
5. Calculates total earnings from completed bounties
6. Waits for the configured polling interval and repeats

## Notion Database Properties

| Property | Type | Auto-synced |
|----------|------|-------------|
| Title | Title | Yes |
| Reward | Number | Yes |
| Status | Select | Yes (updates on change) |
| Tags | Multi-select | Yes |
| Created | Date | Yes |
| Claimed By | Text | Yes (updates on change) |
| URL | URL | Yes |
| Bounty ID | Number | Yes |

## Zapier/Make Integration

Instead of running this script, you can use Zapier or Make (Integromat) for a no-code approach:

### Zapier Setup

1. **Trigger**: Schedule (every 5 minutes)
2. **Action 1**: Webhooks - GET `https://bounty.owockibot.xyz/api/bounties`
3. **Action 2**: Looping - for each bounty in the response
4. **Action 3**: Notion - Find Database Item (search by Bounty ID)
5. **Action 4**: Notion - Create or Update Database Item

### Make (Integromat) Setup

1. Create a new scenario
2. Add **HTTP - Make a request** module: GET `https://bounty.owockibot.xyz/api/bounties`
3. Add **Iterator** module on the response array
4. Add **Notion - Search Objects** module (search by Bounty ID)
5. Add **Router** with two paths:
   - Path 1 (not found): **Notion - Create a Database Item**
   - Path 2 (found + status changed): **Notion - Update a Database Item**
6. Set the scenario to run every 5 minutes

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTION_TOKEN` | _(required)_ | Notion integration token |
| `NOTION_DATABASE_ID` | _(required)_ | Target database ID |
| `API_BASE` | `https://bounty.owockibot.xyz/api` | Bounty board API |
| `POLL_INTERVAL` | `300` | Polling interval in seconds |

## License

MIT
