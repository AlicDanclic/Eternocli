<div align="center"><h2>EternoCli 用户指南</h2></div>

> 这是一个基于 JS 的命令行扩展工具，旨在方便个人项目工作

### 1. 安装

首先，从 GitHub 克隆此项目：
```shell
git clone git@github.com:AlicDanclic/Eternocli.git
```

安装所需的 JavaScript 模块：

```shell
npm install
```

链接到全局环境：

```shell
npm link
```

### 2. 使用方法

#### (1) 项目管理：

##### 创建项目命令

```shell
eternocli create <项目名称> -a <项目列表> -r <项目列表>
```

创建具有指定名称的项目结构，包括默认目录（Bitmap、Hardware、Software、References、DataSheet）和文件（Readme.md、.gitignore、name.json）。

选项：
- `-d, --dir <路径>`：指定项目目录（默认：当前目录）
- `-a, --add <项目列表>`：添加额外的目录/文件（逗号分隔）
- `-r, --remove <项目列表>`：移除默认目录/文件（逗号分隔）

示例：
```shell
eternocli create my-project -a "docs,src/components" -r "References"
```

##### 更新项目命令

```shell
eternocli update -m <消息> -v <版本号>
```

更新项目的 JSON 文件并执行 git 命令提交更改。

选项：
- `-m, --message <消息>`：提交信息
- `-v, --version <版本号>`：更新日志的版本号

示例：
```shell
eternocli update -m "添加用户认证功能" -v "1.2.0"
```

##### Git 初始化命令

```shell
eternocli git-init -u <URL>
```

初始化 git 仓库，提交所有文件，并可选择设置远程 origin。

选项：
- `-u, --url <URL>`：远程仓库 URL（可选）

示例：
```shell
eternocli git-init -u git@github.com:username/repository.git
```

#### (2) 文件转换：

##### 文件转换命令

```shell
eternocli transform <源文件> -t <类型> [-o <输出路径>]
```

将文件从一种格式转换为另一种格式（支持图像、PDF、EPUB 和文本文件）。

选项：
- `-t, --type <类型>`：目标格式（必需）
- `-o, --output <输出路径>`：输出文件路径（可选）

示例：
```shell
eternocli transform document.pdf -t txt -o output.txt
```

##### 显示支持的格式命令

```shell
eternocli transform-formats
```

显示所有支持的文件转换格式。

#### (3) 加密与解密：

##### 加密/解密命令

```shell
eternocli cryption [数据] -e|-d -t <算法> [-k <密钥>] [-i <初始向量>] [-f] [-o <输出>]
```

使用各种加密算法加密或解密数据或文件。

选项：
- `-e, --encrypt`：启用加密模式
- `-d, --decrypt`：启用的解密模式
- `-t, --type <算法>`：加密算法（默认：aes-256-cbc）
- `-k, --key <密钥>`：加密密钥（十六进制字符串）
- `-i, --iv <初始向量>`：初始化向量（十六进制字符串，某些算法需要）
- `-f, --file`：处理文件而非文本
- `-o, --output <输出>`：输出文件路径

示例：
```shell
# 加密文本
eternocli cryption "秘密消息" -e -t aes-256-cbc

# 解密文件
eternocli cryption encrypted.bin -d -f -t aes-256-cbc -k mykey -o decrypted.txt
```

##### 显示支持的算法命令

```shell
eternocli cryption-algorithms
```

显示所有支持的加密算法。

#### (4) 压缩：

##### ZIP 压缩命令

```shell
eternocli zip [选项]
```

执行 ZIP 压缩操作。

选项：
- `-a, --all`：压缩当前目录的所有内容
- `-n, --name <名称>`：指定压缩文件名
- `-f, --folders`：压缩当前目录中的所有文件夹
- `-r, --files`：压缩当前目录中的所有文件
- `-w, --work <源>`：压缩指定的文件/文件夹
- `-o, --output <路径>`：输出路径
- `-d, --delete`：压缩后删除源文件

示例：
```shell
eternocli zip -a -n archive.zip -d
```

##### 7z 压缩命令

```shell
eternocli 7z [选项]
```

执行 7z 压缩操作（需要安装 7-Zip）。

选项与 zip 命令相同。

示例：
```shell
eternocli 7z -a -n archive.7z -d
```

##### RAR 压缩命令

```shell
eternocli rar [选项]
```

执行 RAR 压缩操作（需要安装 WinRAR 或 RAR CLI 工具）。

选项与 zip 命令相同。

示例：
```shell
eternocli rar -a -n archive.rar -d
```

#### (5) 安全压缩：

##### 加密 Zip 命令

```shell
eternocli ezip <源文件> [-o <路径>]
```

使用 AES-256-GCM 加密压缩并加密文件。

示例：
```shell
eternocli ezip document.pdf -o secure.ezip
```

##### 解密 Zip 命令

```shell
eternocli dezip <源文件> [-o <路径>]
```

解密并解压缩 .ezip 文件。

示例：
```shell
eternocli dezip secure.ezip -o document.pdf
```

#### (6) 二维码与条形码：

##### 生成二维码/条形码命令

```shell
eternocli qrcode -t|-s -m <消息>|-u <URL> -o <路径>
```

生成二维码或条形码图像。

选项：
- `-t, --qrcode`：生成二维码
- `-s, --barcode`：生成条形码
- `-m, --message <消息>`：要编码的文本消息
- `-u, --url <URL>`：要编码的 URL
- `-o, --output <路径>`：输出文件路径

示例：
```shell
# 生成二维码
eternocli qrcode -t -u "https://example.com" -o qr.png

# 生成条形码
eternocli qrcode -s -m "123456789" -o barcode.png
```

#### (7) 系统工具：

##### 开机自启命令

```shell
eternocli autostart -l <路径>|-r <路径>
```

设置 Windows 应用程序的开机自启。

选项：
- `-l, --link <路径>`：使用链接文件设置自启
- `-r, --exe <路径>`：使用可执行文件设置自启

示例：
```shell
eternocli autostart -l "C:\path\to\shortcut.lnk"
eternocli autostart -r "C:\path\to\program.exe"
```

##### 关机命令

```shell
eternocli shutdown -n|-t <分钟>|-c
```

管理系统关机操作。

选项：
- `-n, --now`：立即关机
- `-t, --timer <分钟>`：在指定分钟后关机
- `-c, --cancel`：取消计划的关机

示例：
```shell
# 30 分钟后关机
eternocli shutdown -t 30

# 取消关机
eternocli shutdown -c
```

#### (8) 媒体工具：

##### 媒体详情命令

```shell
eternocli vmdetail -v <路径>|-m <路径>
```

显示媒体文件的详细信息。

选项：
- `-v, --video <路径>`：视频文件路径
- `-m, --audio <路径>`：音频文件路径

示例：
```shell
eternocli vmdetail -v video.mp4
```

##### 图片重命名命令

```shell
eternocli rename -s <目录> -n <数字> [-f]
```

从指定数字开始按自然顺序批量重命名图像文件。

选项：
- `-s, --src <目录>`：包含图像的源目录
- `-n, --num <数字>`：起始编号
- `-f, --force`：跳过确认提示

示例：
```shell
eternocli rename -s ./images -n 1
```

#### (9) 实用工具：

##### 文件比较命令

```shell
eternocli compare <文件1> <文件2> [-m <模式>]
```

使用不同的比较模式比较两个文件。

选项：
- `-m, --mode <模式>`：比较模式（content, binary, size）- 默认：content

示例：
```shell
eternocli compare file1.txt file2.txt -m content
```

##### 密码生成命令

```shell
eternocli generate-password [-l <长度>] [-c <复杂度>]
```

生成具有指定长度和复杂度的随机密码。

选项：
- `-l, --length <长度>`：密码长度（默认：16）
- `-c, --complexity <复杂度>`：复杂度级别（low, medium, high）- 默认：medium

示例：
```shell
eternocli generate-password -l 20 -c high
```

### 3. 注意事项

- 某些功能（7z、RAR 压缩）需要在系统上安装外部工具
- 加密功能使用强加密算法确保安全
- 文件转换支持多种格式，包括图像、文档和电子书
- 该工具专为 Windows 系统设计，但经过调整也可在其他平台上运行
- 对于媒体文件操作，请确保系统已安装 FFmpeg
- 图片重命名支持常见格式：JPG、JPEG、PNG、BMP、TIF、TIFF、WEBP、JFIF

### 4. 支持

如有问题或功能请求，请查看 GitHub 仓库或创建 issue：[Eternocli GitHub 仓库](https://github.com/AlicDanclic/Eternocli)

