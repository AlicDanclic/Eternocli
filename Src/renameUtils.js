const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 支持的图片扩展名
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.tif', '.tiff', '.webp', '.jfif']);

// 自然排序函数
function naturalSortKey(name) {
  return name.split(/(\d+)/).map(t => isNaN(t) ? t.toLowerCase() : parseInt(t, 10));
}

// 收集图片文件
function collectImages(folder) {
  const files = fs.readdirSync(folder);
  const imgs = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMG_EXT.has(ext);
    })
    .map(file => path.join(folder, file))
    .filter(filePath => fs.statSync(filePath).isFile());
  
  // 按自然顺序排序
  imgs.sort((a, b) => {
    const aKey = naturalSortKey(path.basename(a, path.extname(a)));
    const bKey = naturalSortKey(path.basename(b, path.extname(b)));
    
    for (let i = 0; i < Math.min(aKey.length, bKey.length); i++) {
      if (aKey[i] !== bKey[i]) {
        return aKey[i] < bKey[i] ? -1 : 1;
      }
    }
    return aKey.length - bKey.length;
  });
  
  return imgs;
}

// 计算需要的位数宽度
function calculateWidthNeeded(startNum, totalCount) {
  const maxNum = startNum + totalCount - 1;
  return Math.max(3, maxNum.toString().length); // 至少3位，根据最大值自动调整
}

// 构建新文件名
function buildNewName(index, ext, width = 3) {
  return `${index.toString().padStart(width, '0')}${ext.toLowerCase()}`;
}

// 智能构建新文件名（自动计算位数）
function buildSmartNewName(index, ext, startNum, totalCount) {
  const width = calculateWidthNeeded(startNum, totalCount);
  return buildNewName(index, ext, width);
}

// 执行重命名操作
function executeRename(renamePlan) {
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const { oldPath, newPath, newName } of renamePlan) {
    if (fs.existsSync(newPath)) {
      console.log(`警告：目标文件已存在，跳过 ${path.basename(oldPath)}`);
      skipCount++;
      continue;
    }
    
    try {
      fs.renameSync(oldPath, newPath);
      console.log(`✓ ${path.basename(oldPath)} -> ${newName}`);
      successCount++;
    } catch (error) {
      console.log(`✗ 重命名 ${path.basename(oldPath)} 失败：${error.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n重命名完成！成功: ${successCount}, 跳过: ${skipCount}, 失败: ${errorCount}`);
  return { successCount, skipCount, errorCount };
}

// 预览重命名方案
function previewRename(imgs, startNum, options = {}) {
  const { autoWidth = true, fixedWidth = 3 } = options;
  const totalCount = imgs.length;
  
  console.log(`共发现 ${totalCount} 张图片`);
  if (autoWidth) {
    const calculatedWidth = calculateWidthNeeded(startNum, totalCount);
    console.log(`自动计算位数：${calculatedWidth}位（起始: ${startNum}, 最大: ${startNum + totalCount - 1}）`);
  } else {
    console.log(`固定位数：${fixedWidth}位`);
  }
  
  console.log('预览改名方案（旧 -> 新）：');
  
  const renamePlan = [];
  const nameMap = new Map(); // 用于检测重复的新文件名
  
  for (let i = 0; i < imgs.length; i++) {
    const oldPath = imgs[i];
    const ext = path.extname(oldPath);
    const newName = autoWidth 
      ? buildSmartNewName(startNum + i, ext, startNum, totalCount)
      : buildNewName(startNum + i, ext, fixedWidth);
    const newPath = path.join(path.dirname(oldPath), newName);
    
    // 检查是否有重复的新文件名
    if (nameMap.has(newName)) {
      console.log(`警告：新文件名冲突 ${newName}（来自 ${path.basename(oldPath)} 和 ${nameMap.get(newName)}）`);
    }
    nameMap.set(newName, path.basename(oldPath));
    
    renamePlan.push({ oldPath, newPath, newName });
    console.log(`  ${path.basename(oldPath)}  ->  ${newName}`);
  }
  
  return renamePlan;
}

// 主函数 - 增强版
function renameImages(src, startNum, force, options = {}) {
  try {
    // 解析参数
    const {
      autoWidth = true,    // 是否自动计算位数
      fixedWidth = 3,      // 固定位数（当autoWidth为false时使用）
      dryRun = false       // 干跑模式，只预览不执行
    } = options;

    // 解析文件夹路径
    const folder = path.resolve(src);
    if (!fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) {
      console.error(`路径不存在或不是文件夹：${folder}`);
      process.exit(1);
    }

    // 检查起始编号
    const start = parseInt(startNum, 10);
    if (isNaN(start) || start < 0) {
      console.error('起始编号必须是非负整数！');
      process.exit(1);
    }

    // 检查固定位数参数
    if (!autoWidth) {
      const width = parseInt(fixedWidth, 10);
      if (isNaN(width) || width < 1 || width > 10) {
        console.error('固定位数必须是1-10之间的整数！');
        process.exit(1);
      }
    }

    const imgs = collectImages(folder);
    if (imgs.length === 0) {
      console.log('未找到任何图片文件！');
      process.exit(0);
    }

    console.log(`图片目录：${folder}`);
    const renamePlan = previewRename(imgs, start, { autoWidth, fixedWidth });

    // 干跑模式直接退出
    if (dryRun) {
      console.log('\n干跑模式完成，未执行实际重命名操作。');
      return;
    }

    // 如果不是强制模式，需要确认
    if (!force) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('\n确认执行重命名？输入 y 继续，其它退出：', answer => {
        rl.close();
        if (answer.trim().toLowerCase() === 'y') {
          executeRename(renamePlan);
        } else {
          console.log('已取消。');
        }
      });
    } else {
      executeRename(renamePlan);
    }
  } catch (error) {
    console.error('执行过程中发生错误：', error.message);
    process.exit(1);
  }
}

// 补充函数：将数字名称补充n位
function padNumberFilename(filename, width = 3) {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);
  
  // 检查文件名是否纯数字
  if (/^\d+$/.test(nameWithoutExt)) {
    const number = parseInt(nameWithoutExt, 10);
    return `${number.toString().padStart(width, '0')}${ext}`;
  }
  
  return filename; // 不是纯数字文件名，返回原文件名
}

// 批量补充数字文件名位数
function padNumberFilenames(folder, width = 3) {
  const files = fs.readdirSync(folder);
  let count = 0;
  
  files.forEach(file => {
    const oldPath = path.join(folder, file);
    if (fs.statSync(oldPath).isFile()) {
      const newName = padNumberFilename(file, width);
      if (newName !== file) {
        const newPath = path.join(folder, newName);
        try {
          fs.renameSync(oldPath, newPath);
          console.log(`✓ ${file} -> ${newName}`);
          count++;
        } catch (error) {
          console.log(`✗ 重命名 ${file} 失败：${error.message}`);
        }
      }
    }
  });
  
  console.log(`补充位数完成！处理了 ${count} 个文件。`);
}

module.exports = {
  renameImages,
  collectImages,
  buildNewName,
  buildSmartNewName,
  calculateWidthNeeded,
  executeRename,
  previewRename,
  padNumberFilename,
  padNumberFilenames
};