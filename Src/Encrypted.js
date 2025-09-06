// ./Src/Encrypted.js
const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

// 使用固定的密钥或从环境变量获取（实际应用中应该使用更安全的密钥管理）
const KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars-long!';

class Encrypted {
  static async encryptAndCompress(srcPath, destPath) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(srcPath);
      const writeStream = fs.createWriteStream(destPath);
      
      // 创建加密算法
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        crypto.scryptSync(KEY, 'salt', 32),
        crypto.randomBytes(16)
      );
      
      // 管道：读取 -> 压缩 -> 加密 -> 写入
      readStream
        .pipe(zlib.createGzip())
        .pipe(cipher)
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }

  static async decryptAndDecompress(srcPath, destPath) {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(srcPath);
      const writeStream = fs.createWriteStream(destPath);
      
      // 创建解密算法
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        crypto.scryptSync(KEY, 'salt', 32),
        crypto.randomBytes(16)
      );
      
      // 管道：读取 -> 解密 -> 解压 -> 写入
      readStream
        .pipe(decipher)
        .pipe(zlib.createGunzip())
        .pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });
  }
}

module.exports = Encrypted;