# Intercom Office Menu API

A Cloudflare Workers application that provides real-time access to weekly breakfast and lunch menus for Intercom offices in London, Dublin, and San Francisco.

## Features

- **Multi-location Support**: Serves menu data for London, Dublin, and SF offices
- **Weekly Menu Management**: Stores and serves full week menus (Monday-Friday)
- **Smart Search**: Search by item name, dietary requirements, or meal type
- **Dietary Filters**: Find Vegan, Vegetarian, Gluten-Free, and Dairy-Free options
- **Full Nutrition Data**: Complete nutritional information and allergen details
- **REST API**: Traditional HTTP endpoints for web access
- **MCP Integration**: AI-ready tools for conversational menu queries
- **Interactive Explorer**: Built-in web UI for testing endpoints

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or npm
- Cloudflare account with Workers enabled
- Wrangler CLI (`bun add -g wrangler`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd intercom-london-menu

# Install dependencies with Bun (recommended)
bun install

# Or with npm
npm install
```

### Local Development

```bash
# Create environment variables file
cp .dev.vars.example .dev.vars

# Add your API key and menu URL
echo "API_KEY=your-secure-api-key" >> .dev.vars
echo "LONDON_MENU_URL=https://menu-source-url" >> .dev.vars

# Start development server
bun run dev
```

The server will start at `http://localhost:8788`

### Deployment

```bash
# Deploy to Cloudflare Workers
bun run deploy

# Or use wrangler directly
wrangler deploy
```

## API Documentation

The complete API documentation with interactive examples is available at the root endpoint:

```bash
# Open in browser for interactive API explorer
http://localhost:8788/

# Or via curl to see available endpoints
curl http://localhost:8788/
```

### MCP Tools

The application exposes 4 MCP tools for AI assistants:

1. **query-menu-by-date**: Get menu for specific date and location
2. **search-menu-items**: Search with flexible filters
3. **get-week-menu**: Get complete week data
4. **find-items-by-dietary-label**: Quick dietary filtering

Connect to MCP at: `http://localhost:8788/mcp`

## Environment Variables

Create a `.dev.vars` file with:

```bash
# Required for workflow creation
API_KEY=your-secure-api-key-here

# Menu source URL
LONDON_MENU_URL=https://menu-source.example.com
```

For production, set these in the Cloudflare dashboard under Workers > Settings > Variables.

## Architecture

```text
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Client    │────▶│  REST API    │────▶│ Durable Object │
│             │     │  (Hono)      │     │  (Menu Store)  │
└─────────────┘     └──────────────┘     └────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  MCP Server  │
                    │  (AI Tools)  │
                    └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│   Workflow   │────▶│  Puppeteer   │────▶│  External Menu │
│  (Scheduled) │     │  (Scraper)   │     │     Source     │
└──────────────┘     └──────────────┘     └────────────────┘
```

## Development

### Project Structure

```text
src/
├── index.ts           # Main application with REST routes
├── agent.ts           # MCP server implementation
├── menu-do.ts         # Durable Object for menu storage
├── workflows/
│   ├── fetch-menu.ts  # Workflow to fetch menus
│   └── lib/
│       ├── types.ts   # TypeScript definitions
│       └── london.ts  # Menu scraper implementation
├── helpers/
│   └── date-utils.ts  # Date and week utilities
└── views/
    └── home.tsx       # Interactive API explorer UI
```

## How This Was Built

This project was developed with LLMs handling the heavy lifting throughout the entire development process. From implementing the MCP server and Durable Objects to writing REST APIs, performing code reviews, fixing bugs, and creating all documentation - AI was instrumental in building every aspect of this application.

### Technology Stack

This stack was chosen for its edge-first architecture, enabling fast global access with persistent storage and AI integration capabilities.

- **Cloudflare Workers** - Serverless edge computing with Durable Objects
- **Cloudflare Agents** - AI assistant integration and MCP server hosting
- **Hono** - Lightweight routing framework
- **TypeScript** - Type safety and developer experience
- **Puppeteer** - Automated menu scraping

## Support

For issues or questions, please open an issue in the repository.
