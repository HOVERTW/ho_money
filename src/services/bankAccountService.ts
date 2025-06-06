import { BankAccount, BankAccountType } from '../types';

/**
 * 銀行帳戶管理服務
 */
export class BankAccountService {
  private bankAccounts: BankAccount[] = [];
  // 從空列表開始，讓用戶自己添加銀行帳戶

  /**
   * 獲取所有銀行帳戶
   * @returns 銀行帳戶列表
   */
  getAllBankAccounts(): BankAccount[] {
    return this.bankAccounts.filter(account => account.is_active);
  }

  /**
   * 根據ID獲取銀行帳戶
   * @param id 銀行帳戶ID
   * @returns 銀行帳戶或undefined
   */
  getBankAccountById(id: string): BankAccount | undefined {
    return this.bankAccounts.find(account => account.id === id && account.is_active);
  }

  /**
   * 創建新的銀行帳戶
   * @param accountData 銀行帳戶數據
   * @returns 創建的銀行帳戶
   */
  createBankAccount(accountData: {
    name: string;
    account_number?: string;
    account_type?: BankAccountType;
  }): BankAccount {
    const newAccount: BankAccount = {
      id: `bank_${Date.now()}`,
      user_id: 'current_user',
      name: accountData.name,
      account_number: accountData.account_number,
      account_type: accountData.account_type || BankAccountType.OTHER,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.bankAccounts.push(newAccount);
    return newAccount;
  }

  /**
   * 更新銀行帳戶
   * @param id 銀行帳戶ID
   * @param updates 更新數據
   * @returns 更新後的銀行帳戶或null
   */
  updateBankAccount(
    id: string,
    updates: Partial<Pick<BankAccount, 'name' | 'account_number' | 'account_type'>>
  ): BankAccount | null {
    const index = this.bankAccounts.findIndex(account => account.id === id);
    if (index === -1) return null;

    this.bankAccounts[index] = {
      ...this.bankAccounts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return this.bankAccounts[index];
  }

  /**
   * 刪除銀行帳戶（軟刪除）
   * @param id 銀行帳戶ID
   * @returns 是否成功刪除
   */
  deleteBankAccount(id: string): boolean {
    const index = this.bankAccounts.findIndex(account => account.id === id);
    if (index === -1) return false;

    this.bankAccounts[index] = {
      ...this.bankAccounts[index],
      is_active: false,
      updated_at: new Date().toISOString(),
    };

    return true;
  }

  /**
   * 檢查銀行名稱是否已存在
   * @param name 銀行名稱
   * @param excludeId 排除的ID（用於更新時檢查）
   * @returns 是否已存在
   */
  isBankNameExists(name: string, excludeId?: string): boolean {
    return this.bankAccounts.some(
      account =>
        account.is_active &&
        account.name.toLowerCase() === name.toLowerCase() &&
        account.id !== excludeId
    );
  }



  /**
   * 獲取預設銀行帳戶（如果只有一個）
   * @returns 預設銀行帳戶或null
   */
  getDefaultBankAccount(): BankAccount | null {
    const activeBanks = this.getAllBankAccounts();
    return activeBanks.length === 1 ? activeBanks[0] : null;
  }

  /**
   * 檢查是否需要顯示銀行選擇器
   * @returns 是否需要顯示銀行選擇器
   */
  shouldShowBankSelector(): boolean {
    return this.getAllBankAccounts().length > 1;
  }

  /**
   * 獲取銀行帳戶的簡短顯示名稱
   * @param bankAccount 銀行帳戶
   * @returns 簡短顯示名稱
   */
  getBankDisplayName(bankAccount: BankAccount): string {
    if (bankAccount.account_number) {
      // 如果有帳號，顯示銀行名稱和後四位
      const lastFour = bankAccount.account_number.slice(-4);
      return `${bankAccount.name} ****${lastFour}`;
    }
    return bankAccount.name;
  }

  /**
   * 重置為空的銀行帳戶列表（用於測試）
   */
  resetToDefault(): void {
    this.bankAccounts = [];
  }

  /**
   * 獲取統計信息
   * @returns 銀行帳戶統計
   */
  getStatistics() {
    const activeBanks = this.getAllBankAccounts();

    return {
      totalBanks: activeBanks.length,
      shouldShowSelector: this.shouldShowBankSelector(),
    };
  }
}

// 創建單例實例
export const bankAccountService = new BankAccountService();
