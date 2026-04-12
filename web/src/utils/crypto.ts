import CryptoJS from 'crypto-js';

/**
 * 加密工具
 * 用于敏感数据的本地存储加密
 */

// 密钥（实际项目中应从环境变量获取）
const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY || 'wxeditor-secret-key-2024';

/**
 * AES 加密
 */
export function encrypt(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
}

/**
 * AES 解密
 */
export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * SHA256 哈希
 */
export function sha256(data: string): string {
  return CryptoJS.SHA256(data).toString();
}

/**
 * 生成随机令牌
 */
export function generateToken(length: number = 32): string {
  return CryptoJS.lib.WordArray.random(length).toString();
}

/**
 * MD5 哈希（用于文件校验）
 */
export function md5(data: string): string {
  return CryptoJS.MD5(data).toString();
}

/**
 * 加密对象
 */
export function encryptObject<T>(obj: T): string {
  const json = JSON.stringify(obj);
  return encrypt(json);
}

/**
 * 解密对象
 */
export function decryptObject<T>(ciphertext: string): T | null {
  try {
    const json = decrypt(ciphertext);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Base64 编码
 */
export function base64Encode(data: string): string {
  return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(data));
}

/**
 * Base64 解码
 */
export function base64Decode(encoded: string): string {
  return CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(encoded));
}