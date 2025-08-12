# -*- coding: utf-8 -*-
import requests
import json
import time

# 定義 API 的基礎 URL
TWSE_BASE_URL = "https://openapi.twse.com.tw"
TPEX_BASE_URL = "https://www.tpex.org.tw/openapi/v1"

def get_twse_stock_data(stock_codes):
    """
    獲取台灣證券交易所 (TWSE) 股票資料。
    API Endpoint: /v1/exchangeReport/STOCK_DAY_AVG_ALL
    此 API 回傳所有股票的每月平均價格。
    參數: 無
    """
    print("--- 測試 TWSE API: 獲取所有股票的每月平均價格 ---")
    api_url = f"{TWSE_BASE_URL}/v1/exchangeReport/STOCK_DAY_AVG_ALL"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()  # 如果請求不成功，拋出 HTTPError
        all_stocks_data = response.json()
        
        found_any = False
        if all_stocks_data:
            print(f"成功獲取所有 TWSE 股票資料，共 {len(all_stocks_data)} 筆。")
            for stock_data in all_stocks_data:
                # 檢查是否為我們感興趣的股票代號
                if stock_data.get('Code') in stock_codes:
                    code = stock_data.get('Code')
                    name = stock_data.get('Name')
                    closing_price = stock_data.get('ClosingPrice')
                    monthly_avg_price = stock_data.get('MonthlyAveragePrice')
                    
                    print(f"TWSE -> 股票代號: {code} ({name})")
                    print(f"  收盤價: {closing_price}")
                    print(f"  每月平均價: {monthly_avg_price}")
                    found_any = True
            
        if not found_any:
            print(f"在 TWSE API 資料中未能找到任何指定的股票代號。")
            
    except requests.exceptions.RequestException as e:
        print(f"TWSE API 請求失敗: {e}")
    except (KeyError, IndexError) as e:
        print(f"解析 TWSE API 資料時發生錯誤: {e}")
    finally:
        print("---------------------------------")


def get_tpex_otc_data(stock_codes):
    """
    獲取櫃買中心 (TPEx) OTC 股票資料。
    API Endpoint: /openapi/v1/tpex_mainboard_daily_close_quotes
    此 API 回傳所有 OTC 股票的收盤報價。
    參數: 無
    """
    print(f"--- 測試 TPEx OTC API: 獲取所有股票的每日收盤報價 ---")
    api_url = f"{TPEX_BASE_URL}/tpex_mainboard_daily_close_quotes"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        all_stocks_data = response.json()
        
        found_any = False
        if all_stocks_data:
            print(f"成功獲取所有 TPEx OTC 股票資料，共 {len(all_stocks_data)} 筆。")
            for stock_data in all_stocks_data:
                if stock_data.get('SecuritiesCompanyCode') in stock_codes:
                    stock_no = stock_data.get('SecuritiesCompanyCode')
                    # 更新為使用 'Average' 欄位
                    average_price = stock_data.get('Average')  # 平均價
                    trade_shares = stock_data.get('TradingShares') # 成交股數
                    
                    print(f"TPEx OTC -> 股票代號: {stock_no} ({stock_data.get('CompanyName')})")
                    print(f"  平均價: {average_price}")
                    print(f"  成交股數: {trade_shares}")
                    found_any = True
        
        if not found_any:
            print(f"在 TPEx OTC API 資料中未能找到任何指定的股票代號。")
            
    except requests.exceptions.RequestException as e:
        print(f"TPEx OTC API 請求失敗: {e}")
    except (KeyError, IndexError) as e:
        print(f"解析 TPEx OTC API 資料時發生錯誤: {e}")
    finally:
        print("---------------------------------")


def get_tpex_emerging_data(stock_codes):
    """
    獲取櫃買中心 (TPEx) 興櫃股票資料。
    API Endpoint: /openapi/v1/tpex_esb_latest_statistics
    此 API 回傳所有興櫃股票的即時報價。
    參數: 無
    """
    print(f"--- 測試 TPEx 興櫃 API: 獲取所有股票的即時報價 ---")
    api_url = f"{TPEX_BASE_URL}/tpex_esb_latest_statistics"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()
        all_stocks_data = response.json()

        found_any = False
        if all_stocks_data:
            print(f"成功獲取所有 TPEx 興櫃股票資料，共 {len(all_stocks_data)} 筆。")
            for stock_data in all_stocks_data:
                if stock_data.get('SecuritiesCompanyCode') in stock_codes:
                    stock_no = stock_data.get('SecuritiesCompanyCode')
                    # 使用 'PreviousAveragePrice'
                    previous_avg_price = stock_data.get('PreviousAveragePrice')  # 前一平均價
                    trade_volume = stock_data.get('TransactionVolume') # 成交量
                    
                    print(f"TPEx 興櫃 -> 股票代號: {stock_no} ({stock_data.get('CompanyName')})")
                    print(f"  前一平均價: {previous_avg_price}")
                    print(f"  成交量: {trade_volume}")
                    found_any = True
        
        if not found_any:
            print(f"在 TPEx 興櫃 API 資料中未能找到任何指定的股票代號。")
            
    except requests.exceptions.RequestException as e:
        print(f"TPEx 興櫃 API 請求失敗: {e}")
    except (KeyError, IndexError) as e:
        print(f"解析 TPEx 興櫃 API 資料時發生錯誤: {e}")
    finally:
        print("---------------------------------")


if __name__ == "__main__":
    # 測試的股票代號列表
    stock_codes_to_test = ["2330", "6841", "6857"]
    
    # 執行 TWSE API 測試
    get_twse_stock_data(stock_codes_to_test)
    time.sleep(1) # 暫停 1 秒以避免 API 呼叫過於頻繁

    # 執行 TPEx OTC API 測試
    get_tpex_otc_data(stock_codes_to_test)
    time.sleep(1) # 暫停 1 秒

    # 執行 TPEx 興櫃 API 測試
    get_tpex_emerging_data(stock_codes_to_test)

