/**
 * 台股資料 Hook
 * 用於 React Native 組件中獲取和管理股票資料
 */

import { useState, useEffect } from 'react';
import { stockService } from '../src/services/supabase';

export interface Stock {
  code: string;
  name: string;
  market_type: 'TSE' | 'OTC' | 'ETF';
  closing_price: number;
  opening_price?: number;
  highest_price?: number;
  lowest_price?: number;
  volume?: number;
  transaction_count?: number;
  turnover?: number;
  price_change?: number;
  change_percent?: number;
  price_date: string;
  created_at: string;
  updated_at: string;
}

export interface StockFilters {
  market_type?: 'TSE' | 'OTC' | 'ETF';
  search?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'code' | 'name' | 'closing_price' | 'volume' | 'change_percent';
  sort_order?: 'asc' | 'desc';
  limit?: number;
}

export const useStocks = (filters?: StockFilters) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      setError(null);

      // 使用 HTTP API 獲取股票資料
      const results = await stockService.searchStocks(
        filters?.search || '',
        filters?.market_type,
        filters?.limit || 50
      );

      setStocks(results);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('獲取股票資料失敗:', err);
      setError(err instanceof Error ? err.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, [
    filters?.market_type,
    filters?.search,
    filters?.min_price,
    filters?.max_price,
    filters?.sort_by,
    filters?.sort_order,
    filters?.limit
  ]);

  const refreshStocks = () => {
    fetchStocks();
  };

  return {
    stocks,
    loading,
    error,
    lastUpdated,
    refreshStocks
  };
};

// 獲取熱門股票
export const usePopularStocks = (limit: number = 20) => {
  return useStocks({
    sort_by: 'volume',
    sort_order: 'desc',
    limit
  });
};

// 獲取漲跌幅排行
export const usePriceMovers = (type: 'gainers' | 'losers' = 'gainers', limit: number = 20) => {
  return useStocks({
    sort_by: 'change_percent',
    sort_order: type === 'gainers' ? 'desc' : 'asc',
    limit
  });
};

// 獲取特定市場股票
export const useMarketStocks = (market_type: 'TSE' | 'OTC' | 'ETF') => {
  return useStocks({ market_type });
};

// 搜尋股票
export const useStockSearch = (searchTerm: string) => {
  return useStocks({
    search: searchTerm,
    limit: 50
  });
};

// 獲取股票統計
export const useStockStats = () => {
  const [stats, setStats] = useState<{
    total: number;
    tse_count: number;
    otc_count: number;
    etf_count: number;
    avg_price: number;
    total_volume: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await stockService.getMarketStats();

        if (data && data.length > 0) {
          const tseData = data.find((item: any) => item.market_type === 'TSE');
          const otcData = data.find((item: any) => item.market_type === 'OTC');
          const etfData = data.find((item: any) => item.market_type === 'ETF');

          setStats({
            total: (tseData?.stock_count || 0) + (otcData?.stock_count || 0) + (etfData?.stock_count || 0),
            tse_count: tseData?.stock_count || 0,
            otc_count: otcData?.stock_count || 0,
            etf_count: etfData?.stock_count || 0,
            avg_price: ((tseData?.avg_price || 0) + (otcData?.avg_price || 0) + (etfData?.avg_price || 0)) / 3,
            total_volume: (tseData?.total_volume || 0) + (otcData?.total_volume || 0) + (etfData?.total_volume || 0)
          });
        }
      } catch (error) {
        console.error('獲取統計資料失敗:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading };
};
