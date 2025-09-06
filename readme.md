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

#### Create Project Command

```shell
eternocli create <name> -a <items> -r <items>
```

Creates a project structure with the specified name, including default directories (Bitmap, Hardware, Software, References) and files ([Readme.md](https://readme.md/), .gitignore, name.json).

Options:

- `-a, --add <items>`: Add additional directories/files (comma-separated)
- `-r, --remove <items>`: Remove default directories/files (comma-separated)

Example:

```shell
eternocli create my-project -a "docs,src/components" -r "References"
```

#### Update Project Command

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

#### Git Init Command

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

