const crypto = require('crypto');
const fs = require('fs');

// 支持的加密算法
const SUPPORTED_ALGORITHMS = {
  'aes-256-cbc': { keyLength: 32, ivLength: 16 },
  'aes-192-cbc': { keyLength: 24, ivLength: 16 },
  'aes-128-cbc': { keyLength: 16, ivLength: 16 },
  'des-ede3-cbc': { keyLength: 24, ivLength: 8 },
  'bf-cbc': { keyLength: 16, ivLength: 8 },
  'rc4': { keyLength: 16, ivLength: 0 } // RC4 不需要 IV
};

/**
 * 生成随机密钥和IV
 * @param {string} algorithm - 加密算法
 * @returns {Object} 包含key和iv的对象
 */
function generateKeyAndIV(algorithm) {
  if (!SUPPORTED_ALGORITHMS[algorithm]) {
    throw new Error(`不支持的加密算法: ${algorithm}`);
  }
  
  const { keyLength, ivLength } = SUPPORTED_ALGORITHMS[algorithm];
  const key = crypto.randomBytes(keyLength);
  const iv = ivLength > 0 ? crypto.randomBytes(ivLength) : null;
  
  return { key, iv };
}

/**
 * 加密函数
 * @param {string|Buffer} data - 要加密的数据
 * @param {string} algorithm - 加密算法
 * @param {Buffer} key - 加密密钥
 * @param {Buffer} iv - 初始化向量
 * @returns {Object} 包含加密数据和参数的对象
 */
function encrypt(data, algorithm, key, iv) {
  if (!SUPPORTED_ALGORITHMS[algorithm]) {
    throw new Error(`不支持的加密算法: ${algorithm}`);
  }
  
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    algorithm,
    encryptedData: encrypted,
    key: key.toString('hex'),
    iv: iv ? iv.toString('hex') : null
  };
}

/**
 * 解密函数
 * @param {string} encryptedData - 要解密的数据
 * @param {string} algorithm - 加密算法
 * @param {string} key - 加密密钥（十六进制字符串）
 * @param {string} iv - 初始化向量（十六进制字符串，可选）
 * @returns {string} 解密后的数据
 */
function decrypt(encryptedData, algorithm, key, iv) {
  if (!SUPPORTED_ALGORITHMS[algorithm]) {
    throw new Error(`不支持的加密算法: ${algorithm}`);
  }
  
  const keyBuffer = Buffer.from(key, 'hex');
  const ivBuffer = iv ? Buffer.from(iv, 'hex') : null;
  
  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 从文件加密/解密
 * @param {string} inputFile - 输入文件路径
 * @param {string} outputFile - 输出文件路径
 * @param {string} operation - 操作类型 (encrypt/decrypt)
 * @param {string} algorithm - 加密算法
 * @param {string} key - 加密密钥（十六进制字符串）
 * @param {string} iv - 初始化向量（十六进制字符串，可选）
 * @returns {Promise<void>}
 */
async function processFile(inputFile, outputFile, operation, algorithm, key, iv) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(inputFile)) {
        throw new Error(`输入文件不存在: ${inputFile}`);
      }
      
      const inputStream = fs.createReadStream(inputFile);
      const outputStream = fs.createWriteStream(outputFile);
      
      if (operation === 'encrypt') {
        const keyBuffer = Buffer.from(key, 'hex');
        const ivBuffer = iv ? Buffer.from(iv, 'hex') : null;
        const cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
        
        inputStream.pipe(cipher).pipe(outputStream);
      } else if (operation === 'decrypt') {
        const keyBuffer = Buffer.from(key, 'hex');
        const ivBuffer = iv ? Buffer.from(iv, 'hex') : null;
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        
        inputStream.pipe(decipher).pipe(outputStream);
      }
      
      outputStream.on('finish', () => resolve());
      outputStream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 获取支持的加密算法列表
 * @returns {Array} 支持的算法列表
 */
function getSupportedAlgorithms() {
  return Object.keys(SUPPORTED_ALGORITHMS);
}

module.exports = {
  generateKeyAndIV,
  encrypt,
  decrypt,
  processFile,
  getSupportedAlgorithms,
  SUPPORTED_ALGORITHMS
};