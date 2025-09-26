#!/usr/bin/env node

/**begin 导入模块**/
/**
 * 导入所需的核心模块和第三方模块
 * @module 导入模块
 */
const { program } = require('commander');
const fs = require('fs');
const path = require('path');
const { execSync,spawn } = require('child_process');
const { renameImages,padNumberFilenames } = require('./Src/renameUtils');
const { setAutostartLink, setAutostartExe } = require('./src/autostart');
const { exec } = require('child_process');
const { getMediaDetails} = require('./Src/vmdetail');
const { generateQRCode, generateBarcode } = require('./Src/qr');
const Encrypted = require('./Src/Encrypted');
const { transformFile, getSupportedConversions } = require('./Src/transform');
// 在文件顶部添加加密解密模块的引入
const { 
  generateKeyAndIV, 
  encrypt, 
  decrypt, 
  processFile, 
  getSupportedAlgorithms 
} = require('./Src/code');
const CompressionTool = require('./Src/zip');
/**end 导入模块**/

/**begin 默认配置**/
/**
 * 默认项目结构和文件配置
 * @module 默认配置
 */
const defaultDirs = ['Bitmap', 'Hardware', 'Software', 'References','DataSheet'];
const defaultFiles = ['Readme.md', '.gitignore'];
/**end 默认配置**/

/**begin 程序基本信息**/
/**
 * 程序版本信息和基本配置
 * @module 程序基本信息
 */
const packageJson = require('./package.json');
program.version(packageJson.version);
/**end 程序基本信息**/

/**begin 创建项目命令**/
/**
 * 创建新项目结构的命令实现
 * @module 创建项目命令
 */
program
  .command('create <name>')
  .description('创建新项目结构')
  .option('-d, --dir <path>', '指定项目目录', '.')
  .option('-a, --add <items>', '添加额外的目录/文件', '')
  .option('-r, --remove <items>', '移除默认目录/文件', '')
  .action((name, options) => {
    try {
      // 确定项目路径
      const projectPath = path.resolve(options.dir, name);
      
      // 创建项目目录
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }
      
      // 处理要添加/移除的目录
      const dirsToCreate = [...defaultDirs];
      const filesToCreate = [...defaultFiles];
      
      // 如果指定了移除项，则移除
      if (options.remove) {
        const itemsToRemove = options.remove.split(',');
        itemsToRemove.forEach(item => {
          const dirIndex = dirsToCreate.indexOf(item);
          if (dirIndex !== -1) dirsToCreate.splice(dirIndex, 1);
          
          const fileIndex = filesToCreate.indexOf(item);
          if (fileIndex !== -1) filesToCreate.splice(fileIndex, 1);
        });
      }
      
      // 如果指定了添加项，则添加
      if (options.add) {
        const itemsToAdd = options.add.split(',');
        itemsToAdd.forEach(item => {
          if (item.includes('.')) {
            filesToCreate.push(item);
          } else {
            dirsToCreate.push(item);
          }
        });
      }
      
      // 创建目录
      dirsToCreate.forEach(dir => {
        const dirPath = path.join(projectPath, dir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
          console.log(`已创建目录: ${dir}`);
        }
      });
      
      // 创建文件
      filesToCreate.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          if (file === 'Readme.md') {
            fs.writeFileSync(filePath, `# ${name}\n\n项目描述写在这里。`);
          } else if (file === '.gitignore') {
            fs.writeFileSync(filePath, 'node_modules/\n.env\n.DS_Store\n');
          } else {
            fs.writeFileSync(filePath, '');
          }
          console.log(`已创建文件: ${file}`);
        }
      });
      
      // 创建项目JSON文件
      const projectJson = {
        projectName: name,
        creationDate: new Date().toISOString().split('T')[0],
        lastUpdateDate: new Date().toISOString().split('T')[0],
        changelog: [
          {
            version: "1.0.0",
            updateDate: new Date().toISOString().split('T')[0],
            info: "初始版本，包含核心功能"
          }
        ]
      };
      
      const jsonPath = path.join(projectPath, `${name}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(projectJson, null, 2));
      console.log(`已创建项目文件: ${name}.json`);
      
      console.log(`项目 "${name}" 已成功创建于 ${projectPath}`);
    } catch (error) {
      console.error('创建项目时出错:', error.message);
    }
  });
/**end 创建项目命令**/

/**begin 查看项目信息命令**/
/**
 * 查看项目信息的命令实现
 * @module 查看项目信息命令
 */
program
  .command('view-project')
  .description('查看项目JSON文件内容')
  .option('-p, --path <path>', '指定项目JSON文件路径')  // 修改为 -p, --path
  .option('-f, --full', '显示完整的项目信息')
  .option('-c, --changelog', '只显示更新日志')
  .option('-m, --summary', '只显示项目摘要')  // 修改为 -m, --summary
  .action((options) => {
    try {
      let jsonPath;
      
      // 如果指定了路径，使用指定路径
      if (options.path) {  // 修改为 options.path
        jsonPath = path.resolve(options.path);
      } else {
        // 否则在当前目录查找项目JSON文件
        const files = fs.readdirSync(process.cwd());
        const jsonFiles = files.filter(f => 
          f.endsWith('.json') && 
          f !== 'package.json' && 
          !f.includes('config')
        );
        
        if (jsonFiles.length === 0) {
          console.error('错误: 当前目录中未找到项目JSON文件');
          console.log('提示: 使用 -p 参数指定项目JSON文件路径');
          process.exit(1);
        }
        
        if (jsonFiles.length > 1) {
          console.log('找到多个JSON文件:');
          jsonFiles.forEach((file, index) => {
            console.log(`  ${index + 1}. ${file}`);
          });
          console.log('请使用 -p 参数指定要查看的文件');
          process.exit(1);
        }
        
        jsonPath = path.resolve(process.cwd(), jsonFiles[0]);
      }
      
      // 检查文件是否存在
      if (!fs.existsSync(jsonPath)) {
        console.error(`错误: 文件不存在: ${jsonPath}`);
        process.exit(1);
      }
      
      // 读取并解析JSON文件
      const projectData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      
      // 根据选项显示不同的信息
      if (options.changelog) {
        displayChangelog(projectData);
      } else if (options.summary) {
        displaySummary(projectData, jsonPath);
      } else {
        displayFullProjectInfo(projectData, jsonPath, options.full);
      }
      
    } catch (error) {
      console.error('查看项目信息时出错:', error.message);
      process.exit(1);
    }
  });
/**end 查看项目信息命令**/

/**begin 项目信息显示函数**/
/**
 * 显示完整的项目信息
 * @param {Object} projectData 项目数据
 * @param {string} filePath 文件路径
 * @param {boolean} showFull 是否显示完整信息
 */
function displayFullProjectInfo(projectData, filePath, showFull = false) {
  console.log('📁 项目信息');
  console.log('==========');
  console.log(`文件路径: ${filePath}`);
  console.log(`项目名称: ${projectData.projectName || '未命名'}`);
  console.log(`创建日期: ${projectData.creationDate || '未知'}`);
  console.log(`最后更新: ${projectData.lastUpdateDate || '未知'}`);
  
  // 计算项目年龄（如果可能）
  if (projectData.creationDate) {
    const createDate = new Date(projectData.creationDate);
    const today = new Date();
    const diffTime = Math.abs(today - createDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log(`项目年龄: ${diffDays} 天`);
  }
  
  console.log(`\n📋 版本信息`);
  console.log('==========');
  if (projectData.changelog && projectData.changelog.length > 0) {
    const latestVersion = projectData.changelog[projectData.changelog.length - 1];
    console.log(`最新版本: ${latestVersion.version}`);
    console.log(`版本数量: ${projectData.changelog.length}`);
    
    if (showFull) {
      console.log('\n📖 完整更新日志:');
      projectData.changelog.forEach((log, index) => {
        console.log(`\n版本 ${log.version} (${log.updateDate})`);
        console.log(`  ${log.info}`);
      });
    } else {
      // 只显示最近3个版本
      console.log('\n🕒 最近更新:');
      const recentLogs = projectData.changelog.slice(-3);
      recentLogs.forEach(log => {
        console.log(`  ${log.version} (${log.updateDate}): ${log.info}`);
      });
      
      if (projectData.changelog.length > 3) {
        console.log(`  ... 还有 ${projectData.changelog.length - 3} 个更早的版本`);
      }
    }
  } else {
    console.log('暂无版本信息');
  }
  
  // 显示其他自定义字段
  const customFields = Object.keys(projectData).filter(key => 
    !['projectName', 'creationDate', 'lastUpdateDate', 'changelog'].includes(key)
  );
  
  if (customFields.length > 0) {
    console.log('\n🔧 自定义字段:');
    customFields.forEach(field => {
      console.log(`  ${field}: ${JSON.stringify(projectData[field])}`);
    });
  }
}

/**
 * 只显示更新日志
 * @param {Object} projectData 项目数据
 */
function displayChangelog(projectData) {
  console.log('📖 项目更新日志');
  console.log('==============');
  
  if (projectData.changelog && projectData.changelog.length > 0) {
    projectData.changelog.forEach((log, index) => {
      console.log(`\n${index + 1}. 版本 ${log.version} (${log.updateDate})`);
      console.log(`   更新内容: ${log.info}`);
    });
    
    console.log(`\n总计: ${projectData.changelog.length} 个版本`);
  } else {
    console.log('暂无更新日志');
  }
}

/**
 * 显示项目摘要
 * @param {Object} projectData 项目数据
 * @param {string} filePath 文件路径
 */
function displaySummary(projectData, filePath) {
  const projectName = projectData.projectName || path.basename(filePath, '.json');
  const versionCount = projectData.changelog ? projectData.changelog.length : 0;
  const latestVersion = projectData.changelog && projectData.changelog.length > 0 
    ? projectData.changelog[projectData.changelog.length - 1].version 
    : '无版本信息';
  
  console.log('🚀 项目摘要');
  console.log('==========');
  console.log(`项目: ${projectName}`);
  console.log(`版本: ${latestVersion}`);
  console.log(`创建: ${projectData.creationDate || '未知'}`);
  console.log(`更新: ${projectData.lastUpdateDate || '未知'}`);
  console.log(`版本数量: ${versionCount}`);
  
  // 简单的项目状态指示器
  if (projectData.lastUpdateDate) {
    const lastUpdate = new Date(projectData.lastUpdateDate);
    const today = new Date();
    const diffDays = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24));
    
    let status = '🟢 活跃';
    if (diffDays > 30) status = '🟡 一般';
    if (diffDays > 90) status = '🔴 停滞';
    
    console.log(`项目状态: ${status} (${diffDays} 天前更新)`);
  }
}
/**end 项目信息显示函数**/

/**begin 更新项目命令**/
/**
 * 更新项目并提交更改的命令实现
 * @module 更新项目命令
 */
program
  .command('update')
  .description('更新项目并提交更改')
  .option('-m, --message <message>', '提交信息')
  .option('-v, --version <version>', '版本号')
  .option('-p, --push', '是否推送到远程仓库', false)
  .action((options) => {
    try {
      // 查找项目JSON文件
      const files = fs.readdirSync(process.cwd());
      const jsonFile = files.find(f => f.endsWith('.json') && f !== 'package.json');
      
      if (!jsonFile) {
        console.error('当前目录中未找到项目JSON文件');
        return;
      }
      
      const projectData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
      
      // 更新项目数据
      projectData.lastUpdateDate = new Date().toISOString().split('T')[0];
      
      if (options.version) {
        projectData.changelog.push({
          version: options.version,
          updateDate: new Date().toISOString().split('T')[0],
          info: options.message || "更新"
        });
      }
      
      // 写入更新后的项目数据
      fs.writeFileSync(jsonFile, JSON.stringify(projectData, null, 2));
      
      // 执行Git命令
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "${options.message || '更新'}"`, { stdio: 'inherit' });
      
      console.log('项目已成功更新并提交');
      
      if(options.push) {
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('项目已成功提交github');
      }
    } catch (error) {
      console.error('更新项目时出错:', error.message);
    }
  });
/**end 更新项目命令**/

/**begin Git初始化命令**/
/**
 * 初始化git仓库并设置远程仓库的命令实现
 * @module Git初始化命令
 */
program
  .command('git-init')
  .description('初始化git仓库并设置远程仓库')
  .option('-u, --url <url>', '远程仓库URL')
  .action((options) => {
    try {
      execSync('git init', { stdio: 'inherit' });
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "首次提交"', { stdio: 'inherit' });
      
      if (options.url) {
        execSync('git branch -M main', { stdio: 'inherit' });
        execSync(`git remote add origin ${options.url}`, { stdio: 'inherit' });
        execSync('git push -u origin main', { stdio: 'inherit' });
        console.log(`Git仓库已初始化并推送至 ${options.url}`);
      } else {
        console.log('Git仓库已在本地初始化');
      }
    } catch (error) {
      console.error('初始化Git仓库时出错:', error.message);
    }
  });
/**end Git初始化命令**/

/**begin 文件转换命令**/
/**
 * 文件格式转换命令实现
 * @module 文件转换命令
 */
program
  .command('transform <sourcefile>')
  .description('转换文件格式')
  .requiredOption('-t, --type <type>', '目标格式')
  .option('-o, --output <outputpath>', '输出路径')
  .action(async (sourcefile, options) => {
    try {
      await transformFile(sourcefile, options.type, options.output);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });
/**end 文件转换命令**/

/**begin 查看支持的转换格式命令**/
/**
 * 查看支持的转换格式命令实现
 * @module 查看支持的转换格式命令
 */
program
  .command('transform-formats')
  .description('查看支持的转换格式')
  .action(() => {
    const supportedConversions = getSupportedConversions();
    console.log('支持的转换格式:');
    
    Object.entries(supportedConversions).forEach(([from, to]) => {
      console.log(`  ${from} -> ${to.join(', ')}`);
    });
  });
/**end 查看支持的转换格式命令**/

/**begin 文件比较命令**/
/**
 * 文件比较命令实现
 * @module 文件比较命令
 */
program
  .command('compare <file1> <file2>')
  .description('比较两个文件的内容')
  .option('-m, --mode <mode>', '比较模式 (content, binary, size)', 'content')
  .action((file1, file2, options) => {
    // 实现文件比较
    console.log(`比较 ${file1} 和 ${file2}`);
  });
/**end 文件比较命令**/

/**begin 密码生成命令**/
/**
 * 密码生成命令实现
 * @module 密码生成命令
 */
program
  .command('generate-password')
  .description('生成随机密码')
  .option('-l, --length <length>', '密码长度', '16')
  .option('-c, --complexity <complexity>', '复杂度 (low, medium, high)', 'medium')
  .action((options) => {
    // 实现密码生成功能
    console.log('生成随机密码');
  });
/**end 密码生成命令**/

/**begin 加密解密命令**/
/**
 * 加密解密命令实现
 * @module 加密解密命令
 */
program
  .command('cryption')
  .description('加密或解密数据')
  .option('-e, --encrypt', '加密模式')
  .option('-d, --decrypt', '解密模式')
  .option('-t, --type <algorithm>', '加密/解密算法', 'aes-256-cbc')
  .option('-k, --key <key>', '加密密钥（十六进制字符串）')
  .option('-i, --iv <iv>', '初始化向量（十六进制字符串，某些算法需要）')
  .option('-f, --file', '处理文件而不是文本')
  .option('-o, --output <output>', '输出文件路径')
  .argument('[data]', '要加密/解密的文本或文件路径')
  .action(async (data, options) => {
    try {
      // 验证参数
      if (!options.encrypt && !options.decrypt) {
        console.error('错误: 必须指定加密(-e)或解密(-d)模式');
        process.exit(1);
      }
      
      if (options.encrypt && options.decrypt) {
        console.error('错误: 不能同时指定加密和解密模式');
        process.exit(1);
      }
      
      // 获取支持的算法列表
      const supportedAlgorithms = getSupportedAlgorithms();
      if (!supportedAlgorithms.includes(options.type)) {
        console.error(`错误: 不支持的算法 "${options.type}"`);
        console.error(`支持的算法: ${supportedAlgorithms.join(', ')}`);
        process.exit(1);
      }
      
      const operation = options.encrypt ? 'encrypt' : 'decrypt';
      
      // 处理文件
      if (options.file) {
        if (!data) {
          console.error('错误: 文件模式下必须提供输入文件路径');
          process.exit(1);
        }
        
        if (!options.output) {
          console.error('错误: 文件模式下必须指定输出文件路径(-o)');
          process.exit(1);
        }
        
        // 如果没有提供密钥，生成一个
        let key = options.key;
        let iv = options.iv;
        
        if (!key) {
          const keyData = generateKeyAndIV(options.type);
          key = keyData.key.toString('hex');
          iv = keyData.iv ? keyData.iv.toString('hex') : null;
          
          console.log(`生成的密钥: ${key}`);
          if (iv) console.log(`生成的IV: ${iv}`);
          console.log('请妥善保存这些值，解密时需要它们');
        }
        
        await processFile(data, options.output, operation, options.type, key, iv);
        console.log(`文件${operation === 'encrypt' ? '加密' : '解密'}成功: ${options.output}`);
      } 
      // 处理文本
      else {
        if (!data) {
          console.error('错误: 必须提供要加密/解密的文本');
          process.exit(1);
        }
        
        if (operation === 'encrypt') {
          // 如果没有提供密钥，生成一个
          let key = options.key;
          let iv = options.iv;
          
          if (!key) {
            const keyData = generateKeyAndIV(options.type);
            key = keyData.key.toString('hex');
            iv = keyData.iv ? keyData.iv.toString('hex') : null;
          }
          
          const result = encrypt(data, options.type, Buffer.from(key, 'hex'), iv ? Buffer.from(iv, 'hex') : null);
          
          console.log(`加密结果: ${result.encryptedData}`);
          console.log(`使用的密钥: ${result.key}`);
          if (result.iv) console.log(`使用的IV: ${result.iv}`);
          console.log(`算法: ${result.algorithm}`);
        } else {
          // 解密模式
          if (!options.key) {
            console.error('错误: 解密模式必须提供密钥(-k)');
            process.exit(1);
          }
          
          const decrypted = decrypt(data, options.type, options.key, options.iv);
          console.log(`解密结果: ${decrypted}`);
        }
      }
    } catch (error) {
      console.error(`加密/解密过程中出错: ${error.message}`);
      process.exit(1);
    }
  });
/**end 加密解密命令**/

/**begin 查看支持的加密算法命令**/
/**
 * 查看支持的加密算法命令实现
 * @module 查看支持的加密算法命令
 */
program
  .command('cryption-algorithms')
  .description('查看支持的加密算法')
  .action(() => {
    const algorithms = getSupportedAlgorithms();
    console.log('支持的加密算法:');
    algorithms.forEach(algorithm => {
      console.log(`  - ${algorithm}`);
    });
  });
/**end 查看支持的加密算法命令**/

/**begin ZIP命令**/
/**
 * ZIP压缩操作命令实现
 * @module ZIP命令
 */
program
  .command('zip')
  .description('ZIP 压缩操作')
  .option('-a, --all', '压缩当前目录所有内容')
  .option('-n, --name <name>', '指定压缩文件名')
  .option('-f, --folders', '压缩当前目录所有文件夹')
  .option('-r, --files', '压缩当前目录所有文件')
  .option('-s, --src <src>', '源文件路径（用于格式转换）')
  .option('-t, --target <format>', '目标格式（用于格式转换）')
  .option('-w, --work <src>', '压缩指定文件/文件夹')
  .option('-o, --output <path>', '输出路径')
  .option('-d, --delete', '压缩后删除源文件')
  .action((options) => {
    try {
      if (options.all) {
        CompressionTool.compressAll('zip', options.name, options.delete);
      } else if (options.folders) {
        CompressionTool.compressFolders('zip', options.delete);
      } else if (options.files) {
        CompressionTool.compressFiles('zip', options.delete);
      } else if (options.src && options.target) {
        CompressionTool.convertFormat(options.src, 'zip', options.target, options.delete);
      } else if (options.work) {
        CompressionTool.compressSpecific(options.work, 'zip', options.output, options.delete);
      } else {
        console.log('请指定压缩模式，使用 -h 查看帮助');
      }
    } catch (error) {
      console.error('操作失败:', error.message);
      process.exit(1);
    }
  });
/**end ZIP命令**/

/**begin 7z命令**/
/**
 * 7z压缩操作命令实现
 * @module 7z命令
 */
program
  .command('7z')
  .description('7z 压缩操作')
  .option('-a, --all', '压缩当前目录所有内容')
  .option('-n, --name <name>', '指定压缩文件名')
  .option('-f, --folders', '压缩当前目录所有文件夹')
  .option('-r, --files', '压缩当前目录所有文件')
  .option('-s, --src <src>', '源文件路径（用于格式转换）')
  .option('-t, --target <format>', '目标格式（用于格式转换）')
  .option('-w, --work <src>', '压缩指定文件/文件夹')
  .option('-o, --output <path>', '输出路径')
  .option('-d, --delete', '压缩后删除源文件')
  .action((options) => {
    try {
      if (options.all) {
        CompressionTool.compressAll('7z', options.name, options.delete);
      } else if (options.folders) {
        CompressionTool.compressFolders('7z', options.delete);
      } else if (options.files) {
        CompressionTool.compressFiles('7z', options.delete);
      } else if (options.src && options.target) {
        CompressionTool.convertFormat(options.src, '7z', options.target, options.delete);
      } else if (options.work) {
        CompressionTool.compressSpecific(options.work, '7z', options.output, options.delete);
      } else {
        console.log('请指定压缩模式，使用 -h 查看帮助');
      }
    } catch (error) {
      console.error('操作失败:', error.message);
      process.exit(1);
    }
  });
/**end 7z命令**/

/**begin RAR命令**/
/**
 * RAR压缩操作命令实现
 * @module RAR命令
 */
program
  .command('rar')
  .description('RAR 压缩操作')
  .option('-a, --all', '压缩当前目录所有内容')
  .option('-n, --name <name>', '指定压缩文件名')
  .option('-f, --folders', '压缩当前目录所有文件夹')
  .option('-r, --files', '压缩当前目录所有文件')
  .option('-s, --src <src>', '源文件路径（用于格式转换）')
  .option('-t, --target <format>', '目标格式（用于格式转换）')
  .option('-w, --work <src>', '压缩指定文件/文件夹')
  .option('-o, --output <path>', '输出路径')
  .option('-d, --delete', '压缩后删除源文件')
  .action((options) => {
    try {
      if (options.all) {
        CompressionTool.compressAll('rar', options.name, options.delete);
      } else if (options.folders) {
        CompressionTool.compressFolders('rar', options.delete);
      } else if (options.files) {
        CompressionTool.compressFiles('rar', options.delete);
      } else if (options.src && options.target) {
        CompressionTool.convertFormat(options.src, 'rar', options.target, options.delete);
      } else if (options.work) {
        CompressionTool.compressSpecific(options.work, 'rar', options.output, options.delete);
      } else {
        console.log('请指定压缩模式，使用 -h 查看帮助');
      }
    } catch (error) {
      console.error('操作失败:', error.message);
      process.exit(1);
    }
  });
/**end RAR命令**/

/**begin 加密压缩命令**/
/**
 * 加密压缩命令实现
 * @module 加密压缩命令
 */
program
  .command('ezip <src>')
  .description('压缩并加密文件')
  .option('-o, --output <path>', '输出路径')
  .action(async (src, options) => {
    try {
      // 处理输出路径
      let outputPath = options.output || process.cwd();
      const srcName = path.basename(src, path.extname(src));
      
      // 如果输出路径是目录，则添加文件名
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        outputPath = path.join(outputPath, `${srcName}.ezip`);
      }

      console.log('正在加密压缩...');
      await Encrypted.encryptAndCompress(src, outputPath);
      console.log(`文件已加密压缩到: ${outputPath}`);
    } catch (error) {
      console.error('操作失败:', error.message);
      process.exit(1);
    }
  });
/**end 加密压缩命令**/

/**begin 解密解压命令**/
/**
 * 解密解压命令实现
 * @module 解密解压命令
 */
program
  .command('dezip <src>')
  .description('解密并解压文件')
  .option('-o, --output <path>', '输出路径')
  .action(async (src, options) => {
    try {
      // 处理输出路径
      let outputPath = options.output || process.cwd();
      const srcName = path.basename(src, '.ezip');
      
      // 如果输出路径是目录，则添加文件名（去掉.ezip后缀）
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
        outputPath = path.join(outputPath, srcName);
      }

      console.log('正在解密解压...');
      await Encrypted.decryptAndDecompress(src, outputPath);
      console.log(`文件已解密到: ${outputPath}`);
    } catch (error) {
      console.error('操作失败:', error.message);
      process.exit(1);
    }
  });
/**end 解密解压命令**/

/**begin 二维码条形码命令**/
/**
 * 二维码和条形码生成命令实现
 * @module 二维码条形码命令
 */
program
  .command('qrcode')
  .description('Generate QR code or barcode')
  .option('-t, --qrcode', 'Generate QR code')
  .option('-s, --barcode', 'Generate barcode')
  .option('-m, --message <message>', 'Text message to encode')
  .option('-u, --url <url>', 'URL to encode')
  .option('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      // 验证参数
      if (!options.qrcode && !options.barcode) {
        console.error('Error: Please specify either -t for QR code or -s for barcode');
        process.exit(1);
      }

      if (!options.message && !options.url) {
        console.error('Error: Please provide either a message with -m or a URL with -u');
        process.exit(1);
      }

      if (!options.output) {
        console.error('Error: Please specify an output path with -o');
        process.exit(1);
      }

      const content = options.message || options.url;

      if (options.qrcode) {
        await generateQRCode(content, options.output);
        console.log(`QR code generated successfully at ${options.output}`);
      } else if (options.barcode) {
        await generateBarcode(content, options.output);
        console.log(`Barcode generated successfully at ${options.output}`);
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
/**end 二维码条形码命令**/

/**begin 自启动命令**/
/**
 * 自启动设置命令实现
 * @module 自启动命令
 */
program
  .command('autostart')
  .description('Set up autostart for Windows')
  .option('-l, --link <path>', 'Set autostart using a link file')
  .option('-r, --exe <path>', 'Set autostart using an exe file (creates link first)')
  .action((options) => {
    if (options.link) {
      setAutostartLink(options.link);
    } else if (options.exe) {
      setAutostartExe(options.exe);
    } else {
      console.log('Please specify either -l for link file or -r for exe file');
    }
  });
/**end 自启动命令**/

/**begin 关机命令**/
/**
 * 关机管理命令实现
 * @module 关机命令
 */
program
  .command('shutdown')
  .description('Shutdown management commands')
  .option('-n, --now', 'Shutdown immediately')
  .option('-t, --timer <minutes>', 'Shutdown after specified minutes', parseInt)
  .option('-c, --cancel', 'Cancel scheduled shutdown')
  .action((options) => {
    if (options.now) {
      shutdownNow();
    } else if (options.timer) {
      scheduleShutdown(options.timer);
    } else if (options.cancel) {
      cancelShutdown();
    } else {
      console.log('Please specify a shutdown option: -n/--now, -t/--timer, or -c/--cancel');
    }
  });

/**
 * 立即关机函数
 * @function shutdownNow
 */
function shutdownNow() {
  console.log('Shutting down now...');
  exec('shutdown /s /f /t 0', (error) => {
    if (error) {
      console.error(`Error executing shutdown: ${error}`);
    }
  });
}

/**
 * 定时关机函数
 * @function scheduleShutdown
 * @param {number} minutes 关机延迟分钟数
 */
function scheduleShutdown(minutes) {
  const seconds = minutes * 60;
  console.log(`Scheduling shutdown in ${minutes} minutes...`);
  exec(`shutdown /s /f /t ${seconds}`, (error) => {
    if (error) {
      console.error(`Error scheduling shutdown: ${error}`);
    } else {
      console.log(`Shutdown scheduled in ${minutes} minutes. Use 'eternocli shutdown --cancel' to cancel.`);
    }
  });
}

/**
 * 取消关机函数
 * @function cancelShutdown
 */
function cancelShutdown() {
  console.log('Cancelling scheduled shutdown...');
  exec('shutdown /a', (error) => {
    if (error) {
      console.error(`Error cancelling shutdown: ${error}`);
    } else {
      console.log('Scheduled shutdown cancelled.');
    }
  });
}
/**end 关机命令**/

/**begin 媒体文件信息命令**/
/**
 * 媒体文件信息显示命令实现
 * @module 媒体文件信息命令
 */
program
  .command('vmdetail')
  .description('显示媒体文件详细信息')
  .option('-v, --video <path>', '视频文件路径')
  .option('-m, --audio <path>', '音频文件路径')
  .action((options) => {
    const path = options.video || options.audio;
    if (!path) {
      console.error('错误：请提供音频或视频文件路径');
      process.exit(1);
    }
    
    getMediaDetails(path)
      .then(details => {
        console.log('媒体文件详细信息:');
        console.log('=================');
        console.log(`文件路径: ${details.path}`);
        console.log(`格式: ${details.format}`);
        console.log(`时长: ${formatDuration(details.duration)}`);
        console.log(`大小:  ${formatSize(details.size)}`);
        
        if (details.video) {
          console.log('\n视频信息:');
          console.log(`  编码: ${details.video.codec}`);
          console.log(`  分辨率: ${details.video.resolution}`);
          console.log(`  帧率: ${details.video.fps} fps`);
          console.log(`  比特率: ${details.video.bitrate} kbps`);
        }
        
        if (details.audio) {
          console.log('\n音频信息:');
          console.log(`  编码: ${details.audio.codec}`);
          console.log(`  采样率: ${details.audio.sampleRate} Hz`);
          console.log(`  声道: ${details.audio.channels}`);
          console.log(`  比特率: ${details.audio.bitrate} kbps`);
        }
      })
      .catch(error => {
        console.error('获取媒体信息时出错:', error.message);
        process.exit(1);
      });
  });
/**end 媒体文件信息命令**/

/**begin 工具函数**/
/**
 * 工具函数集合
 * @module 工具函数
 */

/**
 * 格式化时长为 HH:MM:SS 格式
 * @param {number} seconds 总秒数
 * @returns {string} 格式化后的时长字符串
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

/**
 * 格式化文件大小为最佳单位
 * @param {number} bytes 文件大小（字节）
 * @returns {string} 格式化后的文件大小字符串
 */
function formatSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  
  // 计算应该使用哪个单位
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exponent);
  
  // 格式化数值，保留2位小数
  return `${value.toFixed(2)} ${units[exponent]}`;
}
/**end 工具函数**/

/**begin 图片重命名**/
program
  .command('rename')
  .description('批量重命名图片文件，按自然顺序从指定起始编号开始')
  .requiredOption('-s, --src <dir>', '图片所在目录')
  .requiredOption('-n, --num <number>', '起始编号')
  .option('-f, --force', '跳过确认提示，直接执行', false)
  .option('-w, --width <number>', '固定位数（如3则生成001.jpg），不指定则自动计算')
  .option('--dry-run', '只预览不执行', false)
  .action((options) => {
    renameImages(options.src, options.num, options.force, {
      autoWidth: !options.width, // 如果指定了width则不用自动计算
      fixedWidth: options.width ? parseInt(options.width) : 3,
      dryRun: options.dryRun
    });
  });

// 新增命令：补充数字文件名位数
program
  .command('pad-numbers')
  .description('将数字文件名补充位数，例如1.jpg改为001.jpg')
  .requiredOption('-s, --src <dir>', '图片所在目录')
  .option('-w, --width <number>', '位数宽度，默认3', '3')
  .action((options) => {
    padNumberFilenames(options.src, parseInt(options.width));
  });
/**end  图片重命名**/

/**begin 程序入口**/
/**
 * 程序入口点
 * @module 程序入口
 */
// 解析命令行参数
program.parse(process.argv);
/**end 程序入口**/