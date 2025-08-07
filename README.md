# Taiwan Stock Revenue Analyzer

This is a web-based application designed to fetch, visualize, and compare the monthly revenue data of companies listed on the Taiwan Stock Exchange (TWSE). The user can input up to two company stock codes and a start date to generate interactive charts and a data table, allowing for easy analysis of financial trends.

## 🌟 Features

-   **Company Comparison**: Analyze one or two companies simultaneously.
-   **Historical Data**: Select a custom start date to retrieve historical revenue data.
-   **Multiple Visualizations**: Data is presented in four different chart types:
    -   Monthly Revenue Trend (Line Chart)
    -   Quarterly Revenue Trend (Bar Chart)
    -   Yearly Revenue Trend (Bar Chart)
    -   Year-over-Year (YoY) Change Trend (Line Chart)
-   **Interactive Charts**: Toggle the visibility of each company on the charts for focused analysis.
-   **Tabular Data**: View the raw monthly revenue, YoY percentage change, and Year-to-Date (YTD) revenue in a clear table.
-   **Data Export**: Download the comparison data as a CSV file for offline analysis.
-   **User-Friendly Interface**: A clean, responsive UI with loading indicators and clear error/success messages.

## 🏗️ Architecture & Data Flow

The application consists of two main components: a frontend user interface and a backend proxy server.

### 1. Frontend (`index.html`)

-   **Structure**: A single HTML file containing the structure (HTML), styling (CSS), and logic (JavaScript).
-   **Technology**: Built with vanilla JavaScript, HTML5, and CSS3. It uses the **Chart.js** library for creating interactive charts.
-   **Functionality**:
    -   Captures user input for company codes and a start date.
    -   When the "Fetch & Compare" button is clicked, it generates a list of months from the start date to the present.
    -   For each month, it sends a request to its backend proxy server to fetch the revenue data for the specified company/companies. A 1.5-second delay is added between requests to avoid overwhelming the target API.
    -   Once the data is retrieved, it processes the raw monthly figures to calculate quarterly and yearly aggregates.
    -   It then uses Chart.js to render the four analytical charts.
    -   Finally, it populates a data table with the detailed monthly figures.

### 2. Backend (`server.js`)

-   **Structure**: A simple Node.js server built with the Express.js framework.
-   **Technology**: Node.js, Express.js, `node-fetch` for making HTTP requests, and `cors` for handling Cross-Origin Resource Sharing.
-   **Purpose**: It acts as a **CORS proxy**. Browsers block web pages from making direct API requests to a different domain (like `mops.twse.com.tw`) for security reasons. This server circumvents that issue.
-   **Functionality**:
    -   It exposes a single API endpoint: `POST /api/taiwan-mops`.
    -   When the frontend sends a request to this endpoint, the server forwards the exact same request to the official Taiwan Market Observation Post System (MOPS) API: `https://mops.twse.com.tw/mops/api/t05st10_ifrs`.
    -   It includes necessary headers (`User-Agent`, `Referer`, etc.) to mimic a legitimate browser request.
    -   It receives the JSON response from the MOPS API and pipes it back to the frontend.
    -   It includes basic error handling to check if the response from MOPS is valid JSON or a rate-limiting/CAPTCHA HTML page.

### Data Flow Diagram

```
User Action (in browser)
       │
       └──> 1. Enters codes/date in index.html
       │
       └──> 2. JS sends POST request to http://localhost:3001/api/taiwan-mops
                                │
                                │
                      3. server.js receives request
                                │
                                │
                      4. Forwards POST request to https://mops.twse.com.tw/...
                                │                                        │
                                │                                        ▼
                                │                                  MOPS API Server
                                │                                        │
                                │                                        ▼
                      7. Sends JSON back to browser <── 6. Returns JSON data
                                │
                                │
       8. JS in index.html parses data, renders charts & table
       │
       ▼
Display to User
```

## 🛠️ Setup and Usage

1.  **Prerequisites**: You need to have [Node.js](https://nodejs.org/) installed on your machine.

2.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd taiwan-stock-analyzer
    ```

3.  **Install Backend Dependencies**:
    In the project directory, run the following command to install the required Node.js packages:
    ```bash
    npm install express cors node-fetch
    ```

4.  **Start the Proxy Server**:
    ```bash
    node server.js
    ```
    You should see a confirmation message: `✅ Proxy server running at http://localhost:3001`.

5.  **Open the Application**:
    Open the `index.html` file directly in your web browser (e.g., Chrome, Firefox).

6.  **Use the Analyzer**:
    -   Enter a company stock code in the "Company Code 1" field (e.g., 2330 for TSMC).
    -   Optionally, enter a second code in the "Company Code 2" field for comparison.
    -   Select a "Start Date".
    -   Click the "Fetch & Compare" button and wait for the data to load.

## 💻 Technologies Used

-   **Frontend**:
    -   HTML5
    -   CSS3
    -   Vanilla JavaScript
    -   [Chart.js](https://www.chartjs.org/)
-   **Backend**:
    -   [Node.js](https://nodejs.org/)
    -   [Express.js](https://expressjs.com/)
    -   [node-fetch](https://www.npmjs.com/package/node-fetch)
    -   [cors](https://www.npmjs.com/package/cors)
-   **Data Source**:
    -   [Taiwan Stock Exchange (MOPS) API](https://mops.twse.com.tw/)
