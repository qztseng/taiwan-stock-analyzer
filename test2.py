import tejapi
import pandas as pd
from datetime import datetime

# --- Configuration ---
# You need to set your TEJ API key here.
# Get your key from the TEJ website after you have registered.
# Your TEJ API key is a string like 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.
# DO NOT COMMIT YOUR API KEY TO A PUBLIC REPOSITORY.
tejapi.set_key('AzQyaIfkSeZmvlJl44ENjUOnA0U5xp')

# List of company codes to query
company_codes = ['2330', '6841', '6857']

def get_latest_price(code):
    """
    Queries the TEJ API for the latest closing price of a given company code.
    
    Args:
        code (str): The company code (e.g., '2330').
        
    Returns:
        float: The latest closing price, or None if the data is not found.
    """
    try:
        # Use the 'TWN/APRCD' table, which contains daily stock prices for Taiwan.
        # 'coid' is the company code column.
        # 'mdate' is the market date column.
        # We sort by 'mdate' descending to get the latest data first.
        # We only fetch the first record and specific columns to optimize the query.
        data = tejapi.get(
            'TWN/APRCD',
            coid=code,
            paginate=True,
            opts={'columns': ['coid', 'mdate', 'close_d']},
            sort={'mdate': 'desc'},
            chinese_column_name=True
        )
        
        # Check if any data was returned
        if not data.empty:
            # The latest price is in the first row
            latest_record = data.iloc[0]
            price = latest_record['收盤價(元)'] # 'close_d'
            date = latest_record['年月日'] # 'mdate'
            
            print(f"[{code}] Latest share price: {price} on {date.strftime('%Y-%m-%d')}")
            return price
        else:
            print(f"No data found for company code: {code}")
            return None
            
    except Exception as e:
        print(f"An error occurred while fetching data for {code}: {e}")
        return None

def main():
    """Main function to run the queries for all specified companies."""
    print("--- Fetching Latest Share Prices ---")
    for code in company_codes:
        get_latest_price(code)
    print("--- Query Complete ---")

if __name__ == "__main__":
    main()


