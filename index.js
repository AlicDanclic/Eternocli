#!/usr/bin/env node

/**begin 导入模块**/
/**
 * 导入所需的核心模块和第三方模块
 * @module 导入模块
 */
const { program } = require('commander');
const fs = require('fs');
const fs_e = require('fs-extra');
const path = require('path');
const { execSync, spawn } = require('child_process');
const crypto = require('crypto');
const { compileFlowmaid } = require('./Src/flowmaid');
const { renameImages, padNumberFilenames } = require('./Src/renameUtils');
const { setAutostartLink, setAutostartExe } = require('./src/autostart');
const { exec } = require('child_process');
const { getMediaDetails } = require('./Src/vmdetail');
const { generateQRCode, generateBarcode } = require('./Src/qr');
const Encrypted = require('./Src/Encrypted');
const { transformFile, getSupportedConversions } = require('./Src/transform');
// 在顶部添加加密/解密模块导入
const { 
  generateKeyAndIV, 
  encrypt, 
  decrypt, 
  processFile, 
  getSupportedAlgorithms 
} = require('./Src/code');
/**end 导入模块**/

/**begin 默认配置**/
/**
 * 默认项目结构和文件配置
 * @module 默认配置
 */
const defaultDirs = ['位图', '硬件', '软件', '参考资料', '数据手册'];
const defaultFiles = ['说明文档.md', '.gitignore'];
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
  .command('create <项目名称>')
  .description('创建新项目结构')
  .option('-d, --dir <路径>', '指定项目目录', '.')
  .option('-a, --add <项目>', '添加额外的目录/文件', '')
  .option('-r, --remove <项目>', '移除默认目录/文件', '')
  .action((项目名称, options) => {
    try {
      // 确定项目路径
      const projectPath = path.resolve(options.dir, 项目名称);
      
      // 创建项目目录
      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true });
      }
      
      // 处理要添加/移除的目录
      const dirsToCreate = [...defaultDirs];
      const filesToCreate = [...defaultFiles];
      
      // 如果指定了移除项目
      if (options.remove) {
        const itemsToRemove = options.remove.split(',');
        itemsToRemove.forEach(item => {
          const dirIndex = dirsToCreate.indexOf(item);
          if (dirIndex !== -1) dirsToCreate.splice(dirIndex, 1);
          
          const fileIndex = filesToCreate.indexOf(item);
          if (fileIndex !== -1) filesToCreate.splice(fileIndex, 1);
        });
      }
      
      // 如果指定了添加项目
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
          console.log(`目录已创建: ${dir}`);
        }
      });
      
      // 创建文件
      filesToCreate.forEach(file => {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          if (file === '说明文档.md') {
            fs.writeFileSync(filePath, `# ${项目名称}\n\n项目描述写在这里。`);
          } else if (file === '.gitignore') {
            fs.writeFileSync(filePath, 'node_modules/\n.env\n.DS_Store\n');
          } else {
            fs.writeFileSync(filePath, '');
          }
          console.log(`文件已创建: ${file}`);
        }
      });
      
      // 创建项目JSON文件
      const projectJson = {
        projectName: 项目名称,
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
      
      const jsonPath = path.join(projectPath, `${项目名称}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(projectJson, null, 2));
      console.log(`项目文件已创建: ${项目名称}.json`);
      
      console.log(`项目 "${项目名称}" 已成功创建于 ${projectPath}`);
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
  .option('-p, --path <路径>', '指定项目JSON文件路径')
  .option('-f, --full', '显示完整项目信息')
  .option('-c, --changelog', '仅显示更新日志')
  .option('-m, --summary', '仅显示项目摘要')
  .action((options) => {
    try {
      let jsonPath;
      
      // 如果提供了指定路径，则使用该路径
      if (options.path) {
        jsonPath = path.resolve(options.path);
      } else {
        // 否则在当前目录搜索项目JSON文件
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
 * 显示完整项目信息
 * @param {Object} projectData 项目数据
 * @param {string} filePath 文件路径
 * @param {boolean} showFull 是否显示完整信息
 */
function displayFullProjectInfo(projectData, filePath, showFull = false) {
  console.log('📁 项目信息');
  console.log('=====================');
  console.log(`文件路径: ${filePath}`);
  console.log(`项目名称: ${projectData.projectName || '未命名'}`);
  console.log(`创建日期: ${projectData.creationDate || '未知'}`);
  console.log(`最后更新: ${projectData.lastUpdateDate || '未知'}`);
  
  // 计算项目存在时间（如果可能）
  if (projectData.creationDate) {
    const createDate = new Date(projectData.creationDate);
    const today = new Date();
    const diffTime = Math.abs(today - createDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    console.log(`项目存在时间: ${diffDays} 天`);
  }
  
  console.log(`\n📋 版本信息`);
  console.log('=====================');
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
      // 仅显示最近3个版本
      console.log('\n🕒 最近更新:');
      const recentLogs = projectData.changelog.slice(-3);
      recentLogs.forEach(log => {
        console.log(`  ${log.version} (${log.updateDate}): ${log.info}`);
      });
      
      if (projectData.changelog.length > 3) {
        console.log(`  ... ${projectData.changelog.length - 3} 个更早版本`);
      }
    }
  } else {
    console.log('无版本信息可用');
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
 * 仅显示更新日志
 * @param {Object} projectData 项目数据
 */
function displayChangelog(projectData) {
  console.log('📖 项目更新日志');
  console.log('====================');
  
  if (projectData.changelog && projectData.changelog.length > 0) {
    projectData.changelog.forEach((log, index) => {
      console.log(`\n${index + 1}. 版本 ${log.version} (${log.updateDate})`);
      console.log(`   更新信息: ${log.info}`);
    });
    
    console.log(`\n总计: ${projectData.changelog.length} 个版本`);
  } else {
    console.log('无更新日志可用');
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
  console.log('==================');
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
    if (diffDays > 30) status = '🟡 正常';
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
  .option('-m, --message <消息>', '提交消息')
  .option('-v, --version <版本号>', '版本号')
  .option('-p, --push', '推送到远程仓库', false)
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
      
      // 写入更新的项目数据
      fs.writeFileSync(jsonFile, JSON.stringify(projectData, null, 2));
      
      // 执行Git命令
      execSync('git add .', { stdio: 'inherit' });
      execSync(`git commit -m "${options.message || '更新'}"`, { stdio: 'inherit' });
      
      console.log('项目已成功更新并提交');
      
      if(options.push) {
        execSync('git push origin main', { stdio: 'inherit' });
        console.log('项目已成功推送到GitHub');
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
  .option('-u, --url <链接>', '远程仓库URL')
  .action((options) => {
    try {
      execSync('git init', { stdio: 'inherit' });
      execSync('git add .', { stdio: 'inherit' });
      execSync('git commit -m "初始提交"', { stdio: 'inherit' });
      
      if (options.url) {
        execSync('git branch -M main', { stdio: 'inherit' });
        execSync(`git remote add origin ${options.url}`, { stdio: 'inherit' });
        execSync('git push -u origin main', { stdio: 'inherit' });
        console.log(`Git仓库已初始化并推送到 ${options.url}`);
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
  .command('transform <源文件>')
  .description('转换文件格式')
  .requiredOption('-t, --type <类型>', '目标格式')
  .option('-o, --output <输出路径>', '输出路径')
  .action(async (源文件, options) => {
    try {
      await transformFile(源文件, options.type, options.output);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });
/**end 文件转换命令**/

/**begin 查看支持格式命令**/
/**
 * 查看支持转换格式的命令实现
 * @module 查看支持格式命令
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
/**end 查看支持格式命令**/

/**begin 密码生成命令**/
/**
 * 密码生成命令实现
 * @module 密码生成命令
 */
program
  .command('generate-password')
  .description('生成随机密码')
  .option('-l, --length <长度>', '密码长度', '16')
  .option('-c, --complexity <复杂度>', '复杂度 (低, 中, 高)', '中')
  .action((options) => {
    try {
      const length = parseInt(options.length);
      
      // 验证长度参数
      if (isNaN(length) || length < 1) {
        console.error('错误: 密码长度必须是正整数');
        return;
      }

      // 定义字符集
      const charSets = {
        低: 'abcdefghijklmnopqrstuvwxyz0123456789',
        中: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        高: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
      };

      // 获取指定复杂度的字符集
      const charset = charSets[options.complexity];
      if (!charset) {
        console.error('错误: 复杂度必须是 低、中 或 高');
        return;
      }

      // 生成密码
      let password = '';
      const randomBytes = crypto.randomBytes(length);
      
      for (let i = 0; i < length; i++) {
        const randomIndex = randomBytes[i] % charset.length;
        password += charset[randomIndex];
      }

      console.log(`生成的密码: ${password}`);
      
    } catch (error) {
      console.error('生成密码时出错:', error.message);
    }
  });
/**end 密码生成命令**/

/**begin 加密/解密命令**/
/**
 * 加密/解密命令实现
 * @module 加密/解密命令
 */
program
  .command('cryption')
  .description('加密或解密数据')
  .option('-e, --encrypt', '加密模式')
  .option('-d, --decrypt', '解密模式')
  .option('-t, --type <算法>', '加密/解密算法', 'aes-256-cbc')
  .option('-k, --key <密钥>', '加密密钥(十六进制字符串)')
  .option('-i, --iv <初始向量>', '初始化向量(十六进制字符串，某些算法需要)')
  .option('-f, --file', '处理文件而不是文本')
  .option('-o, --output <输出>', '输出文件路径')
  .option('-s, --save-keys <密钥文件>', '将生成的密钥保存到文件(仅加密)')
  .argument('[数据]', '要加密/解密的文本或文件路径')
  .action(async (数据, options) => {
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
        if (!数据) {
          console.error('错误: 文件模式下必须提供输入文件路径');
          process.exit(1);
        }
        
        if (!options.output) {
          console.error('错误: 文件模式下必须指定输出文件路径(-o)');
          process.exit(1);
        }
        
        // 如果未提供密钥则生成密钥
        let key = options.key;
        let iv = options.iv;
        
        if (!key) {
          const keyData = generateKeyAndIV(options.type);
          key = keyData.key.toString('hex');
          iv = keyData.iv ? keyData.iv.toString('hex') : null;
          
          console.log(`生成的密钥: ${key}`);
          if (iv) console.log(`生成的IV: ${iv}`);
          
          // 如果请求，将密钥保存到文件
          if (options.saveKeys && operation === 'encrypt') {
            await saveKeysToFile(options.saveKeys, key, iv, options.type, 数据, options.output);
            console.log(`密钥已保存至: ${options.saveKeys}`);
          }
          
          console.log('请安全保存这些值，解密时需要它们');
        }
        
        await processFile(数据, options.output, operation, options.type, key, iv);
        console.log(`文件${operation === 'encrypt' ? '加密' : '解密'}成功: ${options.output}`);
      } 
      // 处理文本
      else {
        if (!数据) {
          console.error('错误: 必须提供要加密/解密的文本');
          process.exit(1);
        }
        
        if (operation === 'encrypt') {
          // 如果未提供密钥则生成密钥
          let key = options.key;
          let iv = options.iv;
          
          if (!key) {
            const keyData = generateKeyAndIV(options.type);
            key = keyData.key.toString('hex');
            iv = keyData.iv ? keyData.iv.toString('hex') : null;
            
            // 如果请求，将密钥保存到文件
            if (options.saveKeys) {
              await saveKeysToFile(options.saveKeys, key, iv, options.type, 数据);
              console.log(`密钥已保存至: ${options.saveKeys}`);
            }
          }
          
          const result = encrypt(数据, options.type, Buffer.from(key, 'hex'), iv ? Buffer.from(iv, 'hex') : null);
          
          console.log(`加密结果: ${result.encryptedData}`);
          console.log(`使用的密钥: ${result.key}`);
          if (result.iv) console.log(`使用的IV: ${result.iv}`);
          console.log(`算法: ${result.algorithm}`);
        } else {
          // 解密模式
          if (!options.key) {
            console.error('错误: 解密模式下必须提供密钥(-k)');
            process.exit(1);
          }
          
          const decrypted = decrypt(数据, options.type, options.key, options.iv);
          console.log(`解密结果: ${decrypted}`);
        }
      }
    } catch (error) {
      console.error(`加密/解密过程中出错: ${error.message}`);
      process.exit(1);
    }
  });

// 添加保存密钥到文件的函数
async function saveKeysToFile(文件名, 密钥, 初始向量, 算法, 输入文件 = null, 输出文件 = null) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const keyData = {
    key: 密钥,
    iv: 初始向量,
    algorithm: 算法,
    timestamp: new Date().toISOString(),
    inputFile: 输入文件,
    outputFile: 输出文件
  };
  
  // 确保目录存在
  const dir = path.dirname(文件名);
  try {
    await fs.access(dir);
  } catch (error) {
    // 目录不存在，创建它
    await fs.mkdir(dir, { recursive: true });
  }
  
  // 保存为JSON文件
  await fs.writeFile(文件名, JSON.stringify(keyData, null, 2));
  
  // 同时保存一个人类可读的版本
  const txtFilename = 文件名.replace(/\.json$/, '') + '.txt';
  let txtContent = `加密密钥\n`;
  txtContent += `===============\n`;
  txtContent += `时间戳: ${keyData.timestamp}\n`;
  txtContent += `算法: ${keyData.algorithm}\n`;
  if (输入文件) txtContent += `输入文件: ${输入文件}\n`;
  if (输出文件) txtContent += `输出文件: ${输出文件}\n`;
  txtContent += `\n密钥: ${密钥}\n`;
  if (初始向量) txtContent += `初始向量: ${初始向量}\n`;
  txtContent += `\n重要: 请安全保存此文件! 这些密钥是解密所必需的。\n`;
  
  await fs.writeFile(txtFilename, txtContent);
}

// 添加从文件加载密钥的函数（用于解密）
async function loadKeysFromFile(文件名) {
  const fs = require('fs').promises;
  
  try {
    const data = await fs.readFile(文件名, 'utf8');
    const keyData = JSON.parse(data);
    
    return {
      key: keyData.key,
      iv: keyData.iv,
      algorithm: keyData.algorithm
    };
  } catch (error) {
    throw new Error(`从文件加载密钥失败: ${error.message}`);
  }
}
/**end 加密/解密命令**/

/**begin 查看支持算法命令**/
/**
 * 查看支持加密算法的命令实现
 * @module 查看支持算法命令
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
/**end 查看支持算法命令**/

/**begin 二维码/条形码命令**/
/**
 * 二维码和条形码生成命令实现
 * @module 二维码/条形码命令
 */
program
  .command('qrcode')
  .description('生成二维码或条形码')
  .option('-t, --qrcode', '生成二维码')
  .option('-s, --barcode', '生成条形码')
  .option('-m, --message <消息>', '要编码的文本消息')
  .option('-u, --url <链接>', '要编码的URL')
  .option('-o, --output <路径>', '输出文件路径')
  .action(async (options) => {
    try {
      // 验证参数
      if (!options.qrcode && !options.barcode) {
        console.error('错误: 请指定 -t 生成二维码或 -s 生成条形码');
        process.exit(1);
      }

      if (!options.message && !options.url) {
        console.error('错误: 请提供消息(-m)或URL(-u)');
        process.exit(1);
      }

      if (!options.output) {
        console.error('错误: 请使用 -o 指定输出路径');
        process.exit(1);
      }

      const content = options.message || options.url;

      if (options.qrcode) {
        await generateQRCode(content, options.output);
        console.log(`二维码已成功生成于 ${options.output}`);
      } else if (options.barcode) {
        await generateBarcode(content, options.output);
        console.log(`条形码已成功生成于 ${options.output}`);
      }
    } catch (error) {
      console.error('错误:', error.message);
      process.exit(1);
    }
  });
/**end 二维码/条形码命令**/

/**begin 开机自启命令**/
/**
 * 开机自启设置命令实现
 * @module 开机自启命令
 */
program
  .command('autostart')
  .description('设置Windows开机自启')
  .option('-l, --link <路径>', '使用链接文件设置开机自启')
  .option('-r, --exe <路径>', '使用exe文件设置开机自启(先创建链接)')
  .action((options) => {
    if (options.link) {
      setAutostartLink(options.link);
    } else if (options.exe) {
      setAutostartExe(options.exe);
    } else {
      console.log('请指定 -l 用于链接文件或 -r 用于exe文件');
    }
  });
/**end 开机自启命令**/

/**begin 关机命令**/
/**
 * 关机管理命令实现
 * @module 关机命令
 */
program
  .command('shutdown')
  .description('关机管理命令')
  .option('-n, --now', '立即关机')
  .option('-t, --timer <分钟>', '在指定分钟后关机', parseInt)
  .option('-c, --cancel', '取消计划的关机')
  .action((options) => {
    if (options.now) {
      shutdownNow();
    } else if (options.timer) {
      scheduleShutdown(options.timer);
    } else if (options.cancel) {
      cancelShutdown();
    } else {
      console.log('请指定关机选项: -n/--now, -t/--timer, 或 -c/--cancel');
    }
  });

/**
 * 立即关机函数
 * @function shutdownNow
 */
function shutdownNow() {
  console.log('正在关机...');
  exec('shutdown /s /f /t 0', (error) => {
    if (error) {
      console.error(`执行关机时出错: ${error}`);
    }
  });
}

/**
 * 计划关机函数
 * @function scheduleShutdown
 * @param {number} minutes 关机延迟分钟数
 */
function scheduleShutdown(minutes) {
  const seconds = minutes * 60;
  console.log(`计划在 ${minutes} 分钟后关机...`);
  exec(`shutdown /s /f /t ${seconds}`, (error) => {
    if (error) {
      console.error(`计划关机时出错: ${error}`);
    } else {
      console.log(`关机已计划在 ${minutes} 分钟后。使用 'eternocli shutdown --cancel' 取消。`);
    }
  });
}

/**
 * 取消关机函数
 * @function cancelShutdown
 */
function cancelShutdown() {
  console.log('取消计划的关机...');
  exec('shutdown /a', (error) => {
    if (error) {
      console.error(`取消关机时出错: ${error}`);
    } else {
      console.log('计划的关机已取消。');
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
  .description('显示详细的媒体文件信息')
  .option('-v, --video <路径>', '视频文件路径')
  .option('-m, --audio <路径>', '音频文件路径')
  .action((options) => {
    const path = options.video || options.audio;
    if (!path) {
      console.error('错误: 请提供音频或视频文件路径');
      process.exit(1);
    }
    
    getMediaDetails(path)
      .then(details => {
        console.log('媒体文件详细信息:');
        console.log('===================');
        console.log(`文件路径: ${details.path}`);
        console.log(`格式: ${details.format}`);
        console.log(`时长: ${formatDuration(details.duration)}`);
        console.log(`大小:  ${formatSize(details.size)}`);
        
        if (details.video) {
          console.log('\n视频信息:');
          console.log(`  编解码器: ${details.video.codec}`);
          console.log(`  分辨率: ${details.video.resolution}`);
          console.log(`  帧率: ${details.video.fps} fps`);
          console.log(`  比特率: ${details.video.bitrate} kbps`);
        }
        
        if (details.audio) {
          console.log('\n音频信息:');
          console.log(`  编解码器: ${details.audio.codec}`);
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
 * 将时长格式化为 HH:MM:SS
 * @param {number} seconds 总秒数
 * @returns {string} 格式化的时长字符串
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
 * 使用适当单位格式化文件大小
 * @param {number} bytes 文件大小(字节)
 * @returns {string} 格式化的文件大小字符串
 */
function formatSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  
  // 计算使用哪个单位
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exponent);
  
  // 格式化值，保留2位小数
  return `${value.toFixed(2)} ${units[exponent]}`;
}
/**end 工具函数**/

/**begin 图片重命名**/
program
  .command('rename')
  .description('从指定数字开始按自然顺序批量重命名图片文件')
  .requiredOption('-s, --src <目录>', '图片目录')
  .requiredOption('-n, --num <数字>', '起始数字')
  .option('-f, --force', '跳过确认提示直接执行', false)
  .option('-w, --width <数字>', '固定数字宽度(例如，3生成001.jpg)，如未指定则自动计算')
  .option('--dry-run', '仅预览不执行', false)
  .action((options) => {
    renameImages(options.src, options.num, options.force, {
      autoWidth: !options.width, // 如果指定了宽度则不自动计算
      fixedWidth: options.width ? parseInt(options.width) : 3,
      dryRun: options.dryRun
    });
  });

// 新命令: 数字文件名补零
program
  .command('pad-numbers')
  .description('用零填充数字文件名，例如1.jpg变为001.jpg')
  .requiredOption('-s, --src <目录>', '图片目录')
  .option('-w, --width <数字>', '数字宽度，默认为3', '3')
  .action((options) => {
    padNumberFilenames(options.src, parseInt(options.width));
  });
/**end 图片重命名**/

program
  .command('flowmaid')
  .description('编译 .flowmaid 文件为思维导图')
  .requiredOption('-s, --source <文件>', '源 .flowmaid 文件')
  .option('-o, --output <目录>', '输出目录', './')
  .option('-f, --format <格式>', '输出格式 (html, json)', 'html')
  .action(async (options) => {
    try {
      console.log('🔧 正在编译 Flowmaid 文件...');
      
      const sourcePath = path.resolve(options.source);
      const outputDir = path.resolve(options.output);
      
      // 检查源文件是否存在
      if (!await fs_e.pathExists(sourcePath)) {
        throw new Error(`未找到源文件: ${sourcePath}`);
      }
      
      // 确保输出目录存在
      await fs_e.ensureDir(outputDir);
      
      // 读取源文件
      const flowmaidContent = await fs_e.readFile(sourcePath, 'utf8');
      
      // 编译
      const result = await compileFlowmaid(flowmaidContent, {
        format: options.format,
        outputDir: outputDir
      });
      
      console.log('✅ 编译完成!');
      console.log(`📁 输出文件:`);
      result.outputFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
      
    } catch (error) {
      console.error('❌ 编译失败:', error.message);
      process.exit(1);
    }
  });

/**begin 程序入口点**/
/**
 * 程序入口点
 * @module 程序入口点
 */
// 解析命令行参数
program.parse(process.argv);
/**end 程序入口点**/