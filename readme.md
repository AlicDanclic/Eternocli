<div align="center"><h2> EternoCli User Guide </h2></div>

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

### 2.Usage

#### (1) Project Section:

Content of name.json:

```json
{
  "projectName": "Example Project",
  "creationDate": "2023-01-15",
  "lastUpdateDate": "2023-10-07",
  "changelog": [
    {
      "version": "1.0.0",
      "updateDate": "2023-01-15",
      "info": "Initial release with core features"
    },
    {
      "version": "1.1.0",
      "updateDate": "2023-03-22",
      "info": "Added user permission management module, fixed known issues"
    },
    {
      "version": "2.0.0",
      "updateDate": "2023-10-07",
      "info": "UI redesign, added multilingual support, performance optimization"
    }
  ]
}
```

```shell
eternocli create <name> -<./dir> +<./dir>
```

Create a project structure named "name," including the following folders (Bitmap, Hardware, Software, References, etc.) and the following files (Readme.md, .gitignore, name.json).

Additional configurations with - and + can be used to add or remove specific files.

```shell
eternocli update -m <message>
```
Execute the following commands:

```shell
git add .
git commit -m <message>
Also update the content of name.json.
```

```shell
eternocli git init -u <url>
```

Execute the following commands:

```shell
git init
git add .
git commit -m "First Commit"
git branch -M main
git remote add origin <url>
git push -u origin main
```

If no URL is provided, execute:

```shell
git init
git add .
git commit -m "First Commit"
```

