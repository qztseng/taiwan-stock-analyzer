# Design Context & Requirements

This document summarizes the key design decisions and requirements implemented in the Taiwan Stock Analyzer application during our development session. Its purpose is to provide a quick reference for future development.

## 1. Core Features

### 1.1. Market Capitalization

-   **Requirement**: The application must fetch and display the market capitalization for each queried company.
-   **Implementation Details**:
    -   A backend endpoint (`/api/market-cap`) was created to orchestrate data fetching.
    -   **Data Sources**: The backend fetches data from multiple official sources to ensure robustness:
        -   **Issued Shares**: From the MOPS `t05st03` API.
        -   **Stock Price**: Sequentially checks three primary open data APIs in order:
            1.  TPEx Mainboard (OTC) - `tpex_mainboard_daily_close_quotes`
            2.  TPEx Emerging (ESB) - `tpex_esb_latest_statistics`
            3.  TWSE Listed - `STOCK_DAY_AVG_ALL`
    -   **Date Formatting**: All dates fetched in the Minguo (ROC) format are converted to the standard `YYYY-MM-DD` format before being sent to the frontend.

### 1.2. Data Caching

-   **Requirement**: To improve performance and avoid redundant API calls, both revenue and market capitalization data must be cached.
-   **Implementation Details**:
    -   The SQLite database (`database.db`) is used for caching.
    -   A `revenues` table caches monthly revenue data permanently.
    -   A `market_caps` table was added to cache market capitalization data. This cache is designed to be valid for the current day (`updated_at` field). The API will only re-fetch data for a company once per day.

### 1.3. Frontend Display & UX

-   **Requirement**: The user interface must be clear, resilient, and present data in a readable format.
-   **Implementation Details**:
    -   **Market Cap Formatting**:
        -   TWD market cap is displayed in units of "億" (100 Million).
        -   USD market cap is displayed in units of "M" (Million), using a fixed conversion rate of 30 TWD = 1 USD.
    -   **Chart Clarity**:
        -   Revenue trend charts have a y-axis labeled "Revenue (TWD, Millions)".
        -   Year-over-Year growth charts have a y-axis labeled "YoY Growth (%)" and the axis ticks are formatted as percentages.
    -   **API Resilience**: The frontend uses `Promise.allSettled` when fetching data. This ensures that the failure of one API call (e.g., market cap for one company) does not prevent the successful display of data from other successful calls.

## 2. Key Files

-   `server.js`: Contains the backend logic for all APIs and caching strategies.
-   `database.js`: Defines the schema for all three data tables (`companies`, `revenues`, `market_caps`).
-   `index.html`: Contains all frontend logic, including data fetching, display formatting, and charting.
