const { exec } = require('child_process');
const path = require('path');

// 设置自启动 (使用链接文件)
function setAutostartLink(linkPath) {
  const startupDir = getStartupDirectory();
  const linkName = path.basename(linkPath);
  const destination = path.join(startupDir, linkName);
  
  console.log(`Setting up autostart with link: ${linkPath}`);
  
  // 复制链接到启动目录
  exec(`copy "${linkPath}" "${destination}"`, (error) => {
    if (error) {
      console.error(`Error setting autostart: ${error}`);
    } else {
      console.log(`Autostart configured successfully with link: ${linkPath}`);
    }
  });
}

// 设置自启动 (使用exe文件，先创建链接)
function setAutostartExe(exePath) {
  const startupDir = getStartupDirectory();
  const exeName = path.basename(exePath, '.exe');
  const linkName = `${exeName}.lnk`;
  const linkPath = path.join(startupDir, linkName);
  
  console.log(`Creating startup link for exe: ${exePath}`);
  
  // 使用 PowerShell 创建快捷方式
  const psCommand = `
    $WshShell = New-Object -comObject WScript.Shell;
    $Shortcut = $WshShell.CreateShortcut("${linkPath}");
    $Shortcut.TargetPath = "${exePath}";
    $Shortcut.Save()
  `;
  
  exec(`powershell -command "${psCommand}"`, (error) => {
    if (error) {
      console.error(`Error creating shortcut: ${error}`);
    } else {
      console.log(`Autostart configured successfully with exe: ${exePath}`);
    }
  });
}

// 获取Windows启动目录
function getStartupDirectory() {
  return path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
}

module.exports = {
  setAutostartLink,
  setAutostartExe
};