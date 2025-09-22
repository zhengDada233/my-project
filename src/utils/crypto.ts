// 使用浏览器兼容的加密API

// 生成随机的 RSA 密钥对
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  try {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: "SHA-256" }
      },
      true,
      ["sign", "verify"]
    );
  } catch (error) {
    console.error('生成密钥对失败:', error);
    throw new Error('密钥对生成失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// 导出私钥为 PEM 格式
export async function exportPrivateKeyToPem(privateKey: CryptoKey): Promise<string> {
  try {
    // 导出私钥
    const exported = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    
    // 转换为 Base64
    const base64 = arrayBufferToBase64(exported);
    
    // 添加 PEM 头尾
    return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
  } catch (error) {
    console.error('导出私钥失败:', error);
    throw new Error('私钥导出失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// 提取PEM格式私钥（兼容旧代码）
export function extractPrivateKeyFromPem(pemContent: string): string {
  // 移除PEM文件中的头尾标识和换行符
  const base64Key = pemContent
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '');
  
  return base64Key;
}

// 生成签名
export async function generateSignature(privateKey: CryptoKey, payload: string): Promise<string> {
  try {
    // 使用Web Crypto API进行签名
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    
    // 创建签名
    const signature = await window.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      data
    );
    
    // 转换为Base64
    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('生成签名失败:', error);
    throw new Error('签名生成失败: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// 创建请求参数
export function createRequestParams(
  symbol: string, 
  side: string, 
  type: string, 
  timeInForce: string,
  quantity: string,
  price: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  
  const params: Record<string, string> = {
    symbol,
    side,
    type,
    timeInForce,
    quantity,
    price,
    timestamp
  };
  
  return params;
}

// 辅助函数：ArrayBuffer转Base64字符串
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 辅助函数：Base64字符串转ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}