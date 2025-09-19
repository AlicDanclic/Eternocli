<div align="center"><h2>EternoCli User Guide</h2></div>

> This is a command-line extension based on JS, designed to facilitate personal project work

### 1. Installation

First, clone this project from GitHub:
```shell
git clone git@github.com:AlicDanclic/Eternocli.git
```

Install the required JavaScript modules:

```shell
npm install
```

Link to global:

```shell
npm link
```

### 2. Usage

#### (1) Project Section:

##### Create Project Command

```shell
eternocli create <name> -a <items> -r <items>
```

Creates a project structure with the specified name, including default directories (Bitmap, Hardware, Software, References, DataSheet) and files (Readme.md, .gitignore, name.json).

Options:
- `-d, --dir <path>`: Specify project directory (default: current directory)
- `-a, --add <items>`: Add additional directories/files (comma-separated)
- `-r, --remove <items>`: Remove default directories/files (comma-separated)

Example:
```shell
eternocli create my-project -a "docs,src/components" -r "References"
```

##### Update Project Command

```shell
eternocli update -m <message> -v <version>
```

Updates the project's JSON file and executes git commands to commit changes.

Options:
- `-m, --message <message>`: Commit message
- `-v, --version <version>`: Version number for changelog

Example:
```shell
eternocli update -m "Added user authentication" -v "1.2.0"
```

##### Git Init Command

```shell
eternocli git-init -u <url>
```

Initializes a git repository, commits all files, and optionally sets up a remote origin.

Options:
- `-u, --url <url>`: Remote repository URL (optional)

Example:
```shell
eternocli git-init -u git@github.com:username/repository.git
```

#### (2) File Transformation:

##### Transform File Command

```shell
eternocli transform <sourcefile> -t <type> [-o <outputpath>]
```

Converts a file from one format to another (supports images, PDFs, EPUB, and text files).

Options:
- `-t, --type <type>`: Target format (required)
- `-o, --output <outputpath>`: Output file path (optional)

Example:
```shell
eternocli transform document.pdf -t txt -o output.txt
```

##### Show Supported Formats Command

```shell
eternocli transform-formats
```

Displays all supported file conversion formats.

#### (3) Encryption & Decryption:

##### Encryption/Decryption Command

```shell
eternocli cryption [data] -e|-d -t <algorithm> [-k <key>] [-i <iv>] [-f] [-o <output>]
```

Encrypts or decrypts data or files using various cryptographic algorithms.

Options:
- `-e, --encrypt`: Enable encryption mode
- `-d, --decrypt`: Enable decryption mode
- `-t, --type <algorithm>`: Encryption algorithm (default: aes-256-cbc)
- `-k, --key <key>`: Encryption key (hex string)
- `-i, --iv <iv>`: Initialization vector (hex string, required for some algorithms)
- `-f, --file`: Process file instead of text
- `-o, --output <output>`: Output file path

Examples:
```shell
# Encrypt text
eternocli cryption "secret message" -e -t aes-256-cbc

# Decrypt file
eternocli cryption encrypted.bin -d -f -t aes-256-cbc -k mykey -o decrypted.txt
```

##### Show Supported Algorithms Command

```shell
eternocli cryption-algorithms
```

Displays all supported encryption algorithms.

#### (4) Compression:

##### ZIP Compression Command

```shell
eternocli zip [options]
```

Performs ZIP compression operations.

Options:
- `-a, --all`: Compress all contents of current directory
- `-n, --name <name>`: Specify compressed file name
- `-f, --folders`: Compress all folders in current directory
- `-r, --files`: Compress all files in current directory
- `-w, --work <src>`: Compress specified file/folder
- `-o, --output <path>`: Output path
- `-d, --delete`: Delete source after compression

Example:
```shell
eternocli zip -a -n archive.zip -d
```

##### 7z Compression Command

```shell
eternocli 7z [options]
```

Performs 7z compression operations (requires 7-Zip installed).

Options same as zip command.

Example:
```shell
eternocli 7z -a -n archive.7z -d
```

##### RAR Compression Command

```shell
eternocli rar [options]
```

Performs RAR compression operations (requires WinRAR or RAR CLI tool).

Options same as zip command.

Example:
```shell
eternocli rar -a -n archive.rar -d
```

#### (5) Secure Compression:

##### Encrypted Zip Command

```shell
eternocli ezip <src> [-o <path>]
```

Compresses and encrypts a file using AES-256-GCM encryption.

Example:
```shell
eternocli ezip document.pdf -o secure.ezip
```

##### Decrypt Zip Command

```shell
eternocli dezip <src> [-o <path>]
```

Decrypts and decompresses a .ezip file.

Example:
```shell
eternocli dezip secure.ezip -o document.pdf
```

#### (6) QR Code & Barcode:

##### Generate QR Code/Barcode Command

```shell
eternocli qrcode -t|-s -m <message>|-u <url> -o <path>
```

Generates QR code or barcode images.

Options:
- `-t, --qrcode`: Generate QR code
- `-s, --barcode`: Generate barcode
- `-m, --message <message>`: Text message to encode
- `-u, --url <url>`: URL to encode
- `-o, --output <path>`: Output file path

Examples:
```shell
# Generate QR code
eternocli qrcode -t -u "https://example.com" -o qr.png

# Generate barcode
eternocli qrcode -s -m "123456789" -o barcode.png
```

#### (7) System Utilities:

##### Autostart Command

```shell
eternocli autostart -l <path>|-r <path>
```

Sets up autostart for Windows applications.

Options:
- `-l, --link <path>`: Set autostart using a link file
- `-r, --exe <path>`: Set autostart using an exe file

Examples:
```shell
eternocli autostart -l "C:\path\to\shortcut.lnk"
eternocli autostart -r "C:\path\to\program.exe"
```

##### Shutdown Command

```shell
eternocli shutdown -n|-t <minutes>|-c
```

Manages system shutdown operations.

Options:
- `-n, --now`: Shutdown immediately
- `-t, --timer <minutes>`: Shutdown after specified minutes
- `-c, --cancel`: Cancel scheduled shutdown

Examples:
```shell
# Shutdown in 30 minutes
eternocli shutdown -t 30

# Cancel shutdown
eternocli shutdown -c
```

#### (8) Media Utilities:

##### Media Details Command

```shell
eternocli vmdetail -v <path>|-m <path>
```

Displays detailed information about media files.

Options:
- `-v, --video <path>`: Video file path
- `-m, --audio <path>`: Audio file path

Example:
```shell
eternocli vmdetail -v video.mp4
```

##### Image Rename Command

```shell
eternocli rename -s <dir> -n <number> [-f]
```

Batch renames image files in natural order starting from specified number.

Options:
- `-s, --src <dir>`: Source directory containing images
- `-n, --num <number>`: Starting number
- `-f, --force`: Skip confirmation prompt

Example:
```shell
eternocli rename -s ./images -n 1
```

#### (9) Utilities:

##### File Compare Command

```shell
eternocli compare <file1> <file2> [-m <mode>]
```

Compares two files using different comparison modes.

Options:
- `-m, --mode <mode>`: Comparison mode (content, binary, size) - default: content

Example:
```shell
eternocli compare file1.txt file2.txt -m content
```

##### Password Generation Command

```shell
eternocli generate-password [-l <length>] [-c <complexity>]
```

Generates random passwords with specified length and complexity.

Options:
- `-l, --length <length>`: Password length (default: 16)
- `-c, --complexity <complexity>`: Complexity level (low, medium, high) - default: medium

Example:
```shell
eternocli generate-password -l 20 -c high
```

### 3. Notes

- Some features (7z, RAR compression) require external tools to be installed on your system
- Encryption features use strong cryptographic algorithms for security
- File transformation supports multiple formats including images, documents, and ebooks
- The tool is designed for Windows systems but may work on other platforms with adjustments
- For media file operations, ensure FFmpeg is installed on your system
- Image renaming supports common formats: JPG, JPEG, PNG, BMP, TIF, TIFF, WEBP, JFIF

### 4. Support

For issues or feature requests, please check the GitHub repository or create an issue:
[Eternocli GitHub Repository](https://github.com/AlicDanclic/Eternocli)
