const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync, spawnSync } = require('child_process');

class CompressionTool {
  /**
   * 压缩当前目录所有内容
   * @param {string} format 压缩格式 (zip, 7z, rar)
   * @param {string} name 压缩文件名
   * @param {boolean} deleteSource 是否删除源文件
   */
  static compressAll(format, name, deleteSource = false) {
    const defaultName = path.basename(process.cwd());
    const outputName = name || `${defaultName}.${format}`;
    const outputPath = path.resolve(process.cwd(), outputName);
    
    console.log(`正在压缩当前目录所有内容到 ${outputName}...`);
    
    if (format === 'zip') {
      this.compressToZip(process.cwd(), outputPath, true);
    } else if (format === '7z') {
      this.compressWith7z(process.cwd(), outputPath, true);
    } else if (format === 'rar') {
      this.compressWithRar(process.cwd(), outputPath, true);
    }
    
    if (deleteSource) {
      console.log('删除源文件中...');
      this.deleteContents(process.cwd(), outputName);
    }
  }

  /**
   * 压缩当前目录所有文件夹（每个文件夹单独压缩）
   * @param {string} format 压缩格式
   * @param {boolean} deleteSource 是否删除源文件
   */
  static compressFolders(format, deleteSource = false) {
    const items = fs.readdirSync(process.cwd(), { withFileTypes: true });
    const folders = items.filter(item => item.isDirectory());
    
    console.log(`找到 ${folders.length} 个文件夹，开始压缩...`);
    
    folders.forEach(folder => {
      const folderPath = path.resolve(process.cwd(), folder.name);
      const outputPath = path.resolve(process.cwd(), `${folder.name}.${format}`);
      
      console.log(`正在压缩文件夹: ${folder.name}`);
      
      if (format === 'zip') {
        this.compressToZip(folderPath, outputPath, false);
      } else if (format === '7z') {
        this.compressWith7z(folderPath, outputPath, false);
      } else if (format === 'rar') {
        this.compressWithRar(folderPath, outputPath, false);
      }
      
      if (deleteSource) {
        console.log(`删除源文件夹: ${folder.name}`);
        this.deleteFolderRecursive(folderPath);
      }
    });
  }

  /**
   * 压缩当前目录所有文件（每个文件单独压缩）
   * @param {string} format 压缩格式
   * @param {boolean} deleteSource 是否删除源文件
   */
  static compressFiles(format, deleteSource = false) {
    const items = fs.readdirSync(process.cwd(), { withFileTypes: true });
    const files = items.filter(item => item.isFile());
    
    console.log(`找到 ${files.length} 个文件，开始压缩...`);
    
    files.forEach(file => {
      const filePath = path.resolve(process.cwd(), file.name);
      const outputPath = path.resolve(process.cwd(), `${file.name}.${format}`);
      
      console.log(`正在压缩文件: ${file.name}`);
      
      if (format === 'zip') {
        this.compressToZip(filePath, outputPath, false);
      } else if (format === '7z') {
        this.compressWith7z(filePath, outputPath, false);
      } else if (format === 'rar') {
        this.compressWithRar(filePath, outputPath, false);
      }
      
      if (deleteSource) {
        console.log(`删除源文件: ${file.name}`);
        fs.unlinkSync(filePath);
      }
    });
  }

  /**
   * 转换压缩格式
   * @param {string} src 源文件路径
   * @param {string} fromType 源格式
   * @param {string} toType 目标格式
   * @param {boolean} deleteSource 是否删除源文件
   */
  static convertFormat(src, fromType, toType, deleteSource = false) {
    const fullSrcPath = path.resolve(process.cwd(), src);
    const outputName = path.basename(src, fromType) + toType;
    const outputPath = path.resolve(process.cwd(), outputName);
    
    console.log(`正在将 ${src} 从 ${fromType} 转换为 ${toType}...`);
    
    // 先解压到临时目录
    const tempDir = path.resolve(process.cwd(), `temp_${Date.now()}`);
    fs.mkdirSync(tempDir);
    
    try {
      // 解压源文件
      if (fromType === 'zip') {
        this.extractZip(fullSrcPath, tempDir);
      } else if (fromType === '7z') {
        this.extract7z(fullSrcPath, tempDir);
      } else if (fromType === 'rar') {
        this.extractRar(fullSrcPath, tempDir);
      }
      
      // 压缩为目标格式
      if (toType === 'zip') {
        this.compressToZip(tempDir, outputPath, true);
      } else if (toType === '7z') {
        this.compressWith7z(tempDir, outputPath, true);
      } else if (toType === 'rar') {
        this.compressWithRar(tempDir, outputPath, true);
      }
      
      if (deleteSource) {
        console.log(`删除源文件: ${src}`);
        fs.unlinkSync(fullSrcPath);
      }
    } finally {
      // 清理临时目录
      this.deleteFolderRecursive(tempDir);
    }
  }

  /**
   * 压缩指定文件/文件夹
   * @param {string} src 源路径
   * @param {string} format 压缩格式
   * @param {string} outputPath 输出路径
   * @param {boolean} deleteSource 是否删除源文件
   */
  static compressSpecific(src, format, outputPath, deleteSource = false) {
    const fullSrcPath = path.resolve(process.cwd(), src);
    const defaultOutputName = path.basename(src) + '.' + format;
    const fullOutputPath = outputPath ? 
      path.resolve(process.cwd(), outputPath, defaultOutputName) : 
      path.resolve(process.cwd(), defaultOutputName);
    
    console.log(`正在压缩 ${src} 到 ${fullOutputPath}...`);
    
    if (format === 'zip') {
      this.compressToZip(fullSrcPath, fullOutputPath, fs.statSync(fullSrcPath).isDirectory());
    } else if (format === '7z') {
      this.compressWith7z(fullSrcPath, fullOutputPath, fs.statSync(fullSrcPath).isDirectory());
    } else if (format === 'rar') {
      this.compressWithRar(fullSrcPath, fullOutputPath, fs.statSync(fullSrcPath).isDirectory());
    }
    
    if (deleteSource) {
      console.log(`删除源: ${src}`);
      if (fs.statSync(fullSrcPath).isDirectory()) {
        this.deleteFolderRecursive(fullSrcPath);
      } else {
        fs.unlinkSync(fullSrcPath);
      }
    }
  }

  /**
   * 使用 ZIP 格式压缩
   */
  static compressToZip(source, outputPath, isDirectory) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 最高压缩级别
      });

      output.on('close', () => {
        console.log(`ZIP 压缩完成: ${archive.pointer()} 总字节`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      if (isDirectory) {
        archive.directory(source, false);
      } else {
        archive.file(source, { name: path.basename(source) });
      }

      archive.finalize();
    });
  }

  /**
   * 使用 7z 格式压缩
   */
  static compressWith7z(source, outputPath, isDirectory) {
    try {
      const sourcePath = isDirectory ? source : path.dirname(source);
      const sourceName = isDirectory ? path.basename(source) : path.basename(source);
      
      // 使用系统 7z 命令
      const command = `7z a "${outputPath}" "${isDirectory ? sourceName : './' + sourceName}"`;
      execSync(command, { cwd: sourcePath, stdio: 'inherit' });
      console.log('7z 压缩完成');
    } catch (error) {
      console.error('7z 压缩失败，请确保已安装 7-Zip');
      throw error;
    }
  }

  /**
   * 使用 RAR 格式压缩
   */
  static compressWithRar(source, outputPath, isDirectory) {
    try {
      const sourcePath = isDirectory ? source : path.dirname(source);
      const sourceName = isDirectory ? path.basename(source) : path.basename(source);
      
      // 使用系统 rar 命令
      const command = `rar a -r "${outputPath}" "${isDirectory ? sourceName : './' + sourceName}"`;
      execSync(command, { cwd: sourcePath, stdio: 'inherit' });
      console.log('RAR 压缩完成');
    } catch (error) {
      console.error('RAR 压缩失败，请确保已安装 WinRAR 或 rar 命令行工具');
      throw error;
    }
  }

  /**
   * 解压 ZIP 文件
   */
  static extractZip(source, target) {
    // 这里需要实现 ZIP 解压逻辑
    // 可以使用 adm-zip 或其他库
    console.log('ZIP 解压功能需要额外实现');
  }

  /**
   * 解压 7z 文件
   */
  static extract7z(source, target) {
    try {
      execSync(`7z x "${source}" -o"${target}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('7z 解压失败');
      throw error;
    }
  }

  /**
   * 解压 RAR 文件
   */
  static extractRar(source, target) {
    try {
      execSync(`unrar x "${source}" "${target}"`, { stdio: 'inherit' });
    } catch (error) {
      console.error('RAR 解压失败');
      throw error;
    }
  }

  /**
   * 递归删除文件夹
   */
  static deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file) => {
        const curPath = path + "/" + file;
        if (fs.lstatSync(curPath).isDirectory()) {
          this.deleteFolderRecursive(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(path);
    }
  }

  /**
   * 删除目录内容（保留指定文件）
   */
  static deleteContents(dirPath, excludeFile) {
    fs.readdirSync(dirPath).forEach(file => {
      if (file !== excludeFile) {
        const fullPath = path.join(dirPath, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
          this.deleteFolderRecursive(fullPath);
        } else {
          fs.unlinkSync(fullPath);
        }
      }
    });
  }
}

module.exports = CompressionTool;