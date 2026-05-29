# AI Developer Guide (GEMINI.md)

This document is intended to provide future AI assistants (and human developers) with a quick overview of the repository's architecture, design decisions, and testing guidelines for the Taiwan Stock Analyzer V2.

## 🎯 Project Overview

**Taiwan Stock Analyzer V2** is a web-based application designed to fetch, visualize, and compare the monthly revenue and market capitalization data of companies listed on the Taiwan Stock Exchange (TWSE), Taipei Exchange (TPEx), and Emerging Stock Board (ESB). 

It features a stateful backend (Node.js/Express) with a local SQLite database for caching, and a Vanilla JavaScript frontend that utilizes `Chart.js` for data visualization.

## 🏗️ Architecture & Tech Stack

### Backend
- **Framework**: Node.js with Express.js (`server.js`)
- **Database**: SQLite (`sqlite3` and `sqlite` packages).
- **Caching**: 
  - The SQLite database caches revenue data (permanently) and market cap data (daily).
  - Schema is defined in `database.js`.
- **Data Source**: Fetches data from official Taiwan government open APIs (e.g., MOPS) when cache misses occur.

### Frontend
- **Structure**: Single HTML file architecture (`index.html`).
- **Styling**: Vanilla CSS included directly in `index.html`.
- **Logic**: Vanilla JavaScript utilizing modern features (`Promise.allSettled`, `fetch`).
- **Charting**: `Chart.js` via CDN.
- **Port**: Typically served by the backend on port `3001` or another configured port.

### Testing
- **E2E Testing**: `Playwright` is used for UI and interaction testing (`test-playwright.js`).

## 📂 Key Files Map

- `server.js`: The core Express backend application. Handles routes (`/api/search-company`, `/api/revenue`, `/api/market-cap`), caching logic, and serves the static frontend.
- `database.js`: Database connection management and table schema definitions (`companies`, `revenues`, `market_caps`).
- `database.db`: The local SQLite database file (contains cache and seeded companies).
- `index.html`: The entire frontend. Contains HTML, CSS, and JS. Responsible for querying the backend and rendering `Chart.js` visualizations.
- `seed.js`: A one-time script used to populate the initial `companies` table from official data sources.
- `package.json`: Project dependencies and scripts.
- `test-playwright.js`: End-to-end testing script. Run via `node test-playwright.js`.
- `clear-revenues.js`: Utility to clear cached revenues for testing cache misses.
- `DESIGN.md` / `DESIGN_CONTEXT.md`: Historical design documents outlining the evolution to V2.

## 🛠️ Developer Guidelines (Important for AI Agents)

1. **Start the Environment**: 
   - Start the backend server using `node server.js` (starts on port 3001).
   - The frontend is served statically by the backend, so you can access it at `http://localhost:3001`.

2. **Process Management**:
   - If you need to restart the server, ensure you kill the existing process first to avoid `EADDRINUSE` errors. 
   - You can use commands like `lsof -i :3001` to find and kill lingering server processes.

3. **Testing**:
   - Use `node test-playwright.js` to run the Playwright E2E tests. This is the preferred method to verify UI interactions.
   - For a clean slate regarding revenue caching, use `node clear-revenues.js` instead of deleting the whole database.

4. **Debugging & Logging**:
   - Ensure you log relevant steps in the backend for efficient debugging.
   - If generating specific logs for a testing session, consider cleaning up old log files before starting a new round of tests.
   
5. **Database**:
   - Do NOT delete `database.db` unless necessary, as it requires re-running `seed.js` to populate the `companies` table for the search functionality to work.
   - The backend handles the connection to the MOPS API. Follow existing patterns for data fetching using `node-fetch`.

6. **Adding New Features**:
   - When adding new data points or visualizations, follow the existing pattern: 
     1. Add/modify caching logic in `database.js` if applicable.
     2. Create/update an endpoint in `server.js`.
     3. Update `index.html` to consume the new endpoint and render the data.
