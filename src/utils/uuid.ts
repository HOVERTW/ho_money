/**
 * UUID 工具函數
 * 統一的 UUID 生成和驗證邏輯
 */

/**
 * 生成有效的 UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 驗證 UUID 格式是否有效
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 確保 ID 是有效的 UUID 格式，如果不是則生成新的
 */
export function ensureValidUUID(id?: string): string {
  if (id && isValidUUID(id)) {
    return id;
  }
  return generateUUID();
}
