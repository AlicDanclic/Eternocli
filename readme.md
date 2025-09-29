<div align="center">
<h2>EternoCli User Guide</h2>
</div>

> This is a JavaScript-based command-line extension designed to facilitate personal project work

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

##### View Project Command

```shell
eternocli view-project [options]
```

Displays project JSON file content.

Options:
- `-p, --path <path>`: Specify project JSON file path
- `-f, --full`: Display complete project information
- `-c, --changelog`: Display only changelog
- `-m, --summary`: Display only project summary

##### Update Project Command

```shell
eternocli update -m <message> -v <version>
```

Updates the project's JSON file and executes git commands to commit changes.

Options:
- `-m, --message <message>`: Commit message
- `-v, --version <version>`: Version number for changelog
- `-p, --push`: Push to remote repository

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
- `-s, --save-keys <keyfile>`: Save generated keys to file (encryption only)

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

#### (4) QR Code & Barcode:

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

#### (5) System Utilities:

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

#### (6) Media Utilities:

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

#### (7) Image Management:

##### Image Rename Command

```shell
eternocli rename -s <dir> -n <number> [-f] [-w <width>] [--dry-run]
```

Batch renames image files in natural order starting from specified number.

Options:
- `-s, --src <dir>`: Source directory containing images (required)
- `-n, --num <number>`: Starting number (required)
- `-f, --force`: Skip confirmation prompt
- `-w, --width <number>`: Fixed number width
- `--dry-run`: Preview only, don't execute

Example:
```shell
eternocli rename -s ./images -n 1
```

##### Pad Number Filenames Command

```shell
eternocli pad-numbers -s <dir> [-w <width>]
```

Pads numeric filenames with zeros (e.g., 1.jpg becomes 001.jpg).

Options:
- `-s, --src <dir>`: Source directory (required)
- `-w, --width <number>`: Number width (default: 3)

#### (8) Mind Map:

##### Flowmaid Compile Command

```shell
eternocli flowmaid -s <file> [-o <dir>] [-f <format>]
```

Compiles .flowmaid files to mind maps.

Options:
- `-s, --source <file>`: Source .flowmaid file (required)
- `-o, --output <dir>`: Output directory (default: ./)
- `-f, --format <format>`: Output format (html, json, default: html)

#### (9) Utilities:

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

- Some features require external tools to be installed on your system
- Encryption features use strong cryptographic algorithms for security
- File transformation supports multiple formats including images, documents, and ebooks
- The tool is designed for Windows systems but may work on other platforms with adjustments
- For media file operations, ensure FFmpeg is installed on your system
- Image renaming supports common formats: JPG, JPEG, PNG, BMP, TIF, TIFF, WEBP, JFIF

### 4. Support

For issues or feature requests, please check the GitHub repository or create an issue:
[Eternocli GitHub Repository](https://github.com/AlicDanclic/Eternocli)