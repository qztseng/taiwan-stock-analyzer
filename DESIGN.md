# Taiwan Stock Analyzer - Design Document V2

This document outlines the plan to evolve the Taiwan Stock Analyzer from a simple client-side application with a proxy into a more robust, efficient, and user-friendly tool with a stateful backend and a local database.

## 1. Core Objectives

-   **Improve Performance**: Eliminate redundant API calls by caching previously fetched financial data.
-   **Enhance User Experience**: Replace the manual company code input with a dynamic search and autocomplete feature.
-   **Create a Scalable Architecture**: Build a solid foundation that can be easily extended with new features in the future.

## 2. Proposed Architecture

The new architecture will consist of three main components: a stateful backend service, a local SQLite database, and an enhanced frontend.

### 2.1. Backend Service (`server.js`)

The backend will be the application's core, managing data and business logic.

-   **Technology**: Node.js, Express.js, `sqlite3`, `sqlite`.
-   **Responsibilities**:
    -   Serve the static frontend (`index.html`).
    -   Provide intelligent API endpoints for the frontend.
    -   Manage the local SQLite database.
    -   Fetch data from the external MOPS API only when necessary.

-   **API Endpoints**:
    -   `GET /api/search-company?q=<query>`: Powers the company search feature. It will query the `companies` table in the database for matches against both company names and codes.
    -   `POST /api/revenue`: The main data endpoint. It will orchestrate fetching data from the cache and the MOPS API to fulfill the user's request.

### 2.2. Database (`database.db`)

A local SQLite database will be used for data persistence and caching.

-   **Technology**: SQLite.
-   **Schema**:
    -   **`companies` table**:
        -   `code` (TEXT, PRIMARY KEY): The stock code.
        -   `name` (TEXT): The company's official name.
    -   **`revenues` table**:
        -   `company_code` (TEXT)
        -   `year` (INTEGER)
        -   `month` (INTEGER)
        -   `revenue` (REAL)
        -   `yoy_percent` (REAL)
        -   `ytd_revenue` (REAL)
        -   PRIMARY KEY (`company_code`, `year`, `month`)

### 2.3. Data Seeding (`seed.js`)

A one-time script will be created to populate the `companies` table.

-   **Functionality**:
    1.  Fetch a master list of all companies from an official, public source (e.g., a government open data portal).
    2.  Parse the data.
    3.  Populate the `companies` table in `database.db`.

### 2.4. Frontend (`index.html`)

The user interface will be upgraded for a better experience.

-   **Key Changes**:
    -   The text inputs for company codes will be replaced with a dynamic search box featuring autocomplete suggestions.
    -   The frontend's data fetching logic will be simplified. It will no longer need to loop through months; it will make a single call to `/api/revenue` and receive the complete dataset.

## 3. Implementation Plan

1.  **Setup Database**:
    -   Add `sqlite` and `sqlite3` as project dependencies.
    -   Create a `database.js` module to handle database connections and schema initialization.
2.  **Seed Company Data**:
    -   Create the `seed.js` script.
    -   Find a suitable public data source for the company list.
    -   Implement the logic to fetch, parse, and save the company data.
3.  **Refactor Backend**:
    -   Modify `server.js` to include the new API endpoints (`/api/search-company`, `/api/revenue`).
    -   Implement the caching logic within the `/api/revenue` endpoint.
4.  **Update Frontend**:
    -   Redesign the input section in `index.html` to use the new search/autocomplete component.
    -   Update the JavaScript to call the new backend endpoints and handle the simplified data flow.
5.  **Testing**:
    -   Thoroughly test the new search functionality.
    -   Verify that the caching mechanism is working correctly by monitoring server logs and network requests.
    -   Ensure all charts and data tables continue to render correctly.

## 4. Key considerations

1. The backend should query directly the MOPS if requested data is not yet stored in the db. 
2. Newly fetched data should be saved to db and returned to the frontend for ploting and display
3. Use playwright MCP server to test UI interaction
4. start the backend server at the port 3001 and the frontend at the port 3000
5. Try to log everysteps to enable efficient debugging. 
6. Use lsof -i :<PORT_NUMBER>  to properly kill the previous running server and UI process when restart testing
7. Delete the log file at each round of new testing so that you will not be confused with previous log message
8. Leverage the currently working mechanism (use a CORS proxy to query MOPS API). The backend shall have no problem getting data directly from the MOPS as it is already working in the current implementation.
