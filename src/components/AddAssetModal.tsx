import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetTransactionSyncService } from '../services/assetTransactionSyncService';
import StockSearchInput from './StockSearchInput';
import USStockSearchInput from './USStockSearchInput';
import { StockSearchResult, taiwanStockService } from '../services/taiwanStockService';
import { USStockSearchResult } from '../services/usStockQueryService';
import { exchangeRateService } from '../services/exchangeRateService';
import { generateUUID, ensureValidUUID } from '../utils/uuid';



interface AddAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (asset: any) => void;
  editingAsset?: any;
}

export default function AddAssetModal({ visible, onClose, onAdd, editingAsset }: AddAssetModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState('cash');
  const [quantity, setQuantity] = useState('');
  const [costBasis, setCostBasis] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [buyPrice, setBuyPrice] = useState(''); // 買入成本價
  const [currentPrice, setCurrentPrice] = useState(''); // 現在市價
  const [symbol, setSymbol] = useState('');

  // 不動產專用字段
  const [area, setArea] = useState(''); // 坪數
  const [pricePerPing, setPricePerPing] = useState(''); // 每坪成本
  const [currentPricePerPing, setCurrentPricePerPing] = useState(''); // 每坪市價

  // 費用來源相關狀態
  const [fundingSource, setFundingSource] = useState<'new' | 'transfer'>('new'); // 'new' = 直接新增, 'transfer' = 從現有資產轉移
  const [sourceAssetId, setSourceAssetId] = useState(''); // 來源資產ID
  const [availableAssets, setAvailableAssets] = useState<any[]>([]); // 可用的資產列表

  // 匯率相關狀態 (美股和加密貨幣專用)
  const [buyExchangeRate, setBuyExchangeRate] = useState(''); // 買入匯率
  const [currentExchangeRate, setCurrentExchangeRate] = useState(''); // 現在匯率
  const [isLoadingExchangeRate, setIsLoadingExchangeRate] = useState(false); // 匯率載入狀態

  // 保單專用字段
  const [insuranceAmount, setInsuranceAmount] = useState(''); // 壽險額度

  // 處理台股選擇
  const handleStockSelect = (stock: StockSearchResult) => {
    setSymbol(stock.code);
    setName(stock.name);
    setCurrentPrice(stock.closing_price.toString());
    // 買入成本價預設為現在市價
    setBuyPrice(stock.closing_price.toString());
  };

  // 處理美股選擇 (從 Supabase)
  const handleUSStockSelect = (stock: USStockSearchResult) => {
    console.log('📈 AddAssetModal 收到美股選擇:', stock);

    setSymbol(stock.symbol);
    setName(stock.name || stock.symbol);

    // 自動填入價格（美元）
    setBuyPrice(stock.price.toString());
    setCurrentPrice(stock.price.toString());

    console.log('✅ 美股資料已填入:', {
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price
    });
  };



  const assetTypes = [
    { key: 'cash', label: '現金', icon: '💵' },
    { key: 'bank', label: '銀行', icon: '🏦' },
    { key: 'tw_stock', label: '台股', icon: '📈' },
    { key: 'us_stock', label: '美股', icon: '🇺🇸' },
    { key: 'mutual_fund', label: '基金', icon: '📊' },
    { key: 'insurance', label: '保單', icon: '🛡️' },
    { key: 'cryptocurrency', label: '加密貨幣', icon: '₿' },
    { key: 'real_estate', label: '不動產', icon: '🏠' },
    { key: 'vehicle', label: '汽車', icon: '🚗' },
    { key: 'other', label: '其他', icon: '💼' },
  ];

  // 需要價格計算的資產類型
  const needsPriceCalculation = ['tw_stock', 'us_stock', 'mutual_fund', 'cryptocurrency'];

  // 需要匯率的資產類型 (以美元計價)
  const needsExchangeRate = ['us_stock', 'cryptocurrency'];

  // 獲取可用資產列表
  useEffect(() => {
    const updateAssets = () => {
      const assets = assetTransactionSyncService.getAssets();
      // 過濾出有餘額的資產作為可選的來源資產
      const assetsWithBalance = assets.filter(asset => asset.current_value > 0);
      setAvailableAssets(assetsWithBalance);
    };

    // 初始化資產列表
    updateAssets();

    // 監聽資產變化
    assetTransactionSyncService.addListener(updateAssets);

    return () => {
      assetTransactionSyncService.removeListener(updateAssets);
    };
  }, []);

  // 獲取匯率 (當資產類型為美股或加密貨幣時)
  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (needsExchangeRate.includes(type)) {
        setIsLoadingExchangeRate(true);

        // 測試 Supabase 連接（僅在開發模式）
        if (__DEV__) {
          console.log('🧪 測試 Supabase 連接...');
          await taiwanStockService.testSupabaseConnection();

          // 如果是美股類型，記錄日誌
          if (type === 'us_stock') {
            console.log('🔍 美股類型資產，準備獲取匯率...');
          }
        }

        try {
          // 獲取即期中間價作為標準匯率
          const midRate = await exchangeRateService.getMidRate();
          setCurrentExchangeRate(midRate.toFixed(3));

          // 如果是新增模式，買入匯率預設為即期中間價
          if (!editingAsset) {
            setBuyExchangeRate(midRate.toFixed(3));
          }
        } catch (error) {
          console.error('獲取匯率失敗:', error);
          // 使用預設即期中間價 (2025-06-01)
          setCurrentExchangeRate('29.925');
          if (!editingAsset) {
            setBuyExchangeRate('29.925');
          }
        } finally {
          setIsLoadingExchangeRate(false);
        }
      } else {
        // 清空匯率欄位
        setBuyExchangeRate('');
        setCurrentExchangeRate('');
      }
    };

    fetchExchangeRate();
  }, [type, editingAsset]);

  // 編輯模式初始化
  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name || '');
      setType(editingAsset.type || 'cash');
      setQuantity(editingAsset.quantity?.toString() || '');
      setCostBasis(editingAsset.cost_basis?.toString() || '');
      setCurrentValue(editingAsset.current_value?.toString() || '');
      setBuyPrice(editingAsset.purchase_price?.toString() || '');
      setCurrentPrice(editingAsset.current_price?.toString() || '');
      setSymbol(editingAsset.stock_code || '');
      // 匯率欄位初始化
      setBuyExchangeRate(editingAsset.buy_exchange_rate?.toString() || '');
      setCurrentExchangeRate(editingAsset.current_exchange_rate?.toString() || '');
      // 保單欄位初始化
      setInsuranceAmount((editingAsset as any).insurance_amount?.toString() || '');
      // 編輯模式下預設為直接新增，不涉及轉移
      setFundingSource('new');
      setSourceAssetId('');
    } else {
      // 重置表單
      setName('');
      setType('cash');
      setQuantity('');
      setCostBasis('');
      setCurrentValue('');
      setBuyPrice('');
      setCurrentPrice('');
      setSymbol('');
      setBuyExchangeRate('');
      setCurrentExchangeRate('');
      setInsuranceAmount('');
      setFundingSource('new');
      setSourceAssetId('');
    }
  }, [editingAsset, visible]);

  // 自動計算成本基礎
  useEffect(() => {
    if (type === 'real_estate' && area && pricePerPing) {
      // 不動產：坪數 * 每坪成本
      const calculatedCostBasis = (parseFloat(area) * parseFloat(pricePerPing)).toString();
      setCostBasis(calculatedCostBasis);
    } else if (needsPriceCalculation.includes(type) && quantity && buyPrice) {
      // 計算美元成本
      const usdCost = parseFloat(quantity) * parseFloat(buyPrice);

      if (needsExchangeRate.includes(type) && buyExchangeRate) {
        // 美股/加密貨幣：美元成本 × 買入匯率 = 台幣成本
        const twdCost = usdCost * parseFloat(buyExchangeRate);
        setCostBasis(twdCost.toString());
      } else {
        // 台股等其他資產：直接使用台幣計算
        setCostBasis(usdCost.toString());
      }
    }
  }, [quantity, buyPrice, buyExchangeRate, area, pricePerPing, type]);

  // 自動計算現在價值
  useEffect(() => {
    if (type === 'real_estate' && area && currentPricePerPing) {
      // 不動產：坪數 * 每坪市價
      const calculatedCurrentValue = (parseFloat(area) * parseFloat(currentPricePerPing)).toString();
      setCurrentValue(calculatedCurrentValue);
    } else if (needsPriceCalculation.includes(type) && quantity && currentPrice) {
      // 計算美元價值
      const usdValue = parseFloat(quantity) * parseFloat(currentPrice);

      if (needsExchangeRate.includes(type) && currentExchangeRate) {
        // 美股/加密貨幣：美元價值 × 現在匯率 = 台幣價值
        const twdValue = usdValue * parseFloat(currentExchangeRate);
        setCurrentValue(twdValue.toString());
      } else {
        // 台股等其他資產：直接使用台幣計算
        setCurrentValue(usdValue.toString());
      }
    }
  }, [quantity, currentPrice, currentExchangeRate, area, currentPricePerPing, type]);



  const handleSubmit = () => {
    // 需要現在價值的資產類型
    const needsCurrentValue = ['tw_stock', 'us_stock', 'mutual_fund', 'cryptocurrency', 'insurance', 'real_estate', 'vehicle', 'other'];

    // 對於現金和銀行資產，數量預設為1，成本基礎就是金額
    if (type === 'cash' || type === 'bank') {
      if (!costBasis) {
        console.error('❌ 請填寫金額');
        return;
      }
    } else if (type !== 'vehicle' && type !== 'insurance') {
      // 汽車和保單不需要持有數量
      if (!quantity) {
        console.error('❌ 請填寫持有數量');
        return;
      }

      // 對於需要價格計算的資產類型，檢查買入成本價和現在市價
      if (needsPriceCalculation.includes(type)) {
        if (!buyPrice) {
          console.error('❌ 請填寫買入成本價');
          return;
        }
        if (!currentPrice) {
          console.error('❌ 請填寫現在市價');
          return;
        }

        // 對於美股和加密貨幣，檢查匯率
        if (needsExchangeRate.includes(type)) {
          if (!buyExchangeRate) {
            console.error('❌ 請填寫買入匯率');
            return;
          }
          if (!currentExchangeRate) {
            console.error('❌ 請填寫現在匯率');
            return;
          }
        }
      } else {
        // 對於其他資產類型，檢查成本基礎和現在價值
        if (!costBasis) {
          console.error('❌ 請填寫成本基礎');
          return;
        }
        if (needsCurrentValue.includes(type) && !currentValue) {
          console.error('❌ 請填寫現在價值');
          return;
        }
      }
    } else {
      // 對於汽車和保單，檢查成本基礎和現在價值
      if (!costBasis) {
        console.error('❌ 請填寫成本基礎');
        return;
      }
      if (needsCurrentValue.includes(type) && !currentValue) {
        console.error('❌ 請填寫現在價值');
        return;
      }
    }

    // 檢查費用來源
    if (!editingAsset && fundingSource === 'transfer') {
      if (!sourceAssetId) {
        console.error('❌ 請選擇費用來源資產');
        return;
      }

      // 檢查來源資產餘額是否足夠
      const sourceAsset = availableAssets.find(asset => asset.id === sourceAssetId);
      if (!sourceAsset) {
        console.error('❌ 找不到選中的來源資產');
        return;
      }

      const transferAmount = parseFloat(costBasis);
      if (sourceAsset.current_value < transferAmount) {
        console.error(`❌ 來源資產餘額不足。可用餘額: ${sourceAsset.current_value.toLocaleString()}`);
        return;
      }
    }

    // 使用預設名稱如果沒有填寫
    const selectedAssetType = assetTypes.find(t => t.key === type);
    const defaultName = selectedAssetType?.label || '資產';
    const finalName = name.trim() || defaultName;

    const asset = {
      id: ensureValidUUID(editingAsset?.id),
      name: finalName,
      type,
      quantity: type === 'real_estate' ? parseFloat(area) || 1 : (type === 'cash' || type === 'bank' || type === 'vehicle' || type === 'insurance' ? 1 : parseFloat(quantity)),
      cost_basis: parseFloat(costBasis),
      current_value: needsCurrentValue.includes(type) ? parseFloat(currentValue) : parseFloat(costBasis),
      symbol: symbol || undefined,
      last_updated: new Date().toISOString(),
      // 保留股票相關欄位
      stock_code: symbol || undefined,
      purchase_price: needsPriceCalculation.includes(type) ? parseFloat(buyPrice) : undefined,
      current_price: needsPriceCalculation.includes(type) ? parseFloat(currentPrice) : undefined,
      // 不動產專用字段
      area: type === 'real_estate' ? parseFloat(area) : undefined,
      price_per_ping: type === 'real_estate' ? parseFloat(pricePerPing) : undefined,
      current_price_per_ping: type === 'real_estate' ? parseFloat(currentPricePerPing) : undefined,
      // 匯率專用字段 (美股和加密貨幣)
      buy_exchange_rate: needsExchangeRate.includes(type) ? parseFloat(buyExchangeRate) : undefined,
      current_exchange_rate: needsExchangeRate.includes(type) ? parseFloat(currentExchangeRate) : undefined,
      // 保單專用字段
      insurance_amount: type === 'insurance' ? parseFloat(insuranceAmount) : undefined,
    };

    // 處理資產轉移邏輯
    if (!editingAsset && fundingSource === 'transfer' && sourceAssetId) {
      const sourceAsset = availableAssets.find(asset => asset.id === sourceAssetId);
      if (sourceAsset) {
        const transferAmount = parseFloat(costBasis);

        // 從來源資產扣除金額
        assetTransactionSyncService.updateAsset(sourceAssetId, {
          current_value: sourceAsset.current_value - transferAmount,
          cost_basis: sourceAsset.current_value - transferAmount, // 對於現金類資產，成本基礎等於當前價值
        });
      }
    }

    onAdd(asset);

    // 重置表單
    setName('');
    setType('cash');
    setQuantity('');
    setCostBasis('');
    setCurrentValue('');
    setBuyPrice('');
    setCurrentPrice('');
    setSymbol('');
    setArea('');
    setPricePerPing('');
    setCurrentPricePerPing('');
    setBuyExchangeRate('');
    setCurrentExchangeRate('');
    setInsuranceAmount('');
    setFundingSource('new');
    setSourceAssetId('');

    onClose();
    console.log('✅', editingAsset ? '資產已更新' : '資產已添加');
  };

  const selectedAssetType = assetTypes.find(t => t.key === type);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, 20) }]}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>{editingAsset ? '編輯資產' : '新增資產'}</Text>
            <TouchableOpacity onPress={handleSubmit} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom + 150, 300),
              flexGrow: 1
            }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
          {/* 資產類型選擇 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>資產類型</Text>
            <FlatList
              data={assetTypes}
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              keyExtractor={(item) => item.key}
              renderItem={({ item: assetType }) => (
                <TouchableOpacity
                  style={[styles.typeButton, type === assetType.key && styles.activeTypeButton]}
                  onPress={() => setType(assetType.key)}
                >
                  <Text style={styles.typeIcon}>{assetType.icon}</Text>
                  <Text style={[styles.typeButtonText, type === assetType.key && styles.activeTypeButtonText]}>
                    {assetType.label}
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.typeScrollContent}
            />
          </View>

          {/* 費用來源選擇 (僅新增模式顯示) */}
          {!editingAsset && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>費用來源</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                data={[
                  { type: 'new', icon: '➕', label: '直接新增', id: 'new' },
                  ...availableAssets.map(asset => ({
                    ...asset,
                    type: 'asset',
                    icon: assetTypes.find(t => t.key === asset.type)?.icon || '💼',
                    label: asset.name
                  }))
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  if (item.type === 'new') {
                    return (
                      <TouchableOpacity
                        style={[styles.typeButton, fundingSource === 'new' && !sourceAssetId && styles.activeTypeButton]}
                        onPress={() => {
                          setFundingSource('new');
                          setSourceAssetId('');
                        }}
                      >
                        <Text style={styles.typeIcon}>{item.icon}</Text>
                        <Text style={[styles.typeButtonText, fundingSource === 'new' && !sourceAssetId && styles.activeTypeButtonText]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  } else {
                    const isSelected = fundingSource === 'transfer' && sourceAssetId === item.id;
                    return (
                      <TouchableOpacity
                        style={[styles.typeButton, isSelected && styles.activeTypeButton]}
                        onPress={() => {
                          setFundingSource('transfer');
                          setSourceAssetId(item.id);
                        }}
                      >
                        <Text style={styles.typeIcon}>{item.icon}</Text>
                        <Text style={[styles.typeButtonText, isSelected && styles.activeTypeButtonText]}>
                          {item.label}
                        </Text>
                        <Text style={[styles.assetBalanceText, isSelected && styles.activeAssetBalanceText]}>
                          ${item.current_value.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                }}
                contentContainerStyle={styles.typeScrollContent}
                ListEmptyComponent={
                  <View style={styles.noAssetsHint}>
                    <Ionicons name="information-circle-outline" size={16} color="#999" />
                    <Text style={styles.noAssetsHintText}>無可用資產</Text>
                  </View>
                }
              />
            </View>
          )}

          {/* 動態名稱欄位 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {(() => {
                switch (type) {
                  case 'cash':
                    return '皮夾名稱 (可選)';
                  case 'bank':
                    return '銀行名稱 (可選)';
                  case 'tw_stock':
                  case 'us_stock':
                    return '股票名稱 (可選)';
                  case 'mutual_fund':
                    return '基金名稱 (可選)';
                  case 'cryptocurrency':
                    return '代幣名稱 (可選)';
                  case 'insurance':
                    return '保單名稱 (可選)';
                  case 'real_estate':
                    return '不動產名稱 (可選)';
                  case 'vehicle':
                    return '汽車名稱 (可選)';
                  case 'other':
                    return '資產名稱 (可選)';
                  default:
                    return '資產名稱 (可選)';
                }
              })()}
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={`輸入${selectedAssetType?.label}名稱 (預設: ${selectedAssetType?.label})`}
              placeholderTextColor="#999"
            />
          </View>



          {/* 股票搜尋 (僅台股類型顯示) */}
          {type === 'tw_stock' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>股票搜尋</Text>
              <StockSearchInput
                onStockSelect={handleStockSelect}
                placeholder="輸入股票代號 (例: 2330)"
                initialValue={symbol}
                style={styles.stockSearchInput}
              />
            </View>
          )}

          {/* 美股搜尋 (僅美股類型顯示) - 使用 Supabase 資料庫 */}
          {type === 'us_stock' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>美股搜尋</Text>
              <USStockSearchInput
                value={symbol}
                onChangeText={setSymbol}
                onStockSelect={handleUSStockSelect}
                placeholder="輸入美股代號或公司名稱 (例: AAPL)"
                style={styles.stockSearchInput}
              />
              <Text style={styles.helpText}>
                支援美股500大公司&400大ETF
              </Text>
            </View>
          )}

          {/* 持有數量/坪數 (特定資產類型顯示) */}
          {type === 'real_estate' ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>坪數</Text>
              <TextInput
                style={styles.input}
                value={area}
                onChangeText={setArea}
                placeholder="輸入坪數"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          ) : type !== 'cash' && type !== 'bank' && type !== 'vehicle' && type !== 'insurance' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>持有數量</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="輸入持有數量"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 每坪成本 (不動產專用) */}
          {type === 'real_estate' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>每坪成本</Text>
              <TextInput
                style={styles.input}
                value={pricePerPing}
                onChangeText={setPricePerPing}
                placeholder="輸入每坪成本"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 每坪市價 (不動產專用) */}
          {type === 'real_estate' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>每坪市價</Text>
              <TextInput
                style={styles.input}
                value={currentPricePerPing}
                onChangeText={setCurrentPricePerPing}
                placeholder="輸入每坪市價"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 買入成本價 (特定資產類型顯示) */}
          {needsPriceCalculation.includes(type) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                買入成本價 {needsExchangeRate.includes(type) && '(美元)'}
              </Text>
              <TextInput
                style={styles.input}
                value={buyPrice}
                onChangeText={setBuyPrice}
                placeholder={needsExchangeRate.includes(type) ? "輸入買入時的美元單價" : "輸入買入時的單價"}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 現在市價 (特定資產類型顯示) */}
          {needsPriceCalculation.includes(type) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                現在市價 {needsExchangeRate.includes(type) && '(美元)'}
              </Text>
              <TextInput
                style={styles.input}
                value={currentPrice}
                onChangeText={setCurrentPrice}
                placeholder={needsExchangeRate.includes(type) ? "輸入目前的美元單價" : "輸入目前的單價"}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* 買入匯率 (美股和加密貨幣專用) */}
          {needsExchangeRate.includes(type) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>買入匯率</Text>
              <TextInput
                style={styles.input}
                value={buyExchangeRate}
                onChangeText={setBuyExchangeRate}
                placeholder="輸入買入時的即期中間價"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <Text style={styles.helpText}>
                美元兌台幣即期中間價
              </Text>
            </View>
          )}

          {/* 現在匯率 (美股和加密貨幣專用) */}
          {needsExchangeRate.includes(type) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                現在匯率 {isLoadingExchangeRate && '(載入中...)'}
              </Text>
              <TextInput
                style={[styles.input, isLoadingExchangeRate && styles.calculatedInput]}
                value={currentExchangeRate}
                onChangeText={setCurrentExchangeRate}
                placeholder={isLoadingExchangeRate ? "正在獲取匯率..." : "輸入目前的即期中間價"}
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!isLoadingExchangeRate}
              />
              <Text style={styles.helpText}>
                美元兌台幣即期中間價
              </Text>
            </View>
          )}

          {/* 金額/成本基礎 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {type === 'cash' || type === 'bank' ? '金額' : '成本基礎'}
            </Text>
            <TextInput
              style={[styles.input, (needsPriceCalculation.includes(type) || type === 'real_estate') && styles.calculatedInput]}
              value={costBasis}
              onChangeText={(needsPriceCalculation.includes(type) || type === 'real_estate') ? undefined : setCostBasis}
              placeholder={type === 'cash' || type === 'bank' ? '輸入金額' : (needsPriceCalculation.includes(type) || type === 'real_estate') ? '自動計算' : '輸入總成本'}
              keyboardType="numeric"
              placeholderTextColor="#999"
              editable={!(needsPriceCalculation.includes(type) || type === 'real_estate')}
            />
          </View>

          {/* 現在價值 (特定資產類型顯示) */}
          {['tw_stock', 'us_stock', 'mutual_fund', 'cryptocurrency', 'insurance', 'real_estate', 'vehicle', 'other'].includes(type) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>現在價值</Text>
              <TextInput
                style={[styles.input, (needsPriceCalculation.includes(type) || type === 'real_estate') && styles.calculatedInput]}
                value={currentValue}
                onChangeText={(needsPriceCalculation.includes(type) || type === 'real_estate') ? undefined : setCurrentValue}
                placeholder={(needsPriceCalculation.includes(type) || type === 'real_estate') ? '自動計算' : '輸入目前市值'}
                keyboardType="numeric"
                placeholderTextColor="#999"
                editable={!(needsPriceCalculation.includes(type) || type === 'real_estate')}
              />
            </View>
          )}

          {/* 壽險額度 (僅保單類型顯示) */}
          {type === 'insurance' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>壽險額度</Text>
              <TextInput
                style={styles.input}
                value={insuranceAmount}
                onChangeText={setInsuranceAmount}
                placeholder="輸入壽險額度"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          )}

          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10, // 減少頂部間距，因為SafeAreaView已經處理了安全區域
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  typeScroll: {
    flexDirection: 'row',
  },
  typeScrollContent: {
    paddingHorizontal: 16,
  },
  typeButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
    minWidth: 80,
  },
  activeTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeTypeButtonText: {
    color: '#fff',
  },
  input: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  calculatedInput: {
    backgroundColor: '#F8F9FA',
    color: '#666',
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // 資產餘額文字樣式
  assetBalanceText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  activeAssetBalanceText: {
    color: '#B3D9FF',
  },
  // 無可用資產提示樣式
  noAssetsHint: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    marginRight: 12,
    minWidth: 80,
    gap: 4,
  },
  noAssetsHintText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
  },
  stockSearchInput: {
    marginTop: 0,
  },
});
