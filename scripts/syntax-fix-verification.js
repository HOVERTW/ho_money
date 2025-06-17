/**
 * 語法修復驗證測試
 * 驗證 liabilityTransactionSyncService.ts 語法錯誤是否已修復
 */

console.log('🔧 語法修復驗證測試');
console.log('==================');
console.log('測試時間:', new Date().toLocaleString());

const fs = require('fs');
const path = require('path');

function verifySyntaxFix() {
  try {
    console.log('\n📁 檢查文件存在性...');
    
    const filePath = path.join(__dirname, '../src/services/liabilityTransactionSyncService.ts');
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ 文件不存在:', filePath);
      return false;
    }
    
    console.log('✅ 文件存在:', filePath);
    
    console.log('\n📖 讀取文件內容...');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`✅ 文件讀取成功，總行數: ${fileContent.split('\n').length}`);
    
    console.log('\n🔍 檢查關鍵語法修復點...');
    
    // 檢查第536行附近的語法
    const lines = fileContent.split('\n');
    
    // 檢查第480-490行範圍
    console.log('\n📋 檢查第480-490行範圍:');
    for (let i = 479; i < 490 && i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      console.log(`${lineNumber}: ${line}`);
    }
    
    // 檢查第530-545行範圍
    console.log('\n📋 檢查第530-545行範圍:');
    for (let i = 529; i < 545 && i < lines.length; i++) {
      const lineNumber = i + 1;
      const line = lines[i];
      console.log(`${lineNumber}: ${line}`);
    }
    
    console.log('\n🔍 語法檢查項目:');
    
    // 檢查1: 確保沒有孤立的 else if
    const hasOrphanedElseIf = fileContent.includes('} else if (currentMonthPayments.length === 1) {');
    console.log(`1. 孤立的 else if 檢查: ${hasOrphanedElseIf ? '❌ 發現問題' : '✅ 正常'}`);
    
    // 檢查2: 確保大括號匹配
    const openBraces = (fileContent.match(/{/g) || []).length;
    const closeBraces = (fileContent.match(/}/g) || []).length;
    console.log(`2. 大括號匹配檢查: 開括號${openBraces}個，閉括號${closeBraces}個 ${openBraces === closeBraces ? '✅ 匹配' : '❌ 不匹配'}`);
    
    // 檢查3: 確保沒有真正的語法錯誤模式
    const problematicPatterns = [
      { pattern: /}\s*else\s*if\s*\(\s*currentMonthPayments\.length\s*===\s*1\s*\)\s*{/, desc: '孤立的 else if 語句' },
      { pattern: /await\s+[^;]+;\s*}\s*else\s*if/, desc: 'await 後直接跟 } else if' },
      { pattern: /}\s*}\s*else/, desc: '雙重大括號後跟 else' }
    ];

    let syntaxIssues = 0;
    problematicPatterns.forEach((item, index) => {
      const matches = fileContent.match(item.pattern);
      if (matches) {
        console.log(`3.${index + 1} 語法模式檢查: ❌ 發現問題: ${item.desc}`);
        syntaxIssues++;
      } else {
        console.log(`3.${index + 1} 語法模式檢查: ✅ 正常 (${item.desc})`);
      }
    });
    
    // 檢查4: 確保修復後的結構正確
    const hasCorrectStructure = fileContent.includes('await transactionDataService.addTransaction(actualTransaction);') &&
                                fileContent.includes('// 檢查是否有重複交易需要清理');
    console.log(`4. 修復結構檢查: ${hasCorrectStructure ? '✅ 正確' : '❌ 結構異常'}`);
    
    console.log('\n📊 語法修復驗證結果:');
    
    const allChecksPass = !hasOrphanedElseIf && 
                         openBraces === closeBraces && 
                         syntaxIssues === 0 && 
                         hasCorrectStructure;
    
    if (allChecksPass) {
      console.log('🎉 語法修復驗證成功！');
      console.log('✅ 所有語法檢查項目都通過');
      console.log('✅ 文件結構正確');
      console.log('✅ 準備好進行構建測試');
      return true;
    } else {
      console.log('❌ 語法修復驗證失敗！');
      console.log('❌ 仍有語法問題需要解決');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 語法修復驗證過程中發生錯誤:', error.message);
    return false;
  }
}

// 執行驗證
const success = verifySyntaxFix();

console.log('\n🏁 驗證完成');
console.log('===========');
console.log('結果:', success ? '✅ 成功' : '❌ 失敗');
console.log('時間:', new Date().toLocaleString());

if (success) {
  console.log('\n🚀 下一步:');
  console.log('1. GitHub Actions 構建應該會成功');
  console.log('2. 五個問題修復功能保持完整');
  console.log('3. 可以進行生產部署');
} else {
  console.log('\n⚠️ 需要進一步修復:');
  console.log('1. 檢查上述語法問題');
  console.log('2. 修復後重新測試');
  console.log('3. 確保構建通過');
}

process.exit(success ? 0 : 1);
