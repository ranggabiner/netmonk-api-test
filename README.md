# Netmonk API Test

## Overview

**Netmonk API Test** is a cross-platform desktop application built with Electron to automate testing of Netmonk APIs using Postman collections.  
This application serves as a GUI wrapper for [Newman](https://www.npmjs.com/package/newman), allowing users to easily run API tests and generate detailed reports—without needing to touch the terminal.

✅ **Primary Output**: HTML reports generated via the `newman-reporter-htmlextra` package.

---

## Features

- ✅ One-click execution of Postman collections
- 📝 Support for custom `.env` API credentials and environment setup
- 📊 Auto-generated Newman HTML reports
- 💻 Works on both macOS and Windows
- 📂 Saves reports locally for QA tracking and bug reports

---

## Download

Download the latest release for your operating system:

- **macOS:**
  - [v1.1](https://drive.google.com/file/d/113jv73A_6VuoudDHOEifiKKh7WZoy2TP/)
- **Windows:**
  - [v1.1](https://drive.google.com/file/d/1g_aSY5SGYPkjgZIOACK0wCCfjvlgztKt/)

> 📦 Each package is bundled and ready to use. Ensure you're using the correct version for your OS.

> 🛡️ macOS Security Notice:
> If you see a warning like “App is damaged or can’t be opened,” you may need to remove the quarantine attribute:

```bash
xattr -d com.apple.quarantine '/Applications/Netmonk API Test.app'
```

---

## Prerequisites

To run this app correctly (especially during development or when modifying), make sure the following global dependencies are installed:

```bash
npm install -g newman
npm install -g newman-reporter-htmlextra
```
