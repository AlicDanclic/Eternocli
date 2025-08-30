#!/usr/bin/env node
const {program} = require('commander');
const shell = require('shelljs');
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

program
  .version('1.0.0')
  .description('EternoCLI - 项目管理和Git工具');

// 创建项目命令
program
  .command('create')
  .description('创建新项目')
  .requiredOption('-t, --template <projectname>', '项目名称')
  .action((options) => {
    const projectName = options.template;
    const directories = [
      'DataSheet',
      'References',
      'Hardware',
      'Software',
      'Bitmap'
    ];

    // 创建项目目录
    if (fs.existsSync(projectName)) {
      console.log(`项目 ${projectName} 已存在`);
      return;
    }

    fs.mkdirSync(projectName);
    directories.forEach(dir => {
      fs.mkdirSync(path.join(projectName, dir));
    });

    // 创建Readme.md
    fs.writeFileSync(
      path.join(projectName, 'Readme.md'),
      `# ${projectName}\n\n项目描述...\n`
    );

    console.log(`项目 ${projectName} 创建成功`);
  });

// Git命令
program
  .command('git')
  .description('Git操作')
  .option('--action <action>', 'Git提交操作')
  .option('--init', '初始化Git仓库')
  .option('--pull <url>', '从远程仓库拉取')
  .option('--false', '不执行push操作', false)
  .option('--true', '执行push操作', false)
  .option('--url <url>', '远程仓库URL')
  .action((options) => {
    if (options.action) {
      // 提交操作
      shell.exec('git add .');
      shell.exec(`git commit -m "${options.action}"`);
      if (options.true) {
        shell.exec('git push origin main');
      }
    } else if (options.init) {
      // 初始化操作
      shell.exec('git init');
      shell.exec('git add .');
      shell.exec('git commit -m "first commit"');
      
      if (options.true && options.url) {
        shell.exec('git branch -M main');
        shell.exec(`git remote add origin ${options.url}`);
        shell.exec('git push -u origin main');
      }
    } else if (options.pull) {
      // 拉取操作
      shell.exec('git init');
      shell.exec('git branch -M main');
      shell.exec(`git remote add origin ${options.pull}`);
      shell.exec('git pull origin main');
    }
  });

// 状态管理命令
program
  .command('status')
  .description('项目状态管理')
  .option('--create', '创建状态文件')
  .option('--update', '更新状态信息')
  .option('-P, --project <message>', '更新项目信息')
  .option('-M, --mcu <message>', '更新MCU信息')
  .option('-H, --hardware <message>', '更新硬件信息')
  .option('-S, --software <message>', '更新软件信息')
  .action(async (options) => {
    const statusFile = '.eternostatus';

    if (options.create) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'project', message: 'ProjectName:' },
        { type: 'input', name: 'mcu', message: 'MCU:' },
        { type: 'input', name: 'hardware', message: 'Hardware:' },
        { type: 'input', name: 'software', message: 'Software:' }
      ]);

      fs.writeFileSync(statusFile, JSON.stringify(answers, null, 2));
      console.log('状态文件已创建');
    } else if (options.update) {
      if (!fs.existsSync(statusFile)) {
        console.log('请先创建状态文件');
        return;
      }

      const currentStatus = JSON.parse(fs.readFileSync(statusFile));
      const updates = {
        project: options.project,
        mcu: options.mcu,
        hardware: options.hardware,
        software: options.software
      };

      Object.keys(updates).forEach(key => {
        if (updates[key]) {
          currentStatus[key] = updates[key];
        }
      });

      fs.writeFileSync(statusFile, JSON.stringify(currentStatus, null, 2));
      console.log('状态已更新');
    } else {
      // 查看状态
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile));
        console.log('\n当前项目状态:');
        console.log(`项目名称: ${status.project}`);
        console.log(`MCU: ${status.mcu}`);
        console.log(`硬件版本: ${status.hardware}`);
        console.log(`软件版本: ${status.software}`);
      } else {
        console.log('请先创建状态文件 (使用 --create 选项)');
      }
    }
  });

program.parse(process.argv);