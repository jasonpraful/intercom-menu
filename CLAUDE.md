# Intercom London Menu API

## Overview

This is a Cloudflare Workers application that fetches, stores, and serves menu data for Intercom office locations (London, Dublin, and SF). It provides both REST APIs and MCP (Model Context Protocol) tools for accessing weekly breakfast and lunch menus.

## Architecture

### Core Components

1. **Durable Objects** (`src/menu-do.ts`)
   - Stores menu data for a specific week and location
   - Named pattern: `{location}-{monday-date}-{friday-date}` (e.g., `london-2025-11-24-2025-11-28`)
   - Uses SQL storage for indexing and fast queries
   - Stores both JSON data and indexed menu items

2. **Workflows** (`src/workflows/fetch-menu.ts`)
   - Fetches menu data from external sources using Puppeteer
   - Processes and stores data in Durable Objects
   - Requires API key for triggering (security measure)

3. **MCP Server** (`src/agent.ts`)
   - Provides 4 tools for AI assistants to query menu data
   - Read-only access to menu information
   - No workflow creation capabilities (by design)

4. **REST API** (`src/index.ts`)
   - Built with Hono framework
   - Provides endpoints for web access
   - Interactive API explorer at root path

## Data Structure

### Menu Hierarchy

```text
Menu (breakfast or lunch)
└── DayMenu (Monday-Friday)
    └── MenuCategory (Mains, Sides, Desserts, etc.)
        └── MenuItem
            ├── id
            ├── name
            ├── dietaryLabels (Vegan, Vegetarian, etc.)
            ├── ingredients
            ├── allergens
            └── nutritionPer100g
```

### Key Types

- `StoredMenuData`: Complete week's menu with metadata
- `MenuQueryResult`: Single day/meal query result
- `MenuItemWithContext`: Item with date, meal type, and category context

## API Endpoints

### Menu Queries

- `GET /menu/query/:location/:date?meal={breakfast|lunch}` - Get menu for specific date
- `GET /menu/search/:location?q=&startDate=&endDate=&meal=&dietary=` - Search menu items
- `GET /menu/:name` - Direct Durable Object access by week key

### Workflow Management (Protected)

- `GET /workflow` - Create new menu fetch workflow (requires API key)
- `GET /workflow/:id` - Check workflow status

### MCP Integration

- `GET /sse` - Server-sent events for MCP
- `POST /mcp` - MCP JSON-RPC endpoint

## MCP Tools (v2.0.0)

### 1. query-menu-by-date

Get menu for a specific date and location.

- **Inputs**: location, date (optional), mealType (optional)
- **Returns**: MenuQueryResult[] with full item details

### 2. search-menu-items

Search menu items with flexible filters.

- **Inputs**: location, query, startDate, endDate, mealType, dietaryLabel
- **Returns**: Array of MenuItemWithContext with nutrition/allergen info

### 3. get-week-menu

Get complete week menu data.

- **Inputs**: location, weekStartDate (optional)
- **Returns**: Full StoredMenuData including timestamp

### 4. find-items-by-dietary-label

Quick filter for dietary requirements.

- **Inputs**: location, dietaryLabel, mealType, date
- **Returns**: Filtered items with full details

## Environment Variables

Required in `.dev.vars` or Cloudflare dashboard:

```bash
API_KEY=your-api-key-here  # For workflow creation
LONDON_MENU_URL=https://...  # Menu source URL
```

## Date Handling

- Week ranges: Always Monday-Friday
- Date format: YYYY-MM-DD
- Current week detection: Automatic
- Helper utilities in `src/helpers/date-utils.ts`:
  - `getWeekRange(date)` - Get week for any date
  - `getCurrentWeekRange()` - Current week
  - `formatDate(date)` - Convert to YYYY-MM-DD

## Development

### Prerequisites

- Bun (recommended)
- Cloudflare Wrangler CLI

### Setup

```bash
# Using Bun (recommended)
bun install
bun run dev  # Start local server on :8788
```

### Type Checking

```bash
bun run type-check
```

### Deployment

```bash
bun run deploy  
```

### Package Manager

This project uses **Bun** as the primary package manager for faster installation and execution. However, npm is also fully supported if you prefer.

## Important Notes

### Security

- Workflow creation requires API key (header: `x-api-key` or query: `api_key`)
- MCP tools are read-only by design
- No workflow creation via MCP

### Data Freshness

- Menu data must be fetched via workflow first
- Data stored with timestamp (`storedAt`)
- No automatic refresh - manual workflow trigger required

### Error Handling

- Missing data returns helpful messages suggesting to "check back later"
- Never exposes internal errors or workflow details
- 404 for missing data, 500 for system errors

### Limitations

- One location per query (no multi-location support)
- Week-based storage (Monday-Friday only)
- Must know or calculate week range for queries

## Common Tasks

### Fetch New Menu Data

1. Set API_KEY environment variable
2. Call `GET /workflow?api_key=YOUR_KEY`
3. Check status with workflow ID
4. Menu data available once workflow completes

### Query Today's Lunch Menu

```javascript
// Via REST
fetch('/menu/query/london/2025-11-25?meal=lunch')

// Via MCP tool
query -
  menu -
  by -
  date({
    location: 'london',
    meal: 'lunch',
    // date defaults to today
  })
```

### Find Vegan Options

```javascript
// Via REST
fetch('/menu/search/london?dietary=Vegan')

// Via MCP tool
find -
  items -
  by -
  dietary -
  label({
    location: 'london',
    dietaryLabel: 'Vegan',
  })
```

## Testing MCP Integration

### With Claude Desktop

```bash
claude mcp add --transport http intercom-menu http://localhost:8788/mcp
```

### Available Commands

- "What's for lunch today in London?"
- "Find vegan options for this week"
- "Show me the breakfast menu for Friday"
- "Search for items with chicken"

## Troubleshooting

### No Menu Data Found

- Check if workflow has been run for the current week
- Verify API_KEY is set correctly
- Ensure date is within Monday-Friday range

### TypeScript Errors

- Run `bun run type-check` to identify issues
- Common issue: Missing `as const` for literal types
- Check imports for types from `./workflows/lib/types`

### MCP Connection Issues

- Verify `/mcp` endpoint is accessible
- Check if running on correct port (8788)
- Ensure `IntercomMenuMCP` is exported from index.ts

## File Structure

```text
src/
├── index.ts           # Main app with Hono routes
├── agent.ts           # MCP server implementation
├── menu-do.ts         # Durable Object for menu storage
├── workflows/
│   ├── fetch-menu.ts  # Workflow to fetch menus
│   └── lib/
│       ├── types.ts   # TypeScript definitions
│       └── london.ts  # London menu scraper
├── helpers/
│   ├── date-utils.ts  # Date/week utilities
│   └── get-weekday.ts # Additional date helpers
└── views/
    └── home.tsx       # Interactive API explorer UI
```

## Recent Updates (Nov 2024)

### MCP v2.0.0 Revamp

- Replaced 2 basic tools with 4 comprehensive tools
- Added full search and filtering capabilities
- Included nutrition and allergen data in responses
- Improved error messages with helpful context
- Smart date defaulting (current week/today)

### API Enhancements

- Added API key protection for workflow creation
- Improved error responses (404 vs 500)
- Interactive API explorer with Tailwind UI
- Support for header-based API keys

### Code Quality

- Full TypeScript support
- Hono framework for cleaner routing
- SQL indexing for fast queries
- Proper error boundaries
