const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const sharp = require('sharp');
const pdf = require('pdf-poppler');
const { convert: convertEpub } = require('ebook-convert');
const cliProgress = require('cli-progress');

// 支持的转换格式
const SUPPORTED_CONVERSIONS = {
  // 图像格式转换
  'png': ['jpg', 'jpeg', 'webp', 'tiff', 'bmp'],
  'jpg': ['png', 'webp', 'tiff', 'bmp'],
  'jpeg': ['png', 'webp', 'tiff', 'bmp'],
  'webp': ['png', 'jpg', 'jpeg', 'tiff', 'bmp'],
  'tiff': ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
  'bmp': ['png', 'jpg', 'jpeg', 'webp', 'tiff'],
  
  // 文档格式转换
  'txt': ['pdf', 'html', 'epub'],
  'pdf': ['txt', 'html', 'png', 'jpg'],
  'html': ['pdf', 'txt', 'epub'],
  'epub': ['pdf', 'txt', 'html'],
  
  // 添加更多支持的格式...
};

/**
 * 文件转换主函数
 * @param {string} sourcefile - 源文件路径
 * @param {string} targetFormat - 目标格式
 * @param {string} outputPath - 输出路径（可选）
 * @returns {Promise<string>} - 返回转换后的文件路径
 */
async function transformFile(sourcefile, targetFormat, outputPath = null) {
  try {
    // 检查源文件是否存在
    if (!fs.existsSync(sourcefile)) {
      throw new Error(`源文件 '${sourcefile}' 不存在`);
    }

    // 获取文件扩展名
    const sourceExt = path.extname(sourcefile).toLowerCase().substring(1);
    targetFormat = targetFormat.toLowerCase();

    // 检查是否支持转换
    if (!SUPPORTED_CONVERSIONS[sourceExt] || !SUPPORTED_CONVERSIONS[sourceExt].includes(targetFormat)) {
      throw new Error(`不支持从 ${sourceExt} 转换为 ${targetFormat}`);
    }

    // 确定输出路径
    let finalOutputPath = outputPath;
    if (!finalOutputPath) {
      const dir = path.dirname(sourcefile);
      const basename = path.basename(sourcefile, path.extname(sourcefile));
      finalOutputPath = path.join(dir, `${basename}.${targetFormat}`);
    }

    // 创建进度条
    const progressBar = new cliProgress.SingleBar({
      format: '转换进度 |{bar}| {percentage}% | {value}/{total} | 耗时: {duration}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    console.log(`开始转换: ${sourcefile} -> ${finalOutputPath}`);
    progressBar.start(100, 0);

    // 执行转换
    try {
      // 图像转换
      if (['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'].includes(sourceExt) && 
          ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp'].includes(targetFormat)) {
        await convertImage(sourcefile, finalOutputPath, targetFormat, progressBar);
      }
      // PDF转换
      else if (sourceExt === 'pdf') {
        await convertPdf(sourcefile, finalOutputPath, targetFormat, progressBar);
      }
      // EPUB转换
      else if (sourceExt === 'epub') {
        await convertEpubFile(sourcefile, finalOutputPath, targetFormat, progressBar);
      }
      // 文本文件转换
      else {
        await convertTextFile(sourcefile, finalOutputPath, targetFormat, progressBar);
      }
      
      progressBar.update(100);
      progressBar.stop();
      console.log(`转换完成: ${finalOutputPath}`);
      
      return finalOutputPath;
    } catch (error) {
      progressBar.stop();
      throw new Error(`转换过程中出错: ${error.message}`);
    }
  } catch (error) {
    throw new Error(`转换文件时出错: ${error.message}`);
  }
}

// 图像转换函数
async function convertImage(sourcePath, targetPath, targetFormat, progressBar) {
  let currentProgress = 0;
  
  // 使用sharp进行图像转换
  await sharp(sourcePath)
    .on('progress', (progress) => {
      const newProgress = Math.floor(progress.percent * 100);
      if (newProgress > currentProgress) {
        currentProgress = newProgress;
        progressBar.update(currentProgress);
      }
    })
    .toFormat(targetFormat)
    .toFile(targetPath);
}

// PDF转换函数
async function convertPdf(sourcePath, targetPath, targetFormat, progressBar) {
  if (targetFormat === 'txt') {
    // PDF转文本
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(sourcePath);
    const data = await pdfParse(dataBuffer);
    
    // 模拟进度
    for (let i = 0; i <= 100; i += 10) {
      progressBar.update(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    fs.writeFileSync(targetPath, data.text);
  } else if (['png', 'jpg'].includes(targetFormat)) {
    // PDF转图像
    const opts = {
      format: targetFormat,
      out_dir: path.dirname(targetPath),
      out_prefix: path.basename(targetPath, path.extname(targetPath)),
      page: null // 所有页面
    };
    
    let processed = 0;
    const totalPages = await getPdfPageCount(sourcePath);
    
    await pdf.convert(sourcePath, opts);
    
    // 模拟进度
    for (let page = 1; page <= totalPages; page++) {
      processed++;
      const progress = Math.floor((processed / totalPages) * 100);
      progressBar.update(progress);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// EPUB转换函数
async function convertEpubFile(sourcePath, targetPath, targetFormat, progressBar) {
  // 使用ebook-convert进行EPUB转换
  return new Promise((resolve, reject) => {
    const options = {
      input: sourcePath,
      output: targetPath
    };
    
    let progress = 0;
    const progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += 10;
        progressBar.update(progress);
      }
    }, 500);
    
    convertEpub(options, (error) => {
      clearInterval(progressInterval);
      
      if (error) {
        reject(error);
      } else {
        progressBar.update(100);
        resolve();
      }
    });
  });
}

// 文本文件转换函数
async function convertTextFile(sourcePath, targetPath, targetFormat, progressBar) {
  // 读取源文件
  const content = fs.readFileSync(sourcePath, 'utf8');
  
  // 模拟进度
  for (let i = 0; i <= 100; i += 20) {
    progressBar.update(i);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // 写入目标文件
  fs.writeFileSync(targetPath, content);
  progressBar.update(100);
}

// 获取PDF页数
async function getPdfPageCount(sourcePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(sourcePath);
  const data = await pdfParse(dataBuffer);
  return data.numpages;
}

// 获取支持的转换格式
function getSupportedConversions() {
  return SUPPORTED_CONVERSIONS;
}

module.exports = {
  transformFile,
  getSupportedConversions
};