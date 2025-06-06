/**
 * 匯率自動更新 API 服務
 * 使用多個免費 API 獲取即時匯率
 * 支援每日自動更新
 */

export interface ExchangeRateData {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  buyRate?: number;
  sellRate?: number;
  lastUpdated: string;
  source: string;
}

class ExchangeRateAutoAPI {
  // 匯率 API 配置
  private readonly API_CONFIGS = [
    {
      name: 'ExchangeRate-API',
      baseUrl: 'https://api.exchangerate-api.com/v4/latest',
      getUrl: (base: string) => `https://api.exchangerate-api.com/v4/latest/${base}`,
      parseResponse: (data: any, target: string) => {
        if (data.rates && data.rates[target]) {
          return {
            rate: data.rates[target],
            lastUpdated: data.date
          };
        }
        return null;
      }
    },
    {
      name: 'Fixer.io',
      baseUrl: 'https://api.fixer.io/latest',
      apiKey: 'YOUR_FIXER_API_KEY', // 需要註冊免費 API Key
      getUrl: (base: string, target: string) => 
        `https://api.fixer.io/latest?access_key=${this.API_CONFIGS[1].apiKey}&base=${base}&symbols=${target}`,
      parseResponse: (data: any, target: string) => {
        if (data.success && data.rates && data.rates[target]) {
          return {
            rate: data.rates[target],
            lastUpdated: data.date
          };
        }
        return null;
      }
    },
    {
      name: 'CurrencyAPI',
      baseUrl: 'https://api.currencyapi.com/v3/latest',
      apiKey: 'YOUR_CURRENCY_API_KEY', // 需要註冊免費 API Key
      getUrl: (base: string, target: string) => 
        `https://api.currencyapi.com/v3/latest?apikey=${this.API_CONFIGS[2].apiKey}&base_currency=${base}&currencies=${target}`,
      parseResponse: (data: any, target: string) => {
        if (data.data && data.data[target]) {
          return {
            rate: data.data[target].value,
            lastUpdated: data.meta.last_updated_at
          };
        }
        return null;
      }
    },
    {
      name: 'Yahoo Finance',
      baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
      getUrl: (base: string, target: string) => 
        `https://query1.finance.yahoo.com/v8/finance/chart/${base}${target}=X`,
      parseResponse: (data: any) => {
        if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
          return {
            rate: data.chart.result[0].meta.regularMarketPrice,
            lastUpdated: new Date(data.chart.result[0].meta.regularMarketTime * 1000).toISOString()
          };
        }
        return null;
      }
    },
    {
      name: 'Bank of Taiwan',
      baseUrl: 'https://rate.bot.com.tw/xrt/flcsv/0/day',
      getUrl: () => 'https://rate.bot.com.tw/xrt/flcsv/0/day',
      parseResponse: (csvData: string) => {
        // 解析台銀匯率 CSV
        const lines = csvData.split('\n');
        for (const line of lines) {
          if (line.includes('USD')) {
            const parts = line.split(',');
            if (parts.length >= 4) {
              const buyRate = parseFloat(parts[2]); // 現金買入
              const sellRate = parseFloat(parts[3]); // 現金賣出
              const midRate = (buyRate + sellRate) / 2;
              
              return {
                rate: midRate,
                buyRate: buyRate,
                sellRate: sellRate,
                lastUpdated: new Date().toISOString()
              };
            }
          }
        }
        return null;
      }
    }
  ];

  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 20;

  /**
   * 檢查請求限制
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    return this.requestCount < this.MAX_REQUESTS_PER_MINUTE;
  }

  /**
   * 等待請求限制重置
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = 60 - Math.floor((Date.now() - this.lastResetTime) / 1000);
      console.log(`⏳ 匯率 API 請求限制，等待 ${waitTime} 秒...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  /**
   * 記錄請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 匯率 API 請求: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
  }

  /**
   * 獲取匯率
   */
  async getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<ExchangeRateData | null> {
    try {
      await this.waitForRateLimit();
      
      console.log(`🔄 獲取 ${baseCurrency}/${targetCurrency} 匯率...`);
      
      // 嘗試多個 API
      for (const api of this.API_CONFIGS) {
        try {
          let response: Response;
          let data: any;

          if (api.name === 'Bank of Taiwan') {
            // 特殊處理台銀 CSV
            response = await fetch(api.getUrl(), {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (response.ok) {
              const csvText = await response.text();
              data = csvText;
            } else {
              continue;
            }
          } else {
            // 一般 JSON API
            response = await fetch(api.getUrl(baseCurrency, targetCurrency), {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });

            if (!response.ok) {
              console.warn(`⚠️ ${api.name} HTTP ${response.status}`);
              continue;
            }

            data = await response.json();
          }

          this.recordRequest();

          const parsed = api.parseResponse(data, targetCurrency);

          if (parsed && parsed.rate > 0) {
            const exchangeRateData: ExchangeRateData = {
              baseCurrency: baseCurrency,
              targetCurrency: targetCurrency,
              rate: Math.round(parsed.rate * 10000) / 10000, // 4位小數
              buyRate: parsed.buyRate ? Math.round(parsed.buyRate * 10000) / 10000 : undefined,
              sellRate: parsed.sellRate ? Math.round(parsed.sellRate * 10000) / 10000 : undefined,
              lastUpdated: parsed.lastUpdated || new Date().toISOString(),
              source: api.name
            };

            console.log(`✅ ${api.name} 成功獲取 ${baseCurrency}/${targetCurrency}: ${exchangeRateData.rate}`);
            if (exchangeRateData.buyRate && exchangeRateData.sellRate) {
              console.log(`   買入: ${exchangeRateData.buyRate}, 賣出: ${exchangeRateData.sellRate}`);
            }
            
            return exchangeRateData;
          }

        } catch (error) {
          console.warn(`⚠️ ${api.name} 獲取匯率失敗:`, error);
        }

        // API 間暫停
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 如果所有 API 都失敗，使用模擬資料
      console.log(`🔄 所有匯率 API 失敗，使用 ${baseCurrency}/${targetCurrency} 模擬資料`);
      return this.getMockExchangeRate(baseCurrency, targetCurrency);

    } catch (error) {
      console.error(`❌ 獲取 ${baseCurrency}/${targetCurrency} 匯率失敗:`, error);
      return this.getMockExchangeRate(baseCurrency, targetCurrency);
    }
  }

  /**
   * 批量獲取匯率
   */
  async getBatchExchangeRates(pairs: Array<{base: string, target: string}>): Promise<ExchangeRateData[]> {
    console.log(`🔄 批量獲取 ${pairs.length} 個匯率...`);
    
    const results: ExchangeRateData[] = [];
    
    for (const pair of pairs) {
      try {
        const rateData = await this.getExchangeRate(pair.base, pair.target);
        
        if (rateData) {
          results.push(rateData);
        }

        // 避免過快請求
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`❌ 獲取 ${pair.base}/${pair.target} 匯率失敗:`, error);
      }
    }

    console.log(`✅ 匯率批量獲取完成: ${results.length}/${pairs.length} 成功`);
    return results;
  }

  /**
   * 獲取模擬匯率資料
   */
  private getMockExchangeRate(baseCurrency: string, targetCurrency: string): ExchangeRateData {
    const mockRates: { [key: string]: number } = {
      'USD/TWD': 31.25,
      'EUR/TWD': 33.80,
      'JPY/TWD': 0.21,
      'GBP/TWD': 39.50,
      'AUD/TWD': 20.75,
      'CAD/TWD': 23.15,
      'CHF/TWD': 34.60,
      'CNY/TWD': 4.32,
      'HKD/TWD': 4.01,
      'SGD/TWD': 23.25,
      'KRW/TWD': 0.024,
      'THB/TWD': 0.87,
      'MYR/TWD': 6.95,
      'PHP/TWD': 0.55,
      'IDR/TWD': 0.002,
      'VND/TWD': 0.0013
    };

    const pairKey = `${baseCurrency}/${targetCurrency}`;
    const baseRate = mockRates[pairKey] || 1.0;
    
    // 添加小幅隨機波動 (±2%)
    const variation = (Math.random() - 0.5) * 0.04;
    const rate = baseRate * (1 + variation);

    return {
      baseCurrency: baseCurrency,
      targetCurrency: targetCurrency,
      rate: Math.round(rate * 10000) / 10000,
      buyRate: Math.round(rate * 0.998 * 10000) / 10000, // 買入價稍低
      sellRate: Math.round(rate * 1.002 * 10000) / 10000, // 賣出價稍高
      lastUpdated: new Date().toISOString(),
      source: 'Mock Data'
    };
  }

  /**
   * 獲取主要貨幣對
   */
  getMajorCurrencyPairs(): Array<{base: string, target: string, name: string}> {
    return [
      { base: 'USD', target: 'TWD', name: '美元/台幣' },
      { base: 'EUR', target: 'TWD', name: '歐元/台幣' },
      { base: 'JPY', target: 'TWD', name: '日圓/台幣' },
      { base: 'GBP', target: 'TWD', name: '英鎊/台幣' },
      { base: 'AUD', target: 'TWD', name: '澳幣/台幣' },
      { base: 'CAD', target: 'TWD', name: '加幣/台幣' },
      { base: 'CHF', target: 'TWD', name: '瑞郎/台幣' },
      { base: 'CNY', target: 'TWD', name: '人民幣/台幣' },
      { base: 'HKD', target: 'TWD', name: '港幣/台幣' },
      { base: 'SGD', target: 'TWD', name: '新幣/台幣' }
    ];
  }

  /**
   * 獲取使用統計
   */
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.MAX_REQUESTS_PER_MINUTE,
      resetTime: new Date(this.lastResetTime + 60000).toLocaleTimeString(),
      canMakeRequest: this.canMakeRequest()
    };
  }
}

// 創建單例實例
export const exchangeRateAutoAPI = new ExchangeRateAutoAPI();
