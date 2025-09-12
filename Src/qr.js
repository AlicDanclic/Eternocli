const QRCode = require('qrcode');
const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');

/**
 * 生成二维码
 * @param {string} content - 要编码的内容
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<void>}
 */
async function generateQRCode(content, outputPath) {
  try {
    await QRCode.toFile(outputPath, content, {
      color: {
        dark: '#000000', // 黑色点
        light: '#FFFFFF' // 白色背景
      },
      width: 300,
      margin: 1
    });
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * 生成条形码
 * @param {string} content - 要编码的内容
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<void>}
 */
async function generateBarcode(content, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = createCanvas();
      JsBarcode(canvas, content, {
        format: 'CODE128',
        width: 2,
        height: 100,
        displayValue: true,
        margin: 10
      });

      const fs = require('fs');
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      out.on('finish', resolve);
      out.on('error', reject);
    } catch (error) {
      reject(new Error(`Failed to generate barcode: ${error.message}`));
    }
  });
}

module.exports = {
  generateQRCode,
  generateBarcode
};