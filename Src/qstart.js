const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const open = require('open');

// 配置文件路径 - 保存在用户主目录
const CONFIG_FILE = path.join(require('os').homedir(), '.eternocli-config.json');

// 确保配置文件存在
async function ensureConfigFile() {
  try {
    await fs.ensureFile(CONFIG_FILE);
    const content = await fs.readFile(CONFIG_FILE, 'utf8');
    if (!content.trim()) {
      await fs.writeJson(CONFIG_FILE, {});
    }
  } catch (error) {
    await fs.writeJson(CONFIG_FILE, {});
  }
}

// 读取配置
async function readConfig() {
  await ensureConfigFile();
  return await fs.readJson(CONFIG_FILE);
}

// 写入配置
async function writeConfig(config) {
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

// 将相对路径转换为绝对路径
function resolvePath(inputPath) {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }
  return path.resolve(process.cwd(), inputPath);
}

// 添加启动项
async function addStartupItem(name, scriptPath) {
  const config = await readConfig();
  
  if (config[name]) {
    throw new Error(`启动项 "${name}" 已存在`);
  }

  const absolutePath = resolvePath(scriptPath);
  
  // 检查路径是否存在
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`路径 "${absolutePath}" 不存在`);
  }

  config[name] = {
    path: absolutePath,
    created: new Date().toISOString()
  };

  await writeConfig(config);
  return { name, path: absolutePath };
}

// 修改启动项
async function updateStartupItem(name, scriptPath) {
  const config = await readConfig();
  
  if (!config[name]) {
    throw new Error(`启动项 "${name}" 不存在`);
  }

  const absolutePath = resolvePath(scriptPath);
  
  // 检查路径是否存在
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`路径 "${absolutePath}" 不存在`);
  }

  config[name] = {
    ...config[name],
    path: absolutePath,
    updated: new Date().toISOString()
  };

  await writeConfig(config);
  return { name, path: absolutePath };
}

// 删除启动项
async function deleteStartupItem(name) {
  const config = await readConfig();
  
  if (!config[name]) {
    throw new Error(`启动项 "${name}" 不存在`);
  }

  delete config[name];
  await writeConfig(config);
  return name;
}

// 启动项目
async function startItem(name) {
  const config = await readConfig();
  
  if (!config[name]) {
    throw new Error(`启动项 "${name}" 不存在`);
  }

  const item = config[name];
  const absolutePath = item.path;

  // 根据文件类型决定如何启动
  const ext = path.extname(absolutePath).toLowerCase();
  
  return new Promise((resolve, reject) => {
    let childProcess;

    try {
      if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        // Node.js 脚本
        childProcess = spawn('node', [absolutePath], { stdio: 'inherit', shell: true });
      } else if (ext === '.py') {
        // Python 脚本
        childProcess = spawn('python', [absolutePath], { stdio: 'inherit', shell: true });
      } else if (ext === '.sh') {
        // Shell 脚本
        childProcess = spawn('sh', [absolutePath], { stdio: 'inherit', shell: true });
      } else if (ext === '.bat' || ext === '.cmd') {
        // Windows 批处理文件
        childProcess = spawn('cmd', ['/c', absolutePath], { stdio: 'inherit', shell: true });
      } else if (ext === '.ps1') {
        // PowerShell 脚本
        childProcess = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-File', absolutePath], { stdio: 'inherit', shell: true });
      } else {
        // 其他文件类型，使用默认程序打开
        open(absolutePath);
        resolve({ name, path: absolutePath, method: 'open' });
        return;
      }

      childProcess.on('error', (error) => {
        reject(new Error(`启动进程失败: ${error.message}`));
      });

      childProcess.on('exit', (code) => {
        if (code === 0) {
          resolve({ name, path: absolutePath, method: 'spawn', code });
        } else {
          reject(new Error(`进程退出，代码: ${code}`));
        }
      });

    } catch (error) {
      reject(new Error(`启动失败: ${error.message}`));
    }
  });
}

// 列出所有启动项
async function listStartupItems() {
  const config = await readConfig();
  return config;
}

// 获取配置文件路径
function getConfigPath() {
  return CONFIG_FILE;
}

module.exports = {
  addStartupItem,
  updateStartupItem,
  deleteStartupItem,
  startItem,
  listStartupItems,
  getConfigPath
};