import requests
from datetime import datetime, timedelta

def to_minguo_year(year):
    """Convert Gregorian year to Minguo year."""
    return year - 1911

def generate_months(start_year, start_month):
    """Generate list of (year, month) tuples from start date to current date."""
    current = datetime.now()
    year, month = start_year, start_month
    months = []

    while (year < current.year) or (year == current.year and month <= current.month):
        months.append((year, month))
        month += 1
        if month > 12:
            year += 1
            month = 1
    return months

def fetch_revenue(company_id, year, month):
    url = "https://mops.twse.com.tw/mops/api/t05st10_ifrs"
    payload = {
        "companyId": company_id,
        "dataType": "2",
        "month": str(month),
        "year": str(to_minguo_year(year)),
        "subsidiaryCompanyId": ""
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        if data["code"] == 200 and data["result"] and "data" in data["result"]:
            result = data["result"]
            data_pairs = result["data"]
            rev_info = {item[0]: item[1] for item in data_pairs}
            return {
                "year": year,
                "month": month,
                "company": result["companyAbbreviation"],
                "revenue": rev_info.get("本月", "N/A"),
                "last_year": rev_info.get("去年同期", "N/A"),
                "change": rev_info.get("增減金額", "N/A"),
                "change_percent": rev_info.get("增減百分比", "N/A"),
                "remark": rev_info.get("備註/營收變化原因說明", "")
            }
        else:
            return {"year": year, "month": month, "error": data.get("message", "Unknown error")}
    except Exception as e:
        return {"year": year, "month": month, "error": str(e)}

def query_revenue_since(company_id, start_date_str):
    start_date = datetime.strptime(start_date_str, "%Y-%m")
    months = generate_months(start_date.year, start_date.month)
    print(f"Querying revenue for company {company_id} since {start_date_str}...\n")

    for year, month in months:
        result = fetch_revenue(company_id, year, month)
        if "error" in result:
            print(f"{year}-{month:02d}: Error - {result['error']}")
        else:
            print(f"{result['year']}-{result['month']:02d} {result['company']}: "
                  f"Revenue = {result['revenue']} M, "
                  f"YoY Change = {result['change']} M ({result['change_percent']}%)")
            if result["remark"]:
                print(f"  ↳ Remark: {result['remark']}")

# Example usage:
if __name__ == "__main__":
    company_code = "6857"         # 宏碁智醫
    starting_date = "2024-01"     # YYYY-MM format

    query_revenue_since(company_code, starting_date)

