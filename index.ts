import { Client } from "@notionhq/client";

const NOTION_TOKEN = process.env.NOTION_TOKEN || "";
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "";
const API_BASE = process.env.API_BASE || "https://bounty.owockibot.xyz";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "300") * 1000; // seconds to ms

interface Bounty {
  id: number;
  title: string;
  reward: number;
  status: string;
  tags: string[];
  created_at: string;
  claimed_by?: string;
  completed_at?: string;
  url?: string;
}

interface SyncState {
  lastSync: string | null;
  syncedBounties: Record<number, { notionPageId: string; lastStatus: string }>;
  totalEarnings: number;
}

const notion = new Client({ auth: NOTION_TOKEN });

let syncState: SyncState = {
  lastSync: null,
  syncedBounties: {},
  totalEarnings: 0,
};

// Load sync state from file
async function loadSyncState(): Promise<void> {
  try {
    const f = Bun.file("./sync-state.json");
    if (await f.exists()) {
      syncState = JSON.parse(await f.text());
    }
  } catch {}
}

async function saveSyncState(): Promise<void> {
  await Bun.write("./sync-state.json", JSON.stringify(syncState, null, 2));
}

// Fetch bounties from API
async function fetchBounties(): Promise<Bounty[]> {
  try {
    const res = await fetch(`${API_BASE}/bounties`);
    if (!res.ok) {
      console.error(`API returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : data.bounties || [];
  } catch (err) {
    console.error("Failed to fetch bounties:", err);
    return [];
  }
}

// Map status to Notion select color
function statusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "open":
    case "available":
      return "green";
    case "claimed":
    case "in_progress":
      return "yellow";
    case "completed":
    case "done":
      return "blue";
    case "expired":
    case "cancelled":
      return "red";
    default:
      return "default";
  }
}

// Create a new page in Notion database
async function createNotionPage(bounty: Bounty): Promise<string> {
  const response = await notion.pages.create({
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      Title: {
        title: [{ text: { content: bounty.title } }],
      },
      Reward: {
        number: bounty.reward,
      },
      Status: {
        select: { name: bounty.status },
      },
      Tags: {
        multi_select: (bounty.tags || []).map((t) => ({ name: t })),
      },
      Created: {
        date: { start: bounty.created_at },
      },
      "Claimed By": {
        rich_text: bounty.claimed_by
          ? [{ text: { content: bounty.claimed_by } }]
          : [],
      },
      URL: {
        url: bounty.url || `https://bounty.owockibot.xyz`,
      },
      "Bounty ID": {
        number: bounty.id,
      },
    },
  });

  return response.id;
}

// Update an existing Notion page
async function updateNotionPage(pageId: string, bounty: Bounty): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        select: { name: bounty.status },
      },
      "Claimed By": {
        rich_text: bounty.claimed_by
          ? [{ text: { content: bounty.claimed_by } }]
          : [],
      },
      Reward: {
        number: bounty.reward,
      },
    },
  });
}

// Main sync function
async function syncBounties(): Promise<{
  created: number;
  updated: number;
  totalEarnings: number;
}> {
  console.log(`[${new Date().toISOString()}] Starting sync...`);
  const bounties = await fetchBounties();

  if (bounties.length === 0) {
    console.log("No bounties to sync");
    return { created: 0, updated: 0, totalEarnings: syncState.totalEarnings };
  }

  let created = 0;
  let updated = 0;
  let totalEarnings = 0;

  for (const bounty of bounties) {
    try {
      const existing = syncState.syncedBounties[bounty.id];

      if (!existing) {
        // New bounty - create page
        const pageId = await createNotionPage(bounty);
        syncState.syncedBounties[bounty.id] = {
          notionPageId: pageId,
          lastStatus: bounty.status,
        };
        console.log(`  Created: "${bounty.title}" (${bounty.id})`);
        created++;
      } else if (existing.lastStatus !== bounty.status) {
        // Status changed - update page
        await updateNotionPage(existing.notionPageId, bounty);
        existing.lastStatus = bounty.status;
        console.log(`  Updated: "${bounty.title}" ${existing.lastStatus} -> ${bounty.status}`);
        updated++;
      }

      // Track earnings
      if (bounty.status === "completed" || bounty.status === "done") {
        totalEarnings += bounty.reward || 0;
      }
    } catch (err) {
      console.error(`  Error syncing bounty ${bounty.id}:`, err);
    }

    // Rate limiting - Notion API allows 3 requests per second
    await new Promise((r) => setTimeout(r, 350));
  }

  syncState.totalEarnings = totalEarnings;
  syncState.lastSync = new Date().toISOString();
  await saveSyncState();

  console.log(`Sync complete: ${created} created, ${updated} updated, $${totalEarnings} total earnings`);
  return { created, updated, totalEarnings };
}

// Validate configuration
function validateConfig(): boolean {
  if (!NOTION_TOKEN) {
    console.error("ERROR: NOTION_TOKEN is required. Set it in your .env file.");
    console.error("Get one at: https://www.notion.so/my-integrations");
    return false;
  }
  if (!NOTION_DATABASE_ID) {
    console.error("ERROR: NOTION_DATABASE_ID is required. Set it in your .env file.");
    console.error("Create a database from the template and copy its ID from the URL.");
    return false;
  }
  return true;
}

// Main entry point
async function main(): Promise<void> {
  console.log("Bounty Notion Sync");
  console.log("==================");
  console.log(`API Base: ${API_BASE}`);
  console.log(`Poll Interval: ${POLL_INTERVAL / 1000}s`);

  if (!validateConfig()) {
    process.exit(1);
  }

  await loadSyncState();
  console.log(`Loaded sync state: ${Object.keys(syncState.syncedBounties).length} bounties tracked`);

  // Initial sync
  await syncBounties();

  // Set up polling
  console.log(`\nPolling every ${POLL_INTERVAL / 1000} seconds...`);
  setInterval(syncBounties, POLL_INTERVAL);
}

main().catch(console.error);
