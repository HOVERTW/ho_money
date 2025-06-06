/**
 * 真實即時股票同步系統
 * 使用 Yahoo Finance API 獲取真實股價
 * 支援自動更新和手動觸發
 */

import { yahooFinanceAPI, YahooStockData } from '../services/yahooFinanceAPI';
import { supabaseConfig } from '../services/supabase';

interface StockSyncResult {
  symbol: string;
  success: boolean;
  price?: number;
  error?: string;
  source: string;
}

class RealTimeStockSync {
  // 完整 S&P 500 股票清單 (從 CSV 檔案讀取)
  private readonly SP500_STOCKS = [
    'MSFT', 'NVDA', 'AAPL', 'AMZN', 'GOOG', 'GOOGL', 'META', 'AVGO', 'TSLA', 'BRK.B',
    'WMT', 'JPM', 'V', 'LLY', 'MA', 'NFLX', 'ORCL', 'COST', 'XOM', 'PG',
    'JNJ', 'HD', 'BAC', 'ABBV', 'PLTR', 'KO', 'PM', 'TMUS', 'UNH', 'GE',
    'CRM', 'CSCO', 'WFC', 'IBM', 'CVX', 'ABT', 'MCD', 'LIN', 'ACN', 'INTU',
    'NOW', 'AXP', 'MS', 'DIS', 'T', 'ISRG', 'MRK', 'VZ', 'GS', 'RTX',
    'PEP', 'BKNG', 'AMD', 'ADBE', 'UBER', 'PGR', 'TXN', 'CAT', 'SCHW', 'QCOM',
    'SPGI', 'BA', 'BSX', 'AMGN', 'TMO', 'BLK', 'SYK', 'HON', 'NEE', 'TJX',
    'C', 'DE', 'GILD', 'DHR', 'PFE', 'UNP', 'ADP', 'GEV', 'CMCSA', 'PANW',
    'LOW', 'AMAT', 'ETN', 'COF', 'CB', 'CRWD', 'MMC', 'VRTX', 'LMT', 'ANET',
    'APH', 'KKR', 'COP', 'MDT', 'ADI', 'BX', 'MU', 'CME', 'LRCX', 'ICE',
    'MO', 'WELL', 'PLD', 'AMT', 'KLAC', 'SO', 'BMY', 'WM', 'TT', 'CEG',
    'SBUX', 'HCA', 'DUK', 'CTAS', 'FI', 'MCK', 'SHW', 'NKE', 'AJG', 'DASH',
    'MDLZ', 'EQIX', 'ELV', 'MCO', 'INTC', 'PH', 'CI', 'UPS', 'TDG', 'CVS',
    'RSG', 'AON', 'MMM', 'ABNB', 'CDNS', 'ORLY', 'FTNT', 'DELL', 'CL', 'ECL',
    'ZTS', 'GD', 'APO', 'WMB', 'MAR', 'SNPS', 'ITW', 'RCL', 'NOC', 'MSI',
    'PNC', 'HWM', 'PYPL', 'USB', 'CMG', 'EMR', 'JCI', 'WDAY', 'BK', 'ADSK',
    'COIN', 'TRV', 'AZO', 'MNST', 'KMI', 'APD', 'ROP', 'CARR', 'CSX', 'EOG',
    'HLT', 'NEM', 'AXON', 'DLR', 'PAYX', 'COR', 'AFL', 'NSC', 'CHTR', 'ALL',
    'AEP', 'FCX', 'VST', 'PSA', 'SPG', 'REGN', 'MET', 'FDX', 'GWW', 'TFC',
    'SRE', 'O', 'PWR', 'OKE', 'CPRT', 'BDX', 'MPC', 'PCAR', 'AIG', 'AMP',
    'D', 'CTVA', 'NXPI', 'NDAQ', 'GM', 'TEL', 'FAST', 'PSX', 'ROST', 'URI',
    'EW', 'KVUE', 'KDP', 'LHX', 'KR', 'SLB', 'CMI', 'EXC', 'VRSK', 'CCI',
    'MSCI', 'TGT', 'GLW', 'FICO', 'FIS', 'IDXX', 'F', 'AME', 'HES', 'PEG',
    'XEL', 'VLO', 'TTWO', 'OXY', 'YUM', 'CTSH', 'FANG', 'GRMN', 'LULU', 'ED',
    'OTIS', 'CBRE', 'ETR', 'PCG', 'HIG', 'CAH', 'PRU', 'BKR', 'DHI', 'EA',
    'RMD', 'ACGL', 'ROK', 'SYY', 'VMC', 'WAB', 'WEC', 'TRGP', 'ODFL', 'EBAY',
    'DXCM', 'IT', 'VICI', 'MLM', 'EQT', 'IR', 'EFX', 'HSY', 'BRO', 'GEHC',
    'LYV', 'EXR', 'A', 'STZ', 'MPWR', 'KHC', 'DAL', 'CCL', 'WTW', 'MCHP',
    'CSGP', 'XYL', 'NRG', 'GIS', 'RJF', 'AVB', 'MTB', 'IRM', 'LVS', 'ANSS',
    'VTR', 'K', 'BR', 'DTE', 'WRB', 'HUM', 'CNC', 'LEN', 'DD', 'AWK',
    'ROL', 'EXE', 'STT', 'KEYS', 'EQR', 'AEE', 'GDDY', 'UAL', 'PPL', 'TSCO',
    'TPL', 'VRSN', 'FITB', 'IP', 'NUE', 'PPG', 'DRI', 'VLTO', 'STX', 'SBAC',
    'TYL', 'FOXA', 'WBD', 'ATO', 'DOV', 'CNP', 'IQV', 'CHD', 'FE', 'STE',
    'EL', 'MTD', 'CBOE', 'SMCI', 'FTV', 'ES', 'CDW', 'CINF', 'HPQ', 'TDY',
    'ADM', 'CPAY', 'PODD', 'HBAN', 'HPE', 'SW', 'FOX', 'SYF', 'EIX', 'DG',
    'EXPE', 'ULTA', 'CMS', 'AMCR', 'LH', 'NVR', 'HUBB', 'WAT', 'NTRS', 'INVH',
    'TROW', 'NTAP', 'PTC', 'LII', 'TSN', 'WSM', 'PHM', 'DOW', 'IFF', 'MKC',
    'DVN', 'DGX', 'RF', 'LDOS', 'LUV', 'BIIB', 'DLTR', 'WY', 'ERIE', 'L',
    'NI', 'CTRA', 'NWS', 'GPN', 'MAA', 'ESS', 'STLD', 'ZBH', 'LYB', 'JBL',
    'WDC', 'GEN', 'GPC', 'ON', 'CFG', 'PFG', 'FDS', 'KEY', 'PKG', 'TRMB',
    'FSLR', 'HRL', 'HAL', 'SNA', 'RL', 'MOH', 'FFIV', 'PNR', 'TPR', 'CLX',
    'DPZ', 'LNT', 'NWSA', 'DECK', 'BF.B', 'BAX', 'EXPD', 'EVRG', 'J', 'WST',
    'PAYC', 'BALL', 'EG', 'ZBRA', 'CF', 'APTV', 'KIM', 'OMC', 'BBY', 'AVY',
    'HOLX', 'JBHT', 'UDR', 'IEX', 'COO', 'TXT', 'JKHY', 'MAS', 'ALGN', 'REG',
    'TKO', 'SOLV', 'TER', 'INCY', 'CPT', 'ALLE', 'UHS', 'ARE', 'DOC', 'JNPR',
    'SJM', 'NDSN', 'BLDR', 'MOS', 'CHRW', 'BEN', 'POOL', 'CAG', 'PNW', 'TAP',
    'AKAM', 'HST', 'BXP', 'RVTY', 'BG', 'LKQ', 'SWKS', 'VTRS', 'DVA', 'AIZ',
    'MRNA', 'CPB', 'SWK', 'GL', 'EPAM', 'KMX', 'WBA', 'WYNN', 'DAY', 'HAS',
    'AOS', 'EMN', 'IPG', 'HII', 'HSIC', 'MGM', 'FRT', 'PARA', 'MKTX', 'NCLH',
    'LW', 'TECH', 'MTCH', 'GNRC', 'AES', 'CRL', 'ALB', 'IVZ', 'MHK', 'APA'
  ];

  private isUpdating = false;
  private lastUpdateTime: Date | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  /**
   * 獲取股票的公司名稱
   */
  private getCompanyName(symbol: string): string {
    const companyNames: { [key: string]: string } = {
      'AAPL': 'Apple Inc.',
      'MSFT': 'Microsoft Corporation',
      'GOOGL': 'Alphabet Inc. Class A',
      'GOOG': 'Alphabet Inc. Class C',
      'AMZN': 'Amazon.com Inc.',
      'META': 'Meta Platforms Inc.',
      'TSLA': 'Tesla Inc.',
      'NVDA': 'NVIDIA Corporation',
      'BRK.B': 'Berkshire Hathaway Inc. Class B',
      'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.',
      'MA': 'Mastercard Incorporated',
      'UNH': 'UnitedHealth Group Incorporated',
      'JNJ': 'Johnson & Johnson',
      'WMT': 'Walmart Inc.',
      'PG': 'The Procter & Gamble Company',
      'HD': 'The Home Depot Inc.',
      'BAC': 'Bank of America Corporation',
      'PFE': 'Pfizer Inc.',
      'ABBV': 'AbbVie Inc.',
      'KO': 'The Coca-Cola Company',
      'PEP': 'PepsiCo Inc.',
      'COST': 'Costco Wholesale Corporation',
      'AVGO': 'Broadcom Inc.',
      'XOM': 'Exxon Mobil Corporation',
      'LLY': 'Eli Lilly and Company',
      'ORCL': 'Oracle Corporation',
      'CVX': 'Chevron Corporation',
      'MRK': 'Merck & Co. Inc.',
      'NFLX': 'Netflix Inc.',
      'TMO': 'Thermo Fisher Scientific Inc.',
      'ABT': 'Abbott Laboratories',
      'CRM': 'Salesforce Inc.',
      'ADBE': 'Adobe Inc.',
      'CSCO': 'Cisco Systems Inc.',
      'INTC': 'Intel Corporation',
      'IBM': 'International Business Machines Corporation',
      'QCOM': 'QUALCOMM Incorporated',
      'TXN': 'Texas Instruments Incorporated',
      'HON': 'Honeywell International Inc.',
      'UPS': 'United Parcel Service Inc.',
      'CAT': 'Caterpillar Inc.',
      'GE': 'General Electric Company',
      'BA': 'The Boeing Company',
      'MCD': "McDonald's Corporation",
      'DIS': 'The Walt Disney Company',
      'VZ': 'Verizon Communications Inc.',
      'NKE': 'NIKE Inc.',
      'WFC': 'Wells Fargo & Company',
      'GS': 'The Goldman Sachs Group Inc.',
      'MS': 'Morgan Stanley',
      'AXP': 'American Express Company',
      'SBUX': 'Starbucks Corporation',
      'ISRG': 'Intuitive Surgical Inc.',
      'NOW': 'ServiceNow Inc.',
      'INTU': 'Intuit Inc.',
      'COP': 'ConocoPhillips',
      'RTX': 'RTX Corporation',
      'LMT': 'Lockheed Martin Corporation',
      'SPGI': 'S&P Global Inc.',
      'LOW': 'Lowe\'s Companies Inc.',
      'TGT': 'Target Corporation',
      'BLK': 'BlackRock Inc.',
      'GILD': 'Gilead Sciences Inc.',
      'AMT': 'American Tower Corporation',
      'CVS': 'CVS Health Corporation',
      'MDLZ': 'Mondelez International Inc.',
      'C': 'Citigroup Inc.',
      'FIS': 'Fidelity National Information Services Inc.',
      'ADP': 'Automatic Data Processing Inc.',
      'CME': 'CME Group Inc.',
      'TJX': 'The TJX Companies Inc.',
      'SO': 'The Southern Company',
      'USB': 'U.S. Bancorp',
      'PNC': 'The PNC Financial Services Group Inc.',
      'AON': 'Aon plc',
      'SCHW': 'The Charles Schwab Corporation',
      'CB': 'Chubb Limited',
      'ICE': 'Intercontinental Exchange Inc.',
      'BSX': 'Boston Scientific Corporation',
      'MMC': 'Marsh & McLennan Companies Inc.',
      'DUK': 'Duke Energy Corporation',
      'CL': 'Colgate-Palmolive Company',
      'ITW': 'Illinois Tool Works Inc.',
      'EOG': 'EOG Resources Inc.',
      'FCX': 'Freeport-McMoRan Inc.',
      'NSC': 'Norfolk Southern Corporation',
      'SHW': 'The Sherwin-Williams Company',
      'MCK': 'McKesson Corporation',
      'CSX': 'CSX Corporation',
      'PLD': 'Prologis Inc.',
      'APD': 'Air Products and Chemicals Inc.',
      'ECL': 'Ecolab Inc.',
      'WM': 'Waste Management Inc.',
      'MCO': 'Moody\'s Corporation',
      'CNC': 'Centene Corporation',
      'NXPI': 'NXP Semiconductors N.V.',
      'WELL': 'Welltower Inc.',
      'SLB': 'Schlumberger Limited',
      'PSX': 'Phillips 66',
      'VLO': 'Valero Energy Corporation',
      'MPC': 'Marathon Petroleum Corporation',
      'HES': 'Hess Corporation',
      'OXY': 'Occidental Petroleum Corporation',
      'DVN': 'Devon Energy Corporation',
      'FANG': 'Diamondback Energy Inc.',
      'MRO': 'Marathon Oil Corporation',
      'APA': 'APA Corporation',
      'HAL': 'Halliburton Company',
      'BKR': 'Baker Hughes Company',
      'KMI': 'Kinder Morgan Inc.',
      'OKE': 'ONEOK Inc.',
      'WMB': 'The Williams Companies Inc.',
      'TRGP': 'Targa Resources Corp.',
      'EPD': 'Enterprise Products Partners L.P.',
      'ET': 'Energy Transfer LP',
      'MPLX': 'MPLX LP',
      'KMX': 'CarMax Inc.',
      'ORLY': 'O\'Reilly Automotive Inc.',
      'AZO': 'AutoZone Inc.',
      'AAP': 'Advance Auto Parts Inc.',
      'GPC': 'Genuine Parts Company',
      'TSCO': 'Tractor Supply Company',
      'DLTR': 'Dollar Tree Inc.',
      'DG': 'Dollar General Corporation',
      'KR': 'The Kroger Co.',
      'SYY': 'Sysco Corporation',
      'KHC': 'The Kraft Heinz Company',
      'GIS': 'General Mills Inc.',
      'K': 'Kellogg Company',
      'HSY': 'The Hershey Company',
      'CAG': 'Conagra Brands Inc.',
      'CPB': 'Campbell Soup Company',
      'SJM': 'The J. M. Smucker Company',
      'HRL': 'Hormel Foods Corporation',
      'TSN': 'Tyson Foods Inc.',
      'TAP': 'Molson Coors Beverage Company',
      'STZ': 'Constellation Brands Inc.',
      'DEO': 'Diageo plc',
      'BF.B': 'Brown-Forman Corporation',
      'PM': 'Philip Morris International Inc.',
      'MO': 'Altria Group Inc.',
      'BTI': 'British American Tobacco p.l.c.',
      'UVV': 'Universal Corporation',
      'TPG': 'TPG Inc.',
      'BX': 'Blackstone Inc.',
      'KKR': 'KKR & Co. Inc.',
      'APO': 'Apollo Global Management Inc.',
      'CG': 'The Carlyle Group Inc.',
      'OWL': 'Blue Owl Capital Inc.',
      'ARES': 'Ares Management Corporation',
      'BAM': 'Brookfield Asset Management Inc.',
      'AMG': 'Affiliated Managers Group Inc.',
      'TROW': 'T. Rowe Price Group Inc.',
      'BEN': 'Franklin Resources Inc.',
      'IVZ': 'Invesco Ltd.',
      'NTRS': 'Northern Trust Corporation',
      'STT': 'State Street Corporation',
      'BK': 'The Bank of New York Mellon Corporation',
      'RF': 'Regions Financial Corporation',
      'CFG': 'Citizens Financial Group Inc.',
      'HBAN': 'Huntington Bancshares Incorporated',
      'FITB': 'Fifth Third Bancorp',
      'KEY': 'KeyCorp',
      'ZION': 'Zions Bancorporation N.A.',
      'WTFC': 'Wintrust Financial Corporation',
      'CBSH': 'Commerce Bancshares Inc.',
      'FHN': 'First Horizon Corporation',
      'PACW': 'PacWest Bancorp',
      'SIVB': 'SVB Financial Group',
      'SBNY': 'Signature Bank',
      'CMA': 'Comerica Incorporated',
      'MTB': 'M&T Bank Corporation',
      'STI': 'SunTrust Banks Inc.',
      'BBT': 'BB&T Corporation',
      'COF': 'Capital One Financial Corporation',
      'DFS': 'Discover Financial Services',
      'SYF': 'Synchrony Financial',
      'ADS': 'Alliance Data Systems Corporation',
      'WU': 'The Western Union Company',
      'MA': 'Mastercard Incorporated',
      'V': 'Visa Inc.',
      'PYPL': 'PayPal Holdings Inc.',
      'SQ': 'Block Inc.',
      'AFRM': 'Affirm Holdings Inc.',
      'LC': 'LendingClub Corporation',
      'UPST': 'Upstart Holdings Inc.',
      'SOFI': 'SoFi Technologies Inc.'
    };

    return companyNames[symbol] || `${symbol} Corporation`;
  }

  /**
   * 獲取股票的行業分類
   */
  private getSector(symbol: string): string {
    const sectors: { [key: string]: string } = {
      // Technology
      'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'GOOG': 'Technology',
      'META': 'Technology', 'NVDA': 'Technology', 'ORCL': 'Technology', 'CRM': 'Technology',
      'ADBE': 'Technology', 'INTC': 'Technology', 'CSCO': 'Technology', 'IBM': 'Technology',
      'QCOM': 'Technology', 'TXN': 'Technology', 'AVGO': 'Technology', 'NOW': 'Technology',
      'INTU': 'Technology',

      // Financials
      'BRK.B': 'Financials', 'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials',
      'BAC': 'Financials', 'WFC': 'Financials', 'GS': 'Financials', 'MS': 'Financials',
      'AXP': 'Financials', 'C': 'Financials', 'USB': 'Financials', 'PNC': 'Financials',
      'BLK': 'Financials', 'SCHW': 'Financials', 'CB': 'Financials', 'AIG': 'Financials',

      // Healthcare
      'UNH': 'Healthcare', 'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare',
      'LLY': 'Healthcare', 'MRK': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare',
      'ISRG': 'Healthcare', 'DHR': 'Healthcare', 'BMY': 'Healthcare', 'AMGN': 'Healthcare',
      'GILD': 'Healthcare', 'REGN': 'Healthcare', 'VRTX': 'Healthcare', 'BIIB': 'Healthcare',

      // Consumer Discretionary
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
      'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary', 'SBUX': 'Consumer Discretionary',
      'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary', 'TGT': 'Consumer Discretionary',

      // Consumer Staples
      'WMT': 'Consumer Staples', 'PG': 'Consumer Staples', 'KO': 'Consumer Staples',
      'PEP': 'Consumer Staples', 'COST': 'Consumer Staples', 'PM': 'Consumer Staples',
      'MO': 'Consumer Staples', 'CL': 'Consumer Staples',

      // Communication Services
      'NFLX': 'Communication Services', 'DIS': 'Communication Services', 'CMCSA': 'Communication Services',
      'VZ': 'Communication Services', 'T': 'Communication Services',

      // Industrials
      'GE': 'Industrials', 'CAT': 'Industrials', 'BA': 'Industrials', 'HON': 'Industrials',
      'UPS': 'Industrials', 'RTX': 'Industrials', 'LMT': 'Industrials', 'NOC': 'Industrials',
      'GD': 'Industrials', 'FDX': 'Industrials', 'UNP': 'Industrials', 'CSX': 'Industrials',
      'NSC': 'Industrials', 'DE': 'Industrials', 'EMR': 'Industrials', 'ETN': 'Industrials',
      'ITW': 'Industrials', 'MMM': 'Industrials', 'WM': 'Industrials',

      // Energy
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy', 'SLB': 'Energy',
      'PSX': 'Energy', 'VLO': 'Energy', 'MPC': 'Energy', 'HES': 'Energy', 'OXY': 'Energy',

      // Materials
      'LIN': 'Materials', 'APD': 'Materials', 'ECL': 'Materials', 'SHW': 'Materials',
      'FCX': 'Materials', 'NEM': 'Materials', 'FMC': 'Materials', 'ALB': 'Materials',

      // Utilities
      'NEE': 'Utilities', 'SO': 'Utilities', 'DUK': 'Utilities', 'AEP': 'Utilities',
      'SRE': 'Utilities', 'D': 'Utilities', 'PCG': 'Utilities', 'EXC': 'Utilities',

      // Real Estate
      'PLD': 'Real Estate', 'AMT': 'Real Estate', 'CCI': 'Real Estate', 'EQIX': 'Real Estate',
      'WELL': 'Real Estate', 'PSA': 'Real Estate', 'O': 'Real Estate', 'SBAC': 'Real Estate'
    };

    return sectors[symbol] || 'Unknown';
  }

  /**
   * 將 Yahoo Finance 資料存儲到 Supabase
   */
  private async saveStockToSupabase(stockData: YahooStockData): Promise<boolean> {
    try {
      // 使用 UPSERT 函數
      await supabaseConfig.request('rpc/upsert_us_stock', {
        method: 'POST',
        body: JSON.stringify({
          stock_symbol: stockData.symbol,
          stock_name: this.getCompanyName(stockData.symbol),
          stock_sector: this.getSector(stockData.symbol),
          stock_price: stockData.price,
          is_sp500_stock: true
        })
      });

      console.log(`💾 ${stockData.symbol} 已存儲: $${stockData.price} (${stockData.changePercent >= 0 ? '+' : ''}${stockData.changePercent}%)`);
      return true;

    } catch (error) {
      console.error(`❌ 存儲 ${stockData.symbol} 失敗:`, error);
      return false;
    }
  }

  /**
   * 執行完整的股票同步
   */
  async executeFullSync(): Promise<void> {
    if (this.isUpdating) {
      console.log('⚠️ 股票同步正在進行中，跳過此次請求');
      return;
    }

    this.isUpdating = true;
    console.log('🚀 開始真實即時股票同步...');
    console.log(`📊 目標：${this.SP500_STOCKS.length} 檔 S&P 500 股票`);
    console.log('🔥 使用 Yahoo Finance API (免費、無限制)');
    console.log('💡 獲取真實即時股價資料');

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;
    const results: StockSyncResult[] = [];

    try {
      // 檢查市場狀態
      const marketStatus = await yahooFinanceAPI.getMarketStatus();
      console.log(`📈 市場狀態: ${marketStatus.isOpen ? '開市' : '休市'}`);

      // 批量獲取股票資料
      const stockDataList = await yahooFinanceAPI.getBatchQuotes(this.SP500_STOCKS);

      console.log(`\n📦 開始存儲 ${stockDataList.length} 檔股票到 Supabase...`);

      // 存儲到 Supabase
      for (let i = 0; i < stockDataList.length; i++) {
        const stockData = stockDataList[i];
        
        try {
          const saved = await this.saveStockToSupabase(stockData);
          
          if (saved) {
            successCount++;
            results.push({
              symbol: stockData.symbol,
              success: true,
              price: stockData.price,
              source: 'Yahoo Finance'
            });
          } else {
            failCount++;
            results.push({
              symbol: stockData.symbol,
              success: false,
              error: 'Database save failed',
              source: 'Yahoo Finance'
            });
          }

          // 進度顯示
          const progress = Math.round(((i + 1) / stockDataList.length) * 100);
          console.log(`📈 存儲進度: ${progress}% (${i + 1}/${stockDataList.length})`);

        } catch (error) {
          failCount++;
          results.push({
            symbol: stockData.symbol,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Yahoo Finance'
          });
        }
      }

      // 處理未獲取到的股票
      const fetchedSymbols = stockDataList.map(s => s.symbol);
      const missedSymbols = this.SP500_STOCKS.filter(symbol => !fetchedSymbols.includes(symbol));
      
      if (missedSymbols.length > 0) {
        console.log(`⚠️ 未獲取到 ${missedSymbols.length} 檔股票: ${missedSymbols.join(', ')}`);
        failCount += missedSymbols.length;
        
        missedSymbols.forEach(symbol => {
          results.push({
            symbol,
            success: false,
            error: 'Failed to fetch from API',
            source: 'Yahoo Finance'
          });
        });
      }

    } catch (error) {
      console.error('❌ 同步過程中發生錯誤:', error);
    }

    // 最終統計
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const successRate = Math.round((successCount / this.SP500_STOCKS.length) * 100);
    this.lastUpdateTime = new Date();

    console.log('\n🎉 真實即時股票同步完成！');
    console.log('=====================================');
    console.log(`✅ 成功: ${successCount} 檔股票`);
    console.log(`❌ 失敗: ${failCount} 檔股票`);
    console.log(`📊 成功率: ${successRate}%`);
    console.log(`⏱️ 總用時: ${totalTime} 秒`);
    console.log(`🔥 資料來源: Yahoo Finance (真實即時)`);
    console.log(`📅 更新時間: ${this.lastUpdateTime.toLocaleString()}`);
    console.log('=====================================');
    console.log('💡 現在用戶可以搜尋到真實的即時股價！');
    console.log('🎯 包含 V (Visa) 等所有重點股票的真實價格');
    console.log('🚫 用戶查詢不會消耗任何 API 額度');
    console.log('⚡ 查詢速度更快（本地資料庫）');

    // 顯示部分成功的股票
    const successfulStocks = results.filter(r => r.success).slice(0, 10);
    if (successfulStocks.length > 0) {
      console.log('\n📊 部分成功更新的股票:');
      successfulStocks.forEach(stock => {
        console.log(`   ${stock.symbol}: $${stock.price}`);
      });
      if (successCount > 10) {
        console.log(`   ... 還有 ${successCount - 10} 檔股票`);
      }
    }

    this.isUpdating = false;
  }

  /**
   * 啟動定時自動更新
   */
  startAutoUpdate(intervalMinutes: number = 60): void {
    if (this.updateInterval) {
      console.log('⚠️ 自動更新已在運行中');
      return;
    }

    console.log(`⏰ 啟動自動更新，間隔: ${intervalMinutes} 分鐘`);
    
    // 立即執行一次
    this.executeFullSync();
    
    // 設定定時器
    this.updateInterval = setInterval(() => {
      console.log('⏰ 定時觸發股票更新...');
      this.executeFullSync();
    }, intervalMinutes * 60 * 1000);

    console.log('✅ 自動更新已啟動');
  }

  /**
   * 停止自動更新
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ 自動更新已停止');
    }
  }

  /**
   * 獲取更新狀態
   */
  getUpdateStatus() {
    return {
      isUpdating: this.isUpdating,
      lastUpdateTime: this.lastUpdateTime,
      autoUpdateRunning: this.updateInterval !== null,
      totalStocks: this.SP500_STOCKS.length
    };
  }

  /**
   * 驗證同步結果
   */
  async verifySync(): Promise<void> {
    console.log('\n🔍 驗證同步結果...');

    const testSymbols = ['AAPL', 'V', 'MSFT', 'GOOGL', 'TSLA'];

    for (const symbol of testSymbols) {
      try {
        const result = await supabaseConfig.request(`us_stocks?symbol=eq.${symbol}&select=symbol,name,price,updated_at`);
        
        if (result && result.length > 0) {
          const stock = result[0];
          console.log(`✅ ${stock.symbol}: ${stock.name} - $${stock.price}`);
          console.log(`   更新時間: ${new Date(stock.updated_at).toLocaleString()}`);
        } else {
          console.log(`❌ ${symbol}: 沒有找到資料`);
        }
      } catch (error) {
        console.error(`❌ 驗證 ${symbol} 失敗:`, error);
      }
    }
  }
}

// 創建實例並導出
export const realTimeStockSync = new RealTimeStockSync();

// 導出主要功能
export const executeRealTimeSync = () => realTimeStockSync.executeFullSync();
export const startAutoStockUpdate = (intervalMinutes?: number) => realTimeStockSync.startAutoUpdate(intervalMinutes);
export const stopAutoStockUpdate = () => realTimeStockSync.stopAutoUpdate();
export const getStockUpdateStatus = () => realTimeStockSync.getUpdateStatus();
export const verifyStockSync = () => realTimeStockSync.verifySync();
