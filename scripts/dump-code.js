#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

// ==== Paths ====

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root = one level above this script
const PROJECT_ROOT = path.join(__dirname, "..");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "---code_dump.txt");

// ==== Configuration: Ignore lists ====

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".hg",
  ".svn",
  ".turbo",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".angular",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".parcel-cache",
  ".vite",
  ".husky",
  ".vercel",
  ".idea",
  ".vscode",
  "tmp",
  "temp",
  ".tmp",
]);

const IGNORE_FILE_PATTERNS = [
  // Temporary / generated files
  /\.log$/i,
  /\.tmp$/i,
  /\.temp$/i,
  /\.swp$/i,
  /~$/i,
  /\.bak$/i,
  /\.orig$/i,
  /\.DS_Store$/i,

  // Lockfiles
  /pnpm-lock\.yaml$/i,
  /package-lock\.json$/i,
  /yarn-lock\.txt$/i,

  // Custom dump files
  /^---.*$/i,
];

// Known text extensions → always treated as text
const TEXT_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".md",
  ".markdown",
  ".txt",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".yml",
  ".yaml",
  ".xml",
  ".env",
  ".gitignore",
  ".gitattributes",
  ".eslintrc",
  ".prettierrc",
]);

/**
 * Check whether a filename matches any ignore patterns.
 * @param {string} fileName
 * @returns {boolean}
 */
function shouldIgnoreFile(fileName) {
  return IGNORE_FILE_PATTERNS.some((regex) => regex.test(fileName));
}

/**
 * Determine whether a file should be treated as text or binary.
 * Priority: extension → binary check.
 * @param {string} filePath
 * @returns {Promise<"text" | "binary">}
 */
async function detectFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }

  // Unknown extension → binary check
  const isBinary = await isBinaryFile(filePath);
  return isBinary ? "binary" : "text";
}

/**
 * Lightweight binary detection: read the first N bytes and
 * look for null bytes.
 * @param {string} filePath
 * @returns {Promise<boolean>}
 */
async function isBinaryFile(filePath) {
  const MAX_BYTES = 8000;
  let handle;

  try {
    handle = await fs.open(filePath, "r");
    const buffer = globalThis.Buffer.alloc(MAX_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_BYTES, 0);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true; // Null byte → likely binary
      }
    }
    return false;
  } catch (error) {
    globalThis.console.warn(
      `⚠️  Error during binary check for ${filePath}: ${error.message}`,
    );
    // Fail-safe: treat as binary if unreadable
    return true;
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

/**
 * Recursively collect all relevant files in the project.
 * @param {string} dir
 * @returns {Promise<Array<{ path: string, type: "text" | "binary" }>>}
 */
async function getAllFiles(dir) {
  let result = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    globalThis.console.warn(
      `⚠️  Cannot read directory: ${dir} (${error.message})`,
    );
    return result;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Do not re-read the dump file itself
    if (path.resolve(fullPath) === path.resolve(OUTPUT_FILE)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name) || entry.name.startsWith("---")) {
        continue;
      }

      // Avoid following directory symlinks (cycle protection)
      if (entry.isSymbolicLink && entry.isSymbolicLink()) {
        continue;
      }

      const subFiles = await getAllFiles(fullPath);
      result = result.concat(subFiles);
    } else if (entry.isFile()) {
      if (shouldIgnoreFile(entry.name)) {
        continue;
      }

      const type = await detectFileType(fullPath);
      result.push({ path: fullPath, type });
    }
  }

  return result;
}

/**
 * Create the code dump.
 */
async function dumpCode() {
  try {
    globalThis.console.info("🔍 Collecting all relevant project files...");
    globalThis.console.info(`📁 Project root: ${PROJECT_ROOT}`);

    const files = await getAllFiles(PROJECT_ROOT);

    globalThis.console.info(`📄 Files found: ${files.length}`);

    let content = "";
    for (const file of files) {
      const relativePath = path.relative(PROJECT_ROOT, file.path);

      if (file.type === "binary") {
        // Only mark the file, do not include content
        content += `\n\n===BINARY_FILE:${relativePath}===\n[Binary file – content omitted]\n`;
        globalThis.console.info(`🚫 Binary file recorded: ${relativePath}`);
        continue;
      }

      // Dump text content
      try {
        const fileData = await fs.readFile(file.path, "utf-8");
        content += `\n\n===FILE:${relativePath}===\n${fileData}`;
      } catch (readError) {
        globalThis.console.warn(
          `⚠️  File skipped: ${relativePath} (Error: ${readError.message})`,
        );
      }
    }

    await fs.writeFile(OUTPUT_FILE, content, "utf-8");
    globalThis.console.info(`✅ Code dump completed: ${OUTPUT_FILE}`);
  } catch (error) {
    globalThis.console.error(
      "❌ Error while creating code dump:",
      error.message,
    );
    globalThis.process.exit(1);
  }
}

dumpCode();
