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

// 构建新文件名
function buildNewName(index, ext, width = 3) {
  return `${index.toString().padStart(width, '0')}${ext.toLowerCase()}`;
}

// 执行重命名操作
function executeRename(renamePlan) {
  let successCount = 0;
  let skipCount = 0;
  
  for (const { oldPath, newPath, newName } of renamePlan) {
    if (fs.existsSync(newPath)) {
      console.log(`警告：目标文件已存在，跳过 ${path.basename(oldPath)}`);
      skipCount++;
      continue;
    }
    
    try {
      fs.renameSync(oldPath, newPath);
      successCount++;
    } catch (error) {
      console.log(`重命名 ${path.basename(oldPath)} 失败：${error.message}`);
    }
  }
  
  console.log(`重命名完成！成功: ${successCount}, 跳过: ${skipCount}`);
}

// 主函数
function renameImages(src, startNum, force) {
  try {
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

    const imgs = collectImages(folder);
    if (imgs.length === 0) {
      console.log('未找到任何图片文件！');
      process.exit(0);
    }

    console.log(`共发现 ${imgs.length} 张图片，目录：${folder}`);
    console.log('预览改名方案（旧 -> 新）：');
    
    const renamePlan = [];
    for (let i = 0; i < imgs.length; i++) {
      const oldPath = imgs[i];
      const ext = path.extname(oldPath);
      const newName = buildNewName(start + i, ext);
      const newPath = path.join(path.dirname(oldPath), newName);
      renamePlan.push({ oldPath, newPath, newName });
      console.log(`  ${path.basename(oldPath)}  ->  ${newName}`);
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

module.exports = {
  renameImages,
  collectImages,
  buildNewName,
  executeRename
};