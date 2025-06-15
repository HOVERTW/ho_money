/**
 * UUID 服務
 * 處理 UUID 生成和格式化，確保與 Supabase 兼容
 */

export class UUIDService {
  
  /**
   * 生成符合 RFC 4122 標準的 UUID v4
   */
  static generateUUID(): string {
    // 使用 crypto.randomUUID() 如果可用（現代瀏覽器和 Node.js 15+）
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // 回退到手動生成
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * 驗證 UUID 格式
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * 生成交易 ID
   */
  static generateTransactionId(): string {
    return this.generateUUID();
  }

  /**
   * 生成資產 ID
   */
  static generateAssetId(): string {
    return this.generateUUID();
  }

  /**
   * 生成類別 ID
   */
  static generateCategoryId(): string {
    return this.generateUUID();
  }

  /**
   * 生成帳戶 ID
   */
  static generateAccountId(): string {
    return this.generateUUID();
  }

  /**
   * 生成用戶配置 ID
   */
  static generateProfileId(): string {
    return this.generateUUID();
  }

  /**
   * 將舊格式 ID 轉換為 UUID（如果需要）
   */
  static convertToUUID(oldId: string): string {
    // 如果已經是有效的 UUID，直接返回
    if (this.isValidUUID(oldId)) {
      return oldId;
    }

    // 如果是舊格式，生成新的 UUID
    // 這裡可以根據需要實現特定的轉換邏輯
    return this.generateUUID();
  }

  /**
   * 批量生成 UUID
   */
  static generateBatch(count: number): string[] {
    const uuids: string[] = [];
    for (let i = 0; i < count; i++) {
      uuids.push(this.generateUUID());
    }
    return uuids;
  }

  /**
   * 生成帶前綴的 ID（用於測試或特殊用途）
   */
  static generateWithPrefix(prefix: string): string {
    const uuid = this.generateUUID();
    return `${prefix}_${uuid}`;
  }

  /**
   * 生成短 ID（用於顯示）
   */
  static generateShortId(): string {
    return this.generateUUID().split('-')[0];
  }

  /**
   * 從 UUID 提取時間戳（如果是 UUID v1）
   */
  static extractTimestamp(uuid: string): Date | null {
    if (!this.isValidUUID(uuid)) {
      return null;
    }

    // UUID v1 包含時間戳，但我們主要使用 v4
    // 這裡返回 null，因為 v4 不包含時間戳
    return null;
  }

  /**
   * 比較兩個 UUID
   */
  static compare(uuid1: string, uuid2: string): number {
    if (!this.isValidUUID(uuid1) || !this.isValidUUID(uuid2)) {
      throw new Error('Invalid UUID format');
    }

    return uuid1.localeCompare(uuid2);
  }

  /**
   * 格式化 UUID 顯示
   */
  static formatForDisplay(uuid: string, length: number = 8): string {
    if (!this.isValidUUID(uuid)) {
      return uuid;
    }

    return uuid.substring(0, length) + '...';
  }

  /**
   * 生成測試用的固定 UUID
   */
  static generateTestUUID(seed: string): string {
    // 為測試生成可預測的 UUID
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 轉換為 32 位整數
    }

    // 使用 hash 生成 UUID 格式的字符串
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `${hex.substring(0, 8)}-${hex.substring(0, 4)}-4${hex.substring(1, 4)}-8${hex.substring(0, 3)}-${hex}${hex.substring(0, 4)}`;
  }

  /**
   * 驗證並修復 UUID
   */
  static validateAndFix(id: string): string {
    if (this.isValidUUID(id)) {
      return id;
    }

    // 如果不是有效的 UUID，生成新的
    console.warn(`無效的 UUID: ${id}，生成新的 UUID`);
    return this.generateUUID();
  }

  /**
   * 從對象中提取所有 UUID 字段並驗證
   */
  static validateObjectUUIDs(obj: any, uuidFields: string[]): any {
    const validatedObj = { ...obj };

    for (const field of uuidFields) {
      if (validatedObj[field]) {
        validatedObj[field] = this.validateAndFix(validatedObj[field]);
      }
    }

    return validatedObj;
  }

  /**
   * 生成用於數據庫插入的完整記錄 ID
   */
  static generateRecordIds(recordType: 'transaction' | 'asset' | 'category' | 'account' | 'profile'): {
    id: string;
    created_at: string;
    updated_at: string;
  } {
    const now = new Date().toISOString();
    
    return {
      id: this.generateUUID(),
      created_at: now,
      updated_at: now
    };
  }

  /**
   * 批量驗證 UUID 數組
   */
  static validateUUIDArray(uuids: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const uuid of uuids) {
      if (this.isValidUUID(uuid)) {
        valid.push(uuid);
      } else {
        invalid.push(uuid);
      }
    }

    return { valid, invalid };
  }

  /**
   * 生成用於關聯的 UUID 對
   */
  static generateRelationshipIds(): {
    parentId: string;
    childId: string;
    relationshipId: string;
  } {
    return {
      parentId: this.generateUUID(),
      childId: this.generateUUID(),
      relationshipId: this.generateUUID()
    };
  }
}

// 導出便捷函數
export const generateUUID = () => UUIDService.generateUUID();
export const isValidUUID = (uuid: string) => UUIDService.isValidUUID(uuid);
export const generateTransactionId = () => UUIDService.generateTransactionId();
export const generateAssetId = () => UUIDService.generateAssetId();
export const generateCategoryId = () => UUIDService.generateCategoryId();
export const validateAndFixUUID = (id: string) => UUIDService.validateAndFix(id);

// 默認導出
export default UUIDService;
