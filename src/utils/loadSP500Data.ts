/**
 * 載入 S&P 500 股票資料到 Supabase
 * 從 CSV 檔案讀取股票清單，使用 Alpha Vantage API 獲取價格資料
 */

import { usStockSyncService } from '../services/usStockSyncService';
import { supabaseConfig } from '../services/supabase';

// S&P 500 股票清單 (從 CSV 檔案提取)
const SP500_STOCKS = [
  { symbol: 'MSFT', name: 'Microsoft Corporation', chineseName: '微軟' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', chineseName: '英偉達' },
  { symbol: 'AAPL', name: 'Apple Inc.', chineseName: '蘋果' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', chineseName: '亞馬遜' },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', chineseName: '谷歌-C' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', chineseName: '谷歌-A' },
  { symbol: 'META', name: 'Meta Platforms Inc.', chineseName: 'Meta Platforms' },
  { symbol: 'AVGO', name: 'Broadcom Inc.', chineseName: '博通' },
  { symbol: 'TSLA', name: 'Tesla Inc.', chineseName: '特斯拉' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', chineseName: '伯克希爾-B' },
  { symbol: 'WMT', name: 'Walmart Inc.', chineseName: '沃爾瑪' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', chineseName: '摩根大通' },
  { symbol: 'V', name: 'Visa Inc.', chineseName: 'Visa' },
  { symbol: 'LLY', name: 'Eli Lilly and Company', chineseName: '禮來' },
  { symbol: 'MA', name: 'Mastercard Incorporated', chineseName: '萬事達' },
  { symbol: 'NFLX', name: 'Netflix Inc.', chineseName: '奈飛' },
  { symbol: 'ORCL', name: 'Oracle Corporation', chineseName: '甲骨文' },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', chineseName: '好市多' },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', chineseName: '埃克森美孚' },
  { symbol: 'PG', name: 'The Procter & Gamble Company', chineseName: '寶潔' },
  // 前 20 大股票，其餘將動態載入
];

// 行業分類對應
const SECTOR_MAPPING: { [key: string]: string } = {
  'MSFT': 'Technology',
  'NVDA': 'Technology',
  'AAPL': 'Technology',
  'AMZN': 'Consumer Discretionary',
  'GOOG': 'Communication Services',
  'GOOGL': 'Communication Services',
  'META': 'Communication Services',
  'AVGO': 'Technology',
  'TSLA': 'Consumer Discretionary',
  'BRK.B': 'Financials',
  'WMT': 'Consumer Staples',
  'JPM': 'Financials',
  'V': 'Financials',
  'LLY': 'Healthcare',
  'MA': 'Financials',
  'NFLX': 'Communication Services',
  'ORCL': 'Technology',
  'COST': 'Consumer Staples',
  'XOM': 'Energy',
  'PG': 'Consumer Staples',
};

export interface SP500StockData {
  symbol: string;
  name: string;
  chineseName: string;
  sector?: string;
  price?: number;
  marketCap?: number;
}

class SP500DataLoader {
  private readonly API_KEY = 'QJTK95T7SA1661WM';
  private readonly BASE_URL = 'https://www.alphavantage.co/query';
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 5;

  /**
   * 檢查 API 請求限制
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
   * 等待 API 限制重置
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.canMakeRequest()) {
      console.log('⏳ 等待 API 限制重置...');
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
  }

  /**
   * 記錄 API 請求
   */
  private recordRequest(): void {
    this.requestCount++;
    console.log(`📊 Alpha Vantage API 使用量: ${this.requestCount}/${this.MAX_REQUESTS_PER_MINUTE}`);
  }

  /**
   * 批量插入基本股票資料 (不含價格)
   */
  async insertBasicStockData(): Promise<void> {
    console.log('📝 開始插入基本股票資料...');

    // 讀取完整的 S&P 500 清單
    const fullStockList = await this.parseCSVFile();

    let successCount = 0;
    let failCount = 0;

    // 限制為前 50 支股票以避免過多資料
    const limitedList = fullStockList.slice(0, 50);
    console.log(`📊 載入前 ${limitedList.length} 支股票`);

    for (const stock of limitedList) {
      try {
        const stockData = {
          symbol: stock.symbol,
          name: stock.name,
          sector: stock.sector,
          industry: null,
          price: null,
          open_price: null,
          high_price: null,
          low_price: null,
          volume: null,
          change_amount: null,
          change_percent: null,
          previous_close: null,
          market_cap: null,
          is_sp500: true
        };

        await supabaseConfig.request('us_stocks', {
          method: 'POST',
          body: JSON.stringify(stockData),
        });

        console.log(`✅ 插入 ${stock.symbol} (${stock.chineseName}) 成功`);
        successCount++;

      } catch (error) {
        console.error(`❌ 插入 ${stock.symbol} 失敗:`, error);
        failCount++;
      }
    }

    console.log(`🎉 基本資料插入完成！成功: ${successCount}, 失敗: ${failCount}`);
  }

  /**
   * 解析 CSV 檔案 - 完整的 S&P 500 清單
   */
  private async parseCSVFile(): Promise<SP500StockData[]> {
    // 完整的 S&P 500 股票清單 (從 CSV 檔案提取)
    const csvData = `MSFT,微軟
NVDA,英偉達
AAPL,蘋果
AMZN,亞馬遜
GOOG,谷歌-C
GOOGL,谷歌-A
META,Meta Platforms
AVGO,博通
TSLA,特斯拉
BRK.B,伯克希爾-B
WMT,沃爾瑪
JPM,摩根大通
V,Visa
LLY,禮來
MA,萬事達
NFLX,奈飛
ORCL,甲骨文
COST,好市多
XOM,埃克森美孚
PG,寶潔
JNJ,強生
HD,家得寶
BAC,美國銀行
ABBV,艾伯維公司
PLTR,Palantir
KO,可口可樂
PM,菲利普莫里斯
TMUS,T-Mobile US
UNH,聯合健康
GE,GE航天航空
CRM,賽富時
CSCO,思科
WFC,富國銀行
IBM,IBM Corp
CVX,雪佛龍
ABT,雅培
MCD,麥當勞
LIN,林德氣體
ACN,埃森哲
INTU,財捷
NOW,ServiceNow
AXP,美國運通
MS,摩根士丹利
DIS,迪士尼
T,AT&T
ISRG,直覺外科公司
MRK,默沙東
VZ,Verizon
GS,高盛
RTX,雷神技術
PEP,百事可樂
BKNG,Booking Holdings
AMD,美國超微公司
ADBE,Adobe
UBER,優步
PGR,前進保險
TXN,德州儀器
CAT,卡特彼勒
SCHW,嘉信理財
QCOM,高通
SPGI,標普全球
BA,波音
BSX,波士頓科學
AMGN,安進
TMO,賽默飛世爾
BLK,貝萊德
SYK,史賽克
HON,霍尼韋爾
NEE,新紀元能源
TJX,TJX公司
C,花旗集團
DE,迪爾股份
GILD,吉利德科學
DHR,丹納赫
PFE,輝瑞
UNP,聯合太平洋
ADP,自動數據處理
GEV,GE Vernova
CMCSA,康卡斯特
PANW,Palo Alto Networks
LOW,勞氏
AMAT,應用材料
ETN,伊頓
COF,第一資本信貸
CB,安達保險
CRWD,CrowdStrike
MMC,威達信
VRTX,福泰製藥
LMT,洛克希德馬丁
ANET,Arista Networks
APH,安費諾
KKR,KKR & Co
COP,康菲石油
MDT,美敦力
ADI,亞德諾
BX,黑石
MU,美光科技
CME,芝加哥商品交易所
LRCX,泛林集團
ICE,洲際交易所
MO,奧馳亞
WELL,Welltower
PLD,安博
AMT,美國電塔
KLAC,科磊
SO,美國南方公司
BMY,施貴寶
WM,美國廢物管理
TT,Trane技術
CEG,Constellation Energy
SBUX,星巴克
HCA,HCA醫療
DUK,杜克能源
CTAS,信達思
FI,費哲金融服務
MCK,麥克森
SHW,宣偉公司
NKE,耐克
AJG,亞瑟加拉格爾
DASH,DoorDash
MDLZ,億滋
EQIX,易昆尼克斯
ELV,Elevance Health
MCO,穆迪
INTC,英特爾
PH,派克漢尼汾
CI,信諾
UPS,聯合包裹
TDG,TransDigm
CVS,西維斯健康
RSG,共和廢品處理
AON,怡安保險
MMM,3M
ABNB,愛彼迎
CDNS,鏗騰電子
ORLY,奧萊利
FTNT,飛塔信息
DELL,戴爾科技
CL,高露潔
ECL,藝康集團
ZTS,Zoetis
GD,通用動力
APO,阿波羅全球管理
WMB,威廉姆斯
MAR,萬豪酒店
SNPS,新思科技
ITW,伊利諾伊機械
RCL,皇家加勒比郵輪
NOC,諾斯羅普格魯曼
MSI,摩托羅拉解決方案
PNC,PNC金融服務集團
HWM,Howmet Aerospace
PYPL,PayPal
USB,美國合眾銀行
CMG,奇波雷墨西哥燒烤
EMR,艾默生電氣
JCI,江森自控
WDAY,Workday
BK,紐約梅隆銀行
ADSK,歐特克
COIN,Coinbase
TRV,旅行者財產險集團
AZO,汽車地帶
MNST,怪物飲料
KMI,金德爾摩根
APD,Air Products & Chemicals
ROP,儒博實業
CARR,開利全球
CSX,CSX運輸
EOG,EOG能源
HLT,希爾頓酒店
NEM,紐曼礦業
AXON,Axon Enterprise
DLR,數字房地產信托公司
PAYX,沛齊
COR,Cencora
AFL,美國家庭壽險
NSC,諾福克南方
CHTR,特許通訊
ALL,好事達
AEP,美國電力
FCX,麥克莫蘭銅金
VST,Vistra Energy
PSA,公共存儲公司
SPG,西蒙地產
REGN,再生元製藥公司
MET,大都會人壽
FDX,聯邦快遞
GWW,美國固安捷
TFC,Truist Financial
SRE,桑普拉能源
O,Realty Income
PWR,廣達服務
OKE,歐尼克(萬歐卡)
CPRT,科帕特
BDX,碧迪醫療
MPC,馬拉松原油
PCAR,帕卡
AIG,美國國際集團
AMP,阿莫斯萊斯金融
D,道明尼資源
CTVA,Corteva
NXPI,恩智浦
NDAQ,納斯達克
GM,通用汽車
TEL,泰科電子
FAST,快扣
PSX,Phillips 66
ROST,羅斯百貨
URI,聯合租賃
EW,愛德華生命科學
KVUE,Kenvue
KDP,Keurig Dr Pepper
LHX,L3Harris Technologies
KR,克羅格
SLB,斯倫貝謝
CMI,康明斯
EXC,愛克斯龍電力
VRSK,Verisk分析
CCI,冠城國際
MSCI,MSCI Inc
TGT,塔吉特
GLW,康寧
FICO,Fair Isaac
FIS,繁德信息技術
IDXX,愛德士
F,福特汽車
AME,阿美特克
HES,赫斯
PEG,公務集團
XEL,埃克西爾能源
VLO,瓦萊羅能源
TTWO,Take-Two互動軟體件
OXY,西方石油
YUM,Yum! Brands
CTSH,高知特
FANG,Diamondback Energy
GRMN,佳明
LULU,Lululemon Athletica
ED,愛迪生聯合電氣
OTIS,奧的斯
CBRE,世邦魏理仕
ETR,安特吉
PCG,太平洋煤電
HIG,哈特福德金融
CAH,卡地納健康
PRU,保德信金融
BKR,Baker Hughes
DHI,霍頓房屋
EA,藝電
RMD,瑞思邁
ACGL,艾奇資本
ROK,羅克韋爾自動化
SYY,西思科公司
VMC,火神材料
WAB,美國西屋制動
WEC,威州能源
TRGP,Targa Resources
ODFL,Old Dominion Freight Line
EBAY,eBay
DXCM,德康醫療
IT,加特納
VICI,VICI Properties
MLM,馬丁-瑪麗埃塔材料
EQT,EQT能源
IR,英格索蘭
EFX,艾可菲
HSY,好時
BRO,Brown & Brown
GEHC,GE HealthCare Technologies
LYV,Live Nation Entertainment
EXR,Extra Space Storage
A,安捷倫科技
STZ,星座品牌
MPWR,Monolithic Power Systems
KHC,卡夫亨氏
DAL,達美航空
CCL,嘉年華郵輪
WTW,韋萊韜悅
MCHP,微芯科技
CSGP,科斯塔
XYL,賽萊默
NRG,NRG Energy
GIS,通用磨坊
RJF,瑞傑金融
AVB,阿灣物產
MTB,美國制商銀行
IRM,鐵山
LVS,金沙集團
ANSS,安斯科技
VTR,芬塔公司
K,家樂氏
BR,Broadridge金融解決方案
DTE,DTE能源
WRB,WR柏克利
HUM,哈門那
CNC,康西哥
LEN,萊納建築
DD,杜邦
AWK,美國水務
ROL,Rollins
EXE,Expand Energy
STT,道富銀行
KEYS,Keysight Technologies
EQR,資產住宅公司
AEE,阿曼瑞恩
GDDY,GoDaddy
UAL,聯合大陸航空
PPL,賓州電力
TSCO,拖拉機供應公司
TPL,Texas Pacific Land
VRSN,威瑞信
FITB,五三銀行
IP,國際紙業
NUE,紐柯鋼鐵
PPG,PPG工業
DRI,達登飯店
VLTO,Veralto Corp
STX,希捷科技
SBAC,SBA通信公司
TYL,泰勒科技
FOXA,福克斯公司-A
WBD,Warner Bros Discovery
ATO,Atmos Energy
DOV,都福集團
CNP,中點能源
IQV,艾昆緯
CHD,丘奇&德懷特
FE,第一能源
STE,思泰瑞醫療
EL,雅詩蘭黛
MTD,梅特勒-托利多
CBOE,芝加哥期權交易所
SMCI,超微電腦
FTV,Fortive
ES,Eversource Energy
CDW,CDW Corp
CINF,辛辛納提金融
HPQ,惠普
TDY,Teledyne Technologies
ADM,Archer Daniels Midland
CPAY,Corpay
PODD,銀休特
HBAN,亨廷頓銀行
HPE,慧與科技
SW,Smurfit WestRock
FOX,福克斯公司-B
SYF,Synchrony Financial
EIX,愛迪生國際
DG,美國達樂公司
EXPE,Expedia
ULTA,Ulta美容
CMS,CMS能源
AMCR,Amcor
LH,徠博科
NVR,NVR Inc
HUBB,哈勃集團
WAT,沃特世
NTRS,北方信託
INVH,Invitation Homes
TROW,普信集團
NTAP,美國網存
PTC,PTC Inc
LII,雷諾士
TSN,泰森食品
WSM,Williams-Sonoma
PHM,普得集團
DOW,陶氏化學
IFF,國際香料香精
MKC,味好美
DVN,戴文能源
DGX,奎斯特診療
RF,地區金融
LDOS,Leidos
LUV,西南航空
BIIB,渤健公司
DLTR,美元樹公司
WY,惠好
ERIE,伊瑞保險
L,洛斯公司
NI,印北瓦電
CTRA,Coterra Energy
NWS,新聞集團-B
GPN,環匯有限公司
MAA,MAA房產信托
ESS,埃塞克斯信托
STLD,Steel Dynamics
ZBH,齊默巴奧米特控股
LYB,利安德巴塞爾
JBL,捷普科技
WDC,西部數據
GEN,Gen Digital
GPC,Genuine Parts
ON,安森美半導體
CFG,Citizens Financial
PFG,信安金融
FDS,慧甚
KEY,KeyCorp
PKG,美國包裝公司
TRMB,天寶導航公司
FSLR,第一太陽能
HRL,荷美爾食品
HAL,哈里伯頓
SNA,實耐寶
RL,拉夫勞倫
MOH,Molina Healthcare
FFIV,F5 Inc
PNR,濱特爾
TPR,Tapestry
CLX,高樂氏
DPZ,達美樂比薩
LNT,美國聯合能源
NWSA,新聞集團-A
DECK,Deckers Outdoor
BF.B,百富門-B
BAX,百特國際
EXPD,康捷國際物流
EVRG,西星能源
J,雅各布工程
WST,West Pharmaceutical Services
PAYC,Paycom Software
BALL,鮑爾包裝
EG,Everest Group
ZBRA,斑馬技術
CF,CF工業控股
APTV,Aptiv PLC
KIM,金科
OMC,宏盟集團
BBY,百思買
AVY,艾利丹尼森
HOLX,豪洛捷
JBHT,JB亨特運輸服務
UDR,UDR不動產信托
IEX,IDEX Corp
COO,庫珀醫療
TXT,德事隆
JKHY,傑克亨利
MAS,馬斯科
ALGN,艾利科技
REG,Regency Centers Corp.
TKO,TKO Group Holdings
SOLV,Solventum
TER,泰瑞達
INCY,因塞特
CPT,卡姆登物業信托
ALLE,Allegion
UHS,Universal Health Services
ARE,亞歷山大房地產
DOC,Healthpeak Properties
JNPR,瞻博網絡
SJM,斯馬克
NDSN,Nordson
BLDR,Builders FirstSource
MOS,美國美盛
CHRW,羅賓遜物流
BEN,Franklin Resources
POOL,Pool Corp
CAG,康尼格拉
PNW,西帕納卡資本
TAP,莫庫酒業
AKAM,阿克邁
HST,美國豪斯特酒店
BXP,BXP Inc
RVTY,Revvity
BG,邦吉
LKQ,LKQ Corp
SWKS,思佳訊
VTRS,Viatris
DVA,德維特
AIZ,安信龍保險
MRNA,Moderna
CPB,金寶公司
SWK,美國史丹利公司
GL,Globe Life
EPAM,EPAM Systems
KMX,車美仕
WBA,沃爾格林-聯合博姿
WYNN,永利度假村
DAY,Dayforce
HAS,孩之寶
AOS,A.O.史密斯
EMN,伊士曼化工
IPG,埃培智
HII,亨廷頓英格爾斯工業
HSIC,漢瑞祥
MGM,美高梅
FRT,FRT信托
PARA,派拉蒙環球-B
MKTX,MarketAxess
NCLH,挪威郵輪
LW,Lamb Weston
TECH,Bio-Techne
MTCH,Match group
GNRC,Generac
AES,AES發電
CRL,查爾斯河實驗室
ALB,美國雅保
IVZ,景順
MHK,莫霍克工業公司
APA,阿帕奇石油`;

    const lines = csvData.trim().split('\n');
    const stocks: SP500StockData[] = [];

    for (const line of lines) {
      const [symbol, chineseName] = line.split(',');
      if (symbol && chineseName) {
        stocks.push({
          symbol: symbol.trim(),
          name: this.getEnglishName(symbol.trim()),
          chineseName: chineseName.trim(),
          sector: this.getSector(symbol.trim())
        });
      }
    }

    console.log(`📊 解析完成，共 ${stocks.length} 支股票`);
    return stocks;
  }

  /**
   * 獲取英文公司名稱
   */
  private getEnglishName(symbol: string): string {
    const nameMapping: { [key: string]: string } = {
      'MSFT': 'Microsoft Corporation',
      'NVDA': 'NVIDIA Corporation',
      'AAPL': 'Apple Inc.',
      'AMZN': 'Amazon.com Inc.',
      'GOOG': 'Alphabet Inc. Class C',
      'GOOGL': 'Alphabet Inc. Class A',
      'META': 'Meta Platforms Inc.',
      'AVGO': 'Broadcom Inc.',
      'TSLA': 'Tesla Inc.',
      'BRK.B': 'Berkshire Hathaway Inc. Class B',
      'WMT': 'Walmart Inc.',
      'JPM': 'JPMorgan Chase & Co.',
      'V': 'Visa Inc.',
      'LLY': 'Eli Lilly and Company',
      'MA': 'Mastercard Incorporated',
      'NFLX': 'Netflix Inc.',
      'ORCL': 'Oracle Corporation',
      'COST': 'Costco Wholesale Corporation',
      'XOM': 'Exxon Mobil Corporation',
      'PG': 'The Procter & Gamble Company',
      'JNJ': 'Johnson & Johnson',
      'HD': 'The Home Depot Inc.',
      'BAC': 'Bank of America Corporation',
      'ABBV': 'AbbVie Inc.',
      'KO': 'The Coca-Cola Company',
      'PEP': 'PepsiCo Inc.',
      'MCD': 'McDonald\'s Corporation',
      'DIS': 'The Walt Disney Company',
      'INTC': 'Intel Corporation',
      'CSCO': 'Cisco Systems Inc.',
    };

    return nameMapping[symbol] || `${symbol} Corporation`;
  }

  /**
   * 獲取行業分類
   */
  private getSector(symbol: string): string {
    const sectorMapping: { [key: string]: string } = {
      // Technology
      'MSFT': 'Technology', 'NVDA': 'Technology', 'AAPL': 'Technology', 'AVGO': 'Technology',
      'ORCL': 'Technology', 'CRM': 'Technology', 'ADBE': 'Technology', 'INTC': 'Technology',
      'CSCO': 'Technology', 'AMD': 'Technology', 'QCOM': 'Technology', 'TXN': 'Technology',
      'AMAT': 'Technology', 'ADI': 'Technology', 'MU': 'Technology', 'LRCX': 'Technology',
      'KLAC': 'Technology', 'CDNS': 'Technology', 'SNPS': 'Technology', 'PANW': 'Technology',
      'CRWD': 'Technology', 'ANET': 'Technology', 'FTNT': 'Technology', 'DELL': 'Technology',
      'HPQ': 'Technology', 'HPE': 'Technology', 'NTAP': 'Technology', 'WDC': 'Technology',

      // Healthcare
      'LLY': 'Healthcare', 'JNJ': 'Healthcare', 'ABBV': 'Healthcare', 'MRK': 'Healthcare',
      'PFE': 'Healthcare', 'TMO': 'Healthcare', 'ABT': 'Healthcare', 'ISRG': 'Healthcare',
      'DHR': 'Healthcare', 'BMY': 'Healthcare', 'AMGN': 'Healthcare', 'GILD': 'Healthcare',
      'VRTX': 'Healthcare', 'BSX': 'Healthcare', 'MDT': 'Healthcare', 'SYK': 'Healthcare',
      'ELV': 'Healthcare', 'CI': 'Healthcare', 'UNH': 'Healthcare', 'CVS': 'Healthcare',

      // Financials
      'JPM': 'Financials', 'V': 'Financials', 'MA': 'Financials', 'BAC': 'Financials',
      'WFC': 'Financials', 'GS': 'Financials', 'MS': 'Financials', 'AXP': 'Financials',
      'C': 'Financials', 'SCHW': 'Financials', 'BLK': 'Financials', 'SPGI': 'Financials',
      'CME': 'Financials', 'ICE': 'Financials', 'MCO': 'Financials', 'COF': 'Financials',
      'PNC': 'Financials', 'USB': 'Financials', 'TFC': 'Financials', 'BK': 'Financials',

      // Consumer Discretionary
      'AMZN': 'Consumer Discretionary', 'TSLA': 'Consumer Discretionary', 'HD': 'Consumer Discretionary',
      'MCD': 'Consumer Discretionary', 'NKE': 'Consumer Discretionary', 'BKNG': 'Consumer Discretionary',
      'LOW': 'Consumer Discretionary', 'TJX': 'Consumer Discretionary', 'SBUX': 'Consumer Discretionary',
      'MAR': 'Consumer Discretionary', 'GM': 'Consumer Discretionary', 'F': 'Consumer Discretionary',

      // Communication Services
      'GOOG': 'Communication Services', 'GOOGL': 'Communication Services', 'META': 'Communication Services',
      'NFLX': 'Communication Services', 'DIS': 'Communication Services', 'CMCSA': 'Communication Services',
      'VZ': 'Communication Services', 'T': 'Communication Services', 'TMUS': 'Communication Services',

      // Consumer Staples
      'PG': 'Consumer Staples', 'KO': 'Consumer Staples', 'PEP': 'Consumer Staples',
      'WMT': 'Consumer Staples', 'COST': 'Consumer Staples', 'CL': 'Consumer Staples',
      'KHC': 'Consumer Staples', 'MDLZ': 'Consumer Staples', 'GIS': 'Consumer Staples',

      // Energy
      'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'EOG': 'Energy',
      'SLB': 'Energy', 'PSX': 'Energy', 'VLO': 'Energy', 'MPC': 'Energy',

      // Industrials
      'CAT': 'Industrials', 'RTX': 'Industrials', 'HON': 'Industrials', 'UPS': 'Industrials',
      'LMT': 'Industrials', 'BA': 'Industrials', 'GE': 'Industrials', 'MMM': 'Industrials',
      'DE': 'Industrials', 'ETN': 'Industrials', 'ITW': 'Industrials', 'EMR': 'Industrials',

      // Utilities
      'NEE': 'Utilities', 'SO': 'Utilities', 'DUK': 'Utilities', 'AEP': 'Utilities',
      'EXC': 'Utilities', 'SRE': 'Utilities', 'D': 'Utilities', 'PEG': 'Utilities',

      // Real Estate
      'PLD': 'Real Estate', 'AMT': 'Real Estate', 'EQIX': 'Real Estate', 'WELL': 'Real Estate',
      'PSA': 'Real Estate', 'SPG': 'Real Estate', 'O': 'Real Estate', 'DLR': 'Real Estate',

      // Materials
      'LIN': 'Materials', 'APD': 'Materials', 'ECL': 'Materials', 'SHW': 'Materials',
      'FCX': 'Materials', 'NEM': 'Materials', 'DOW': 'Materials', 'VMC': 'Materials',
    };

    return sectorMapping[symbol] || 'Unknown';
  }

  /**
   * 批量更新股票價格 (分批處理)
   */
  async updateStockPrices(batchSize: number = 10): Promise<void> {
    console.log('💰 開始更新股票價格...');

    // 獲取已插入的股票清單
    const stocks = await this.getStoredStocks();
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < stocks.length; i += batchSize) {
      const batch = stocks.slice(i, i + batchSize);
      console.log(`📦 處理批次 ${Math.floor(i / batchSize) + 1}: ${batch.map(s => s.symbol).join(', ')}`);

      for (const stock of batch) {
        try {
          await this.waitForRateLimit();
          
          const quote = await usStockSyncService.getStockQuote(stock.symbol);
          if (quote) {
            await this.updateStockInDatabase(stock.symbol, quote);
            successCount++;
            console.log(`✅ 更新 ${stock.symbol} 價格成功: $${quote.price}`);
          } else {
            failCount++;
            console.log(`❌ 無法獲取 ${stock.symbol} 價格`);
          }

        } catch (error) {
          console.error(`❌ 更新 ${stock.symbol} 價格失敗:`, error);
          failCount++;
        }
      }

      // 批次間暫停
      if (i + batchSize < stocks.length) {
        console.log('⏳ 批次間暫停 30 秒...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log(`🎉 價格更新完成！成功: ${successCount}, 失敗: ${failCount}`);
  }

  /**
   * 獲取已儲存的股票清單
   */
  private async getStoredStocks(): Promise<{ symbol: string }[]> {
    try {
      const data = await supabaseConfig.request('us_stocks?select=symbol&is_sp500=eq.true');
      return data || [];
    } catch (error) {
      console.error('❌ 獲取股票清單失敗:', error);
      return [];
    }
  }

  /**
   * 更新資料庫中的股票資料
   */
  private async updateStockInDatabase(symbol: string, quote: any): Promise<void> {
    const updateData = {
      price: quote.price,
      open_price: quote.open,
      high_price: quote.high,
      low_price: quote.low,
      volume: quote.volume,
      change_amount: quote.change,
      change_percent: quote.changePercent,
      previous_close: quote.previousClose,
      price_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString()
    };

    await supabaseConfig.request(`us_stocks?symbol=eq.${symbol}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * 獲取載入統計
   */
  async getLoadingStats() {
    try {
      const totalStocks = await supabaseConfig.request('us_stocks?select=count&is_sp500=eq.true');
      const stocksWithPrices = await supabaseConfig.request('us_stocks?select=count&is_sp500=eq.true&price=not.is.null');
      
      return {
        totalStocks: totalStocks.length,
        stocksWithPrices: stocksWithPrices.length,
        completionRate: totalStocks.length > 0 ? (stocksWithPrices.length / totalStocks.length * 100).toFixed(1) : '0'
      };
    } catch (error) {
      console.error('❌ 獲取載入統計失敗:', error);
      return { totalStocks: 0, stocksWithPrices: 0, completionRate: '0' };
    }
  }
}

// 創建實例
export const sp500DataLoader = new SP500DataLoader();

// 導出主要功能
export const loadSP500BasicData = () => sp500DataLoader.insertBasicStockData();
export const updateSP500Prices = (batchSize?: number) => sp500DataLoader.updateStockPrices(batchSize);
export const getSP500Stats = () => sp500DataLoader.getLoadingStats();
