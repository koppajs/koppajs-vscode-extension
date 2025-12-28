# VS Code Koppa Extension Development Guide

This guide will walk you through the process of packaging the VS Code Koppa Extension.

## Prerequisites

1. Ensure you have Node.js and npm installed on your machine. If not, you can download and install it from [here](https://nodejs.org/).

2. Make sure all project dependencies are installed:

```bash
npm install
```

## Packaging the Extension

Follow these steps to package your extension:

1. Open a terminal in the root directory of your extension.

2. Use the following command to package the extension:

```bash
npx vsce package
```

&nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
Upon successful packaging, a `.vsix` file should be created in your project directory. This file represents your packaged extension.

## Installing the Packaged Extension in VS Code

To install the `.vsix` file in VS Code:

1. Open Visual Studio Code.

2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on macOS) to open the Extensions pane.

3. Click on the "More Actions" button (three vertical dots) at the top right corner of the Extensions pane.

4. Select "Install from VSIX..." from the dropdown menu.

5. Navigate to your project directory and select the `.vsix` file.

6. After installation, you should see your extension listed among the installed extensions.

## Notes

If you make changes to your extension, you'll need to repeat these steps to package and install the latest version of your extension.
