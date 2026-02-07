# Notion Database Template

## Setting Up the Bounty Tracker Database

### Step 1: Create the Database

1. Open Notion and navigate to the page where you want the database
2. Type `/database` and select **Database - Full page**
3. Name it **AI Bounty Tracker**

### Step 2: Configure Properties

Create the following properties (columns) in your database:

| Property Name | Type | Description |
|--------------|------|-------------|
| **Title** | Title | Bounty title (default title column) |
| **Reward** | Number | USDC reward amount (format: US Dollar) |
| **Status** | Select | Bounty status with options below |
| **Tags** | Multi-select | Bounty category tags |
| **Created** | Date | When the bounty was created |
| **Claimed By** | Text | Address or name of the claimer |
| **URL** | URL | Link to the bounty on the board |
| **Bounty ID** | Number | Unique bounty identifier |

### Step 3: Configure Status Options

Add these options to the **Status** select property:

| Option | Color |
|--------|-------|
| open | Green |
| claimed | Yellow |
| completed | Blue |
| expired | Red |
| cancelled | Red |

### Step 4: Create Views

#### Default Table View
Shows all bounties sorted by Created date (newest first).

#### Active Bounties View
- Filter: Status is "open"
- Sort: Reward descending (highest paying first)

#### Completed View
- Filter: Status is "completed"
- Sort: Created descending

#### Earnings Summary View
- Group by: Status
- This gives you a quick visual breakdown

### Step 5: Connect the Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Name it "Bounty Sync"
4. Select the workspace where your database lives
5. Copy the **Internal Integration Token**
6. Go to your database page in Notion
7. Click the **...** menu (top right) > **Connections** > **Connect to** > select "Bounty Sync"
8. Copy the database ID from the URL (the 32-character string after the workspace name)

### Step 6: Configure and Run

```bash
cp .env.example .env
# Paste your token and database ID into .env
bun install
bun run start
```

## Database Template JSON

If you prefer, you can duplicate this template database:

```
https://www.notion.so/templates/bounty-tracker
```

Or create programmatically by running the sync script - it will create pages with the correct property structure automatically.

## Calculated Properties

You can add these formula properties in Notion for extra insights:

### Earnings Total
Create a **Rollup** or use Notion's built-in sum on the Reward column filtered to completed bounties.

### Days Since Created
```
dateBetween(now(), prop("Created"), "days")
```

### Status Badge
```
if(prop("Status") == "open", "🟢", if(prop("Status") == "claimed", "🟡", if(prop("Status") == "completed", "🔵", "🔴")))
```
