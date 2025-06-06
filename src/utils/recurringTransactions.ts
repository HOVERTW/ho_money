import { RecurringFrequency, Transaction, RecurringTransaction } from '../types';

/**
 * 計算下一個循環日期
 * @param currentDate 當前日期
 * @param frequency 循環頻率
 * @param originalTargetDay 原始目標日期（可選，用於月末調整）
 * @returns 下一個執行日期
 */
export function calculateNextDate(
  currentDate: Date,
  frequency: RecurringFrequency,
  originalTargetDay?: number
): Date {
  // 獲取當前日期的各個組件
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const day = currentDate.getDate();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();
  const milliseconds = currentDate.getMilliseconds();

  switch (frequency) {
    case RecurringFrequency.DAILY:
      // 創建明天的日期
      return new Date(year, month, day + 1, hours, minutes, seconds, milliseconds);

    case RecurringFrequency.WEEKLY:
      // 創建下週同一天的日期
      return new Date(year, month, day + 7, hours, minutes, seconds, milliseconds);

    case RecurringFrequency.MONTHLY:
      // 使用原始目標日期或當前日期
      const targetDay = originalTargetDay || day;

      // 計算下個月
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

      // 獲取下個月的最後一天
      const lastDayOfNextMonth = new Date(nextYear, adjustedMonth + 1, 0).getDate();

      // 根據正確的月末調整邏輯
      let adjustedDay: number;
      if (targetDay > lastDayOfNextMonth) {
        // 如果原始目標日期超過該月的最大天數，使用該月的最後一天
        adjustedDay = lastDayOfNextMonth;
        console.log(`📅 月末日期調整: 原定${targetDay}號，${nextYear}年${adjustedMonth + 1}月只有${lastDayOfNextMonth}天，調整為${lastDayOfNextMonth}號`);
      } else {
        adjustedDay = targetDay;
      }

      return new Date(nextYear, adjustedMonth, adjustedDay, hours, minutes, seconds, milliseconds);

    case RecurringFrequency.YEARLY:
      // 創建明年同一天的日期，處理閏年情況
      const nextYearForYearly = year + 1;

      // 特別處理2月29日的情況
      if (month === 1 && day === 29) { // 2月29日
        const isNextYearLeap = ((nextYearForYearly % 4 === 0) && (nextYearForYearly % 100 !== 0)) || (nextYearForYearly % 400 === 0);
        if (!isNextYearLeap) {
          console.log(`📅 閏年調整: ${nextYearForYearly}年不是閏年，2月29日調整為2月28日`);
          return new Date(nextYearForYearly, 1, 28, hours, minutes, seconds, milliseconds);
        }
      }

      return new Date(nextYearForYearly, month, day, hours, minutes, seconds, milliseconds);

    default:
      throw new Error(`不支援的循環頻率: ${frequency}`);
  }
}



/**
 * 演示月末日期調整邏輯（用於測試）
 * @param startDay 開始日期（1-31）
 * @param months 要測試的月份數
 */
export function demonstrateMonthEndAdjustment(startDay: number, months: number = 12): void {
  console.log(`📅 演示每月${startDay}號的日期調整：`);

  const startDate = new Date(2024, 0, startDay); // 2024年1月
  let currentDate = new Date(startDate);

  for (let i = 0; i < months; i++) {
    const monthName = currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' });
    const actualDay = currentDate.getDate();

    if (actualDay !== startDay) {
      console.log(`  ${monthName}: ${startDay}號 → ${actualDay}號 (調整)`);
    } else {
      console.log(`  ${monthName}: ${actualDay}號 (正常)`);
    }

    // 移動到下個月，使用原始目標日期
    currentDate = calculateNextDate(currentDate, RecurringFrequency.MONTHLY, startDay);
  }
}

/**
 * 從循環交易模板生成實際交易記錄
 * @param recurringTransaction 循環交易模板
 * @param executionDate 執行日期
 * @returns 生成的交易記錄
 */
export function generateTransactionFromRecurring(
  recurringTransaction: RecurringTransaction,
  executionDate: Date
): Transaction {
  return {
    id: `${recurringTransaction.id}_${executionDate.getTime()}`,
    user_id: recurringTransaction.user_id,
    account_id: recurringTransaction.account_id,
    category_id: recurringTransaction.category_id,
    // 添加 account 和 category 字段以便正確顯示
    account: recurringTransaction.account_id,
    category: recurringTransaction.category_id,
    amount: recurringTransaction.amount,
    type: recurringTransaction.type,
    description: recurringTransaction.description,
    date: executionDate.toISOString(),
    is_recurring: true,
    recurring_frequency: recurringTransaction.frequency,
    max_occurrences: recurringTransaction.max_occurrences, // 添加重複次數
    parent_recurring_id: recurringTransaction.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 檢查循環交易是否需要執行
 * @param recurringTransaction 循環交易模板
 * @param currentDate 當前日期
 * @returns 是否需要執行
 */
export function shouldExecuteRecurring(
  recurringTransaction: RecurringTransaction,
  currentDate: Date = new Date()
): boolean {
  if (!recurringTransaction.is_active) {
    return false;
  }

  const nextExecutionDate = new Date(recurringTransaction.next_execution_date);
  const today = new Date(currentDate.toDateString()); // 只比較日期，不比較時間
  const executionDay = new Date(nextExecutionDate.toDateString());

  // 如果今天是或已過執行日期
  if (today >= executionDay) {
    // 檢查是否有結束日期限制
    if (recurringTransaction.end_date) {
      const endDate = new Date(recurringTransaction.end_date);
      return today <= endDate;
    }
    return true;
  }

  return false;
}

/**
 * 更新循環交易的下次執行日期
 * @param recurringTransaction 循環交易模板
 * @returns 更新後的循環交易
 */
export function updateNextExecutionDate(
  recurringTransaction: RecurringTransaction
): RecurringTransaction {
  const currentExecutionDate = new Date(recurringTransaction.next_execution_date);
  const nextDate = calculateNextDate(
    currentExecutionDate,
    recurringTransaction.frequency,
    recurringTransaction.original_target_day
  );

  return {
    ...recurringTransaction,
    next_execution_date: nextDate.toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 獲取循環頻率的中文顯示名稱
 * @param frequency 循環頻率
 * @returns 中文名稱
 */
export function getFrequencyDisplayName(frequency: RecurringFrequency): string {
  switch (frequency) {
    case RecurringFrequency.DAILY:
      return '每日';
    case RecurringFrequency.WEEKLY:
      return '每週';
    case RecurringFrequency.MONTHLY:
      return '每月';
    case RecurringFrequency.YEARLY:
      return '每年';
    default:
      return '未知';
  }
}

/**
 * 生成未來的循環交易預覽
 * @param recurringTransaction 循環交易模板
 * @param months 預覽幾個月
 * @returns 未來交易列表
 */
export function generateFutureTransactions(
  recurringTransaction: RecurringTransaction,
  months: number = 12
): Transaction[] {
  const transactions: Transaction[] = [];
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + months);

  let currentDate = new Date(recurringTransaction.next_execution_date);
  const originalTargetDay = recurringTransaction.original_target_day;

  while (currentDate <= endDate) {
    // 檢查是否超過結束日期
    if (recurringTransaction.end_date) {
      const recurringEndDate = new Date(recurringTransaction.end_date);
      if (currentDate > recurringEndDate) {
        break;
      }
    }

    const transaction = generateTransactionFromRecurring(recurringTransaction, currentDate);
    transactions.push(transaction);

    currentDate = calculateNextDate(currentDate, recurringTransaction.frequency, originalTargetDay);
  }

  return transactions;
}
