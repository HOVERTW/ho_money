#!/usr/bin/env node

/**
 * 緊急資產持久性測試 - 確保資產不會自動消失
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase 配置
const SUPABASE_URL = 'https://yrryyapzkgrsahranzvo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlycnl5YXB6a2dyc2FocmFuenZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNzM2MzUsImV4cCI6MjA2Mzc0OTYzNX0.TccJJ9KGG6R4KiaDb-548kRkhTaPMODYa6vlQsj8dmM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 測試用戶
const TEST_USER = {
  email: 'user01@gmail.com',
  password: 'user01'
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function emergencyAssetPersistenceTest() {
  console.log('🚨 緊急資產持久性測試');
  console.log('====================');
  console.log(`開始時間: ${new Date().toLocaleString()}`);

  const testResults = {
    assetCreation: false,
    assetPersistence: false,
    multipleOperations: false,
    dataIntegrity: false,
    noAutoDisappear: false
  };

  try {
    // 登錄測試用戶
    console.log('\n🔐 登錄測試用戶...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (authError) {
      console.error('❌ 登錄失敗:', authError.message);
      return testResults;
    }

    const userId = authData.user.id;
    console.log('✅ 登錄成功，用戶ID:', userId);

    // 清理測試數據
    console.log('\n🧹 清理舊測試數據...');
    await supabase.from('assets').delete().eq('user_id', userId);

    // 測試1: 創建資產
    console.log('\n💰 測試1: 創建資產');
    console.log('================');

    const assetId = generateUUID();
    const testAsset = {
      id: assetId,
      user_id: userId,
      name: '緊急測試現金',
      type: 'cash',
      value: 100000,
      current_value: 100000,
      cost_basis: 100000,
      quantity: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createData, error: createError } = await supabase
      .from('assets')
      .insert(testAsset)
      .select();

    if (!createError && createData && createData.length > 0) {
      testResults.assetCreation = true;
      console.log('✅ 資產創建成功:', createData[0].name);
    } else {
      console.log('❌ 資產創建失敗:', createError?.message);
    }

    // 測試2: 資產持久性檢查（多次查詢）
    console.log('\n🔍 測試2: 資產持久性檢查');
    console.log('========================');

    let persistenceCount = 0;
    const checkCount = 5;

    for (let i = 1; i <= checkCount; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒

      const { data: checkData, error: checkError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .eq('id', assetId);

      if (!checkError && checkData && checkData.length > 0) {
        persistenceCount++;
        console.log(`✅ 第${i}次檢查: 資產仍存在`);
      } else {
        console.log(`❌ 第${i}次檢查: 資產消失了！`);
      }
    }

    if (persistenceCount === checkCount) {
      testResults.assetPersistence = true;
      console.log('✅ 資產持久性測試通過');
    } else {
      console.log(`❌ 資產持久性測試失敗: ${persistenceCount}/${checkCount}`);
    }

    // 測試3: 多重操作測試
    console.log('\n🔄 測試3: 多重操作測試');
    console.log('====================');

    // 創建多個資產
    const multipleAssets = [];
    for (let i = 1; i <= 3; i++) {
      const asset = {
        id: generateUUID(),
        user_id: userId,
        name: `測試資產${i}`,
        type: 'investment',
        value: 50000 * i,
        current_value: 50000 * i,
        cost_basis: 50000 * i,
        quantity: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      multipleAssets.push(asset);
    }

    const { error: multipleError } = await supabase
      .from('assets')
      .insert(multipleAssets);

    if (!multipleError) {
      // 檢查所有資產是否都存在
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: allAssets, error: queryError } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId);

      if (!queryError && allAssets && allAssets.length >= 4) { // 原來1個 + 新增3個
        testResults.multipleOperations = true;
        console.log(`✅ 多重操作測試通過: 找到 ${allAssets.length} 個資產`);
      } else {
        console.log(`❌ 多重操作測試失敗: 只找到 ${allAssets?.length || 0} 個資產`);
      }
    } else {
      console.log('❌ 多重資產創建失敗:', multipleError.message);
    }

    // 測試4: 數據完整性檢查
    console.log('\n🔍 測試4: 數據完整性檢查');
    console.log('========================');

    const { data: integrityData, error: integrityError } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', userId);

    if (!integrityError && integrityData) {
      let integrityPassed = true;
      
      integrityData.forEach(asset => {
        if (!asset.id || !asset.name || !asset.type || asset.value === null) {
          integrityPassed = false;
          console.log(`❌ 資產數據不完整: ${asset.name}`);
        }
      });

      if (integrityPassed && integrityData.length > 0) {
        testResults.dataIntegrity = true;
        console.log('✅ 數據完整性檢查通過');
      } else {
        console.log('❌ 數據完整性檢查失敗');
      }
    } else {
      console.log('❌ 數據完整性檢查失敗:', integrityError?.message);
    }

    // 測試5: 自動消失檢查（長時間監控）
    console.log('\n⏰ 測試5: 自動消失檢查');
    console.log('====================');

    const monitoringDuration = 10; // 監控10秒
    const checkInterval = 2; // 每2秒檢查一次
    const totalChecks = monitoringDuration / checkInterval;
    let disappearanceCount = 0;

    for (let i = 1; i <= totalChecks; i++) {
      await new Promise(resolve => setTimeout(resolve, checkInterval * 1000));

      const { data: monitorData, error: monitorError } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', userId);

      if (monitorError || !monitorData || monitorData.length === 0) {
        disappearanceCount++;
        console.log(`❌ 第${i}次監控: 資產消失了！`);
      } else {
        console.log(`✅ 第${i}次監控: 資產正常 (${monitorData.length}個)`);
      }
    }

    if (disappearanceCount === 0) {
      testResults.noAutoDisappear = true;
      console.log('✅ 自動消失檢查通過: 資產沒有自動消失');
    } else {
      console.log(`❌ 自動消失檢查失敗: 發生 ${disappearanceCount} 次消失`);
    }

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
  }

  // 結果統計
  console.log('\n📊 緊急測試結果');
  console.log('==============');

  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = Math.round(passedTests / totalTests * 100);

  console.log(`1. 資產創建: ${testResults.assetCreation ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`2. 資產持久性: ${testResults.assetPersistence ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`3. 多重操作: ${testResults.multipleOperations ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`4. 數據完整性: ${testResults.dataIntegrity ? '✅ 通過' : '❌ 失敗'}`);
  console.log(`5. 無自動消失: ${testResults.noAutoDisappear ? '✅ 通過' : '❌ 失敗'}`);

  console.log(`\n🎯 總體成功率: ${passedTests}/${totalTests} (${successRate}%)`);

  if (successRate === 100) {
    console.log('\n🎉 所有測試通過！資產不會自動消失！');
  } else {
    console.log(`\n⚠️ 還有 ${totalTests - passedTests} 個問題需要修復`);
  }

  console.log(`\n結束時間: ${new Date().toLocaleString()}`);
  return testResults;
}

// 執行測試
if (require.main === module) {
  emergencyAssetPersistenceTest();
}

module.exports = { emergencyAssetPersistenceTest };
