#!/usr/bin/env node

/**
 * 安全檢查腳本
 * 檢查專案中是否有暴露的 API 金鑰或敏感資訊
 */

const fs = require('fs');
const path = require('path');

// 需要檢查的敏感模式
const SENSITIVE_PATTERNS = [
  // Supabase 金鑰
  /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
  // API 金鑰模式
  /sk_[a-zA-Z0-9]{24,}/g,
  /pk_[a-zA-Z0-9]{24,}/g,
  // 其他常見的金鑰模式
  /AKIA[0-9A-Z]{16}/g,
  /[0-9a-f]{32}/g,
  // 密碼模式
  /password\s*[:=]\s*["'][^"']+["']/gi,
  /secret\s*[:=]\s*["'][^"']+["']/gi,
];

// 需要忽略的目錄
const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.expo',
  'dist',
  'build',
  '.next',
  'coverage',
];

// 需要忽略的檔案
const IGNORE_FILES = [
  '.env.example',
  'SECURITY_GUIDE.md',
  'security-check.js',
];

/**
 * 檢查檔案是否包含敏感資訊
 */
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    SENSITIVE_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: filePath,
            pattern: pattern.toString(),
            match: match.substring(0, 20) + '...',
            line: findLineNumber(content, match)
          });
        });
      }
    });

    return issues;
  } catch (error) {
    console.warn(`⚠️ 無法讀取檔案: ${filePath}`);
    return [];
  }
}

/**
 * 找到匹配內容的行號
 */
function findLineNumber(content, match) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(match)) {
      return i + 1;
    }
  }
  return 0;
}

/**
 * 遞迴掃描目錄
 */
function scanDirectory(dirPath) {
  const issues = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 跳過忽略的目錄
        if (!IGNORE_DIRS.includes(item)) {
          issues.push(...scanDirectory(itemPath));
        }
      } else if (stat.isFile()) {
        // 跳過忽略的檔案
        if (!IGNORE_FILES.includes(item)) {
          issues.push(...checkFile(itemPath));
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ 無法掃描目錄: ${dirPath}`);
  }
  
  return issues;
}

/**
 * 檢查 .env 檔案是否在 Git 中
 */
function checkEnvInGit() {
  try {
    const gitIgnore = fs.readFileSync('.gitignore', 'utf8');
    const envInGitIgnore = gitIgnore.includes('.env');
    
    const envExists = fs.existsSync('.env');
    
    return {
      envExists,
      envInGitIgnore,
      safe: !envExists || envInGitIgnore
    };
  } catch (error) {
    return { envExists: false, envInGitIgnore: false, safe: true };
  }
}

/**
 * 主要執行函數
 */
function main() {
  console.log('🔒 開始安全檢查...\n');
  
  // 檢查 .env 檔案狀態
  const envStatus = checkEnvInGit();
  console.log('📋 環境變數檔案檢查:');
  console.log(`   .env 檔案存在: ${envStatus.envExists ? '✅' : '❌'}`);
  console.log(`   .env 在 .gitignore 中: ${envStatus.envInGitIgnore ? '✅' : '❌'}`);
  console.log(`   狀態: ${envStatus.safe ? '✅ 安全' : '🚨 風險'}\n`);
  
  // 掃描專案檔案
  console.log('🔍 掃描專案檔案中的敏感資訊...');
  const issues = scanDirectory('.');
  
  if (issues.length === 0) {
    console.log('✅ 沒有發現敏感資訊外洩');
  } else {
    console.log(`🚨 發現 ${issues.length} 個潛在的安全問題:\n`);
    
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. 檔案: ${issue.file}`);
      console.log(`   行號: ${issue.line}`);
      console.log(`   內容: ${issue.match}`);
      console.log(`   模式: ${issue.pattern}\n`);
    });
  }
  
  // 安全建議
  console.log('💡 安全建議:');
  console.log('   1. 確保 .env 檔案在 .gitignore 中');
  console.log('   2. 使用 GitHub Secrets 進行 CI/CD');
  console.log('   3. 定期輪換 API 金鑰');
  console.log('   4. 啟用 Supabase RLS 政策');
  console.log('   5. 監控 API 使用量和存取日誌\n');
  
  // 返回結果
  const hasIssues = issues.length > 0 || !envStatus.safe;
  if (hasIssues) {
    console.log('🚨 安全檢查失敗！請修正上述問題。');
    process.exit(1);
  } else {
    console.log('✅ 安全檢查通過！');
    process.exit(0);
  }
}

// 執行檢查
main();
