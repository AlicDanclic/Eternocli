# 使用 Node.js 的 Commander 和 ShellJS 开发命令行工具

作为刚接触这两个包的新手，我将为你提供一个详细的入门指南，帮助你快速上手并理解核心概念。

## 1. 环境准备和项目初始化

首先确保你已安装 Node.js，然后创建项目：

```bash
mkdir my-cli-tool
cd my-cli-tool
npm init -y
```

安装所需依赖：
```bash
npm install commander shelljs
```

## 2. 基础项目结构

创建以下文件结构：
```
my-cli-tool/
├── bin/
│   └── cli.js          # 命令行入口点
├── lib/
│   ├── commands/       # 命令实现
│   └── utils.js        # 工具函数
├── package.json
└── README.md
```

## 3. 基础示例代码

### 3.1 设置包入口 (package.json)
```json
{
  "name": "my-cli-tool",
  "version": "1.0.0",
  "description": "我的CLI工具",
  "bin": {
    "my-cli": "./bin/cli.js"
  },
  "dependencies": {
    "commander": "^9.0.0",
    "shelljs": "^0.8.5"
  }
}
```

### 3.2 创建主入口文件 (bin/cli.js)
```javascript
#!/usr/bin/env node

const { program } = require('commander');
const shell = require('shelljs');

// 设置程序基本信息
program
  .name('my-cli')
  .description('一个示例CLI工具')
  .version('1.0.0');

// 添加一个简单命令
program
  .command('hello')
  .description('输出欢迎信息')
  .action(() => {
    console.log('你好！欢迎使用我的CLI工具！');
  });

// 添加带参数的命令
program
  .command('greet <name>')
  .description('向指定用户问好')
  .option('-t, --time <time>', '时间', '今天')
  .action((name, options) => {
    console.log(`${options.time}好，${name}！`);
  });

// 使用ShellJS执行命令的示例
program
  .command('list')
  .description('列出当前目录文件')
  .option('-a, --all', '显示所有文件包括隐藏文件')
  .action((options) => {
    if (options.all) {
      shell.exec('ls -la', { silent: false });
    } else {
      shell.exec('ls -l', { silent: false });
    }
  });

// 文件操作示例
program
  .command('create-file <filename>')
  .description('创建新文件')
  .action((filename) => {
    if (shell.test('-f', filename)) {
      console.error(`错误：文件 ${filename} 已存在`);
      shell.exit(1);
    } else {
      shell.touch(filename);
      console.log(`已创建文件：${filename}`);
    }
  });

// 解析命令行参数
program.parse();
```

## 4. 让工具可执行

给CLI文件添加执行权限：
```bash
chmod +x bin/cli.js
```

本地测试安装：
```bash
npm link
```

现在你可以运行：
```bash
my-cli hello
my-cli greet 张三 --time 晚上
my-cli list
my-cli create-file test.txt
```

## 5. 核心概念详解

### 5.1 Commander 基础

**定义命令：**
```javascript
program
  .command('clone <source> [destination]')
  .description('克隆一个项目')
  .option('-f, --force', '强制覆盖')
  .action((source, destination, options) => {
    // 命令逻辑
  });
```

**选项类型：**
- 必选参数：`<parameter>`
- 可选参数：`[parameter]`
- 可变参数：`[parameter...]`

**选项配置：**
```javascript
.option('-d, --debug', '开启调试模式') // 布尔标志
.option('-p, --port <number>', '端口号', 8080) // 带默认值
.option('-c, --color <color>', '颜色', parseColor) // 使用自定义解析函数
```

### 5.2 ShellJS 常用功能

**执行命令：**
```javascript
// 同步执行
const result = shell.exec('git status', { silent: true });
console.log(result.stdout);

// 检查命令是否成功
if (shell.exec('npm test').code !== 0) {
  shell.echo('测试失败');
  shell.exit(1);
}
```

**文件操作：**
```javascript
// 检查文件/目录是否存在
if (shell.test('-f', 'file.txt')) {
  console.log('文件存在');
}

// 读写文件
shell.cp('source.txt', 'dest.txt');
shell.mv('old.txt', 'new.txt');
shell.sed('-i', 'old', 'new', 'file.txt');

// 目录操作
shell.mkdir('-p', 'path/to/dir');
shell.cd('src');
console.log(shell.pwd());
```

**工具函数：**
```javascript
// 输出
shell.echo('Hello World');
shell.echo('错误信息').to('stderr');

// 退出
if (someError) {
  shell.exit(1);
}

// 环境变量
shell.env.NODE_ENV = 'production';
```

## 6. 进阶示例：项目生成器

创建一个更复杂的示例，展示如何结合两个库：

```javascript
// lib/commands/generate.js
const shell = require('shelljs');

function generateProject(projectName, options) {
  console.log(`正在创建项目: ${projectName}`);
  
  // 创建目录
  if (shell.mkdir(projectName).code !== 0) {
    console.error('创建目录失败');
    return false;
  }
  
  shell.cd(projectName);
  
  // 初始化npm项目
  if (shell.exec('npm init -y').code !== 0) {
    console.error('npm初始化失败');
    return false;
  }
  
  // 根据选项安装依赖
  if (options.typescript) {
    shell.exec('npm install typescript @types/node --save-dev');
  }
  
  // 创建基础文件
  shell.touch('index.js');
  shell.mkdir('src');
  
  console.log('项目创建成功！');
  return true;
}

module.exports = { generateProject };
```

在主文件中使用：
```javascript
// bin/cli.js
// ... 其他代码 ...

const { generateProject } = require('../lib/commands/generate');

program
  .command('generate <project-name>')
  .description('创建新项目')
  .option('-t, --typescript', '使用TypeScript')
  .action((projectName, options) => {
    if (!generateProject(projectName, options)) {
      shell.exit(1);
    }
  });

// ... 其他代码 ...
```

## 7. 最佳实践和提示

1. **错误处理**：始终检查ShellJS命令的返回码
2. **用户反馈**：使用`shell.echo`提供清晰的用户反馈
3. **跨平台兼容**：注意Windows和Unix系统的命令差异
4. **代码组织**：将复杂命令拆分成模块
5. **测试**：使用Jest或其他测试框架测试你的CLI工具

## 8. 调试和开发

添加调试模式：
```javascript
program
  .option('-d, --debug', '输出调试信息')
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().debug) {
      shell.env.DEBUG = 'true';
      shell.echo('调试模式已开启');
    }
  });
```

## 9. 发布你的工具

1. 完善package.json信息
2. 添加README.md文档
3. 发布到npm：
```bash
npm login
npm publish
```

## 下一步学习建议

1. 阅读官方文档：
   - [Commander.js](https://github.com/tj/commander.js)
   - [ShellJS](https://github.com/shelljs/shelljs)

2. 尝试添加更多功能：
   - 配置文件支持
   - 交互式提示（使用inquirer.js）
   - 网络请求功能
   - 进度指示器

3. 学习其他成功CLI工具的结构和实现

这个指南应该为你提供了一个坚实的基础，帮助你开始使用Commander和ShellJS开发命令行工具。随着实践的增加，你会逐渐掌握更多高级技巧和最佳实践。