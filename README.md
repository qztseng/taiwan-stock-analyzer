# Taiwan Stock Revenue Analyzer V2

This is a web-based application designed to fetch, visualize, and compare the monthly revenue data of companies listed on the Taiwan Stock Exchange (TSE), Taipei Exchange (TPEx), and Emerging Stock Board (ESB). It features a dynamic search interface and a stateful backend that caches data to provide a fast and efficient user experience.

## 🌟 Features

-   **Comprehensive Company Search**: Dynamically search for companies by stock code or name across TSE, TPEx, and ESB markets.
-   **Efficient Data Caching**: The backend caches previously fetched revenue data in a local SQLite database, eliminating redundant API calls and speeding up subsequent requests.
-   **Company Comparison**: Analyze one or two companies simultaneously.
-   **Multiple Visualizations**: Data is presented in various chart types (Monthly, Quarterly, Yearly) for both revenue trends and Year-over-Year (YoY) growth.
-   **Interactive Charts**: Toggle the visibility of each company on the charts for focused analysis.
-   **Tabular Data**: View the raw monthly revenue, YoY percentage change, and Year-to-Date (YTD) revenue in a clear, sortable table.

## 🏗️ Architecture

The application has been refactored into a more robust client-server architecture with a persistent database.

### 1. Frontend (`index.html`)

-   **Structure**: A single HTML file containing the structure (HTML), styling (CSS), and logic (JavaScript).
-   **Technology**: Vanilla JavaScript, Chart.js.
-   **Functionality**:
    -   Provides a search input with autocomplete suggestions powered by the backend's search API.
    -   Captures user selections for companies and a start date.
    -   Makes a single, streamlined API call per company to the backend's `/api/revenue` endpoint.
    -   Receives the complete dataset from the backend and uses Chart.js to render analytical charts and populate the data table.

### 2. Backend (`server.js`)

-   **Structure**: A Node.js server built with the Express.js framework.
-   **Technology**: Node.js, Express.js, `sqlite`, `sqlite3`.
-   **Functionality**:
    -   Serves the static `index.html` file.
    -   Provides two main API endpoints:
        -   `GET /api/search-company`: Powers the frontend's autocomplete search box.
        -   `POST /api/revenue`: The main data orchestration endpoint. It checks the local SQLite database for cached data. If data is missing, it fetches it from the official MOPS API, saves it to the cache, and then returns the complete dataset to the client.

### 3. Database (`database.js` & `database.db`)

-   **Technology**: SQLite.
-   **`database.js`**: A module that handles the database connection, and schema initialization for the `companies` and `revenues` tables.
-   **`database.db`**: The physical SQLite database file containing the cached revenue data and the master list of companies.

### 4. Data Seeding (`seed.js`)

-   **Functionality**: A one-time script used to populate the `companies` table in the database. It fetches master lists for all TSE, TPEx, and ESB companies from official government open data sources and inserts them into the database, enabling the search functionality.

## 📂 File Descriptions

| File                      | Description                                                                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`              | The core frontend of the application. Contains all HTML, CSS, and JavaScript for the user interface, charting, and interaction.                                         |
| `server.js`               | The main backend file. Runs an Express server that serves the frontend, provides API endpoints for search and revenue data, and manages the data caching logic.          |
| `database.js`             | A helper module for the backend. Manages the SQLite database connection and initializes the required table schemas (`companies`, `revenues`).                             |
| `seed.js`                 | A standalone script to populate the `companies` table in the database from official TSE, TPEx, and ESB data sources. Run this once during setup.                         |
| `database.db`             | The SQLite database file. Stores the list of all companies and caches all fetched revenue data to prevent redundant API calls.                                          |
| `package.json`            | Defines the project's metadata and lists its Node.js dependencies (e.g., `express`, `sqlite`).                                                                        |
| `package-lock.json`       | Records the exact versions of the project's dependencies.                                                                                                             |
| `DESIGN.md`               | The technical design document outlining the architecture and implementation plan for the V2 features.                                                                   |
| `test-playwright.js`      | An end-to-end test script using Playwright to simulate user interaction and verify that the application's core features are working correctly.                          |
| `clear-revenues.js`       | A utility script to clear only the `revenues` table from the database, useful for testing caching from a clean slate without re-seeding companies.                     |
| ---                       | ---                                                                                                                                                                   |
| **Unused/Legacy Files**   |                                                                                                                                                                       |
| `mops_api.py`             | **Unused**. A Python script, likely from a previous version or for testing purposes. Not used by the current Node.js application.                                      |
| `test-mops.js`            | **Unused**. A legacy test script. Its functionality is superseded by the new backend logic and `test-playwright.js`.                                                    |
| `test-new-payload.js`     | **Unused**. A legacy test script.                                                                                                                                     |
| `test-revenue-fetch.js`   | **Unused**. A legacy test script.                                                                                                                                     |
| `test-server-logic.js`    | **Unused**. A legacy test script.                                                                                                                                     |

## 🛠️ Setup and Usage

1.  **Prerequisites**: You need to have [Node.js](https://nodejs.org/) and `sqlite3` installed.
    -   **Node.js**: [Download from nodejs.org](https://nodejs.org/)
    -   **sqlite3**: `sudo apt-get install sqlite3` (on Debian/Ubuntu) or `brew install sqlite3` (on macOS).

2.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd taiwan-stock-analyzer
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Seed the Database**:
    Run the seeding script once to populate the database with the list of all companies.
    ```bash
    node seed.js
    ```

5.  **Start the Server**:
    ```bash
    node server.js
    ```
    You should see a confirmation message: `✅ Server running at http://localhost:3001`.

6.  **Open the Application**:
    Navigate to **`http://localhost:3001`** in your web browser.