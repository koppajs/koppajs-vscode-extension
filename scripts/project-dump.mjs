#!/usr/bin/env node
/* global process, console, Buffer */
/**
 * High-End Project Dump & Analysis (Node >= 18) - v6
 *
 * Outputs to .local/ (max 10 files):
 * - project-structure.txt   (git ls-files if possible, else fs walk)
 * - project-dump.txt        (text file contents; binary/huge files noted)
 * - project-report.json     (machine report)
 * - project-manifest.json   (file list + size + sha1)
 * - dump-state.json         (state for delta comparison, only when delta mode used)
 * - project-insights.md     (consolidated: public-api, component-inventory, test-matrix,
 *                            lint-debt, import-graph, secrets-scan, delta summary)
 *
 * Removed in v6 (consolidated into project-insights.md):
 * - project-report.md, public-api.md, component-inventory.md, lint-debt.md,
 *   import-graph.md, test-matrix.md, secrets-scan.md, project-diff.md
 *
 * Features:
 * - Deterministic output: files are normalized, deduplicated, and sorted
 * - Timestamped filenames: set DUMP_TIMESTAMPED=1 env var for additional timestamped files
 * - Delta reports: compares current run to previous state
 * - Clean dist: set DUMP_CLEAN_DIST=1 to remove dist/ before dump
 * - ZIP artifact: set DUMP_CREATE_ZIP=1 to create a bundled ZIP of all outputs
 * - Output capped at 10 files maximum
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { zipSync, strToU8 } from 'fflate'

const execFileAsync = promisify(execFile)

// -------------------------
// Paths (computed early, needed for options defaults)
// -------------------------
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')

// =========================
// OPTIONS - Single Source of Truth
// =========================
/**
 * Centralized configuration object for the project dump script.
 *
 * Environment variable precedence (where applicable):
 * - Environment variables override the values defined here.
 * - Check inline comments for supported env vars.
 *
 * To customize behavior, modify values in this object or set the corresponding
 * environment variables before running the script.
 */
const options = {
  // -------------------------
  // Paths
  // -------------------------
  /** Root directory of the project (absolute path) */
  projectRoot: PROJECT_ROOT,

  /** Output directory name (relative to projectRoot) */
  outputDirName: '.local',

  /**
   * Explicit project name override.
   * If not set, name is resolved from package.json or folder name.
   */
  projectName: undefined,

  // -------------------------
  // Output filenames (base names without extension)
  // -------------------------
  filenames: {
    structure: 'project-structure',
    dump: 'project-dump',
    reportJson: 'project-report',
    manifestJson: 'project-manifest',
    stateJson: 'dump-state',
    insightsMd: 'project-insights',
    runManifestJson: 'manifest',
  },

  // -------------------------
  // Feature flags
  // -------------------------
  /**
   * Whether to write additional timestamped output files.
   * Env override: DUMP_TIMESTAMPED=1
   */
  useTimestampedOutput: process.env.DUMP_TIMESTAMPED === '1',

  /**
   * Whether to clean dist/ before dump.
   * Env override: DUMP_CLEAN_DIST=1
   */
  cleanDistBeforeDump: process.env.DUMP_CLEAN_DIST === '1',

  /**
   * Whether to create a ZIP artifact containing all dump outputs.
   * Env override: DUMP_CREATE_ZIP=1
   */
  createZipArtifact: process.env.DUMP_CREATE_ZIP === '1',

  /**
   * Output directory for ZIP artifacts (absolute path or relative to projectRoot).
   * Env override: DUMP_ZIP_OUTPUT_DIR
   * Defaults to the same directory as other outputs (.local/)
   */
  zipOutputDir: process.env.DUMP_ZIP_OUTPUT_DIR || undefined,

  /**
   * Whether to create a "latest" alias ZIP that mirrors the current run.
   * Creates/overwrites: dump-<projectName>-latest.zip
   * Env override: DUMP_CREATE_LATEST_ALIAS=1
   * Disabled by default.
   */
  createLatestAlias: process.env.DUMP_CREATE_LATEST_ALIAS === '1',

  /**
   * Whether to enable numeric snapshot folders for ZIP artifacts.
   * When enabled, each ZIP is placed in a new numbered subfolder (1, 2, 3, …).
   * Env override: DUMP_SNAPSHOT_ENABLED=1
   * Disabled by default.
   */
  snapshotEnabled: process.env.DUMP_SNAPSHOT_ENABLED === '1',

  /**
   * Base folder for snapshot storage (relative to projectRoot).
   * Env override: DUMP_SNAPSHOT_DIR
   * Defaults to 'src/.snapshot/'
   */
  snapshotDir: process.env.DUMP_SNAPSHOT_DIR || 'src/.snapshot',

  // -------------------------
  // Size limits (bytes)
  // -------------------------
  /** Max bytes per file included in project-dump.txt */
  maxTextBytesPerFileDump: 200_000,

  /** Max bytes per file for analysis heuristics */
  maxTextBytesPerFileAnalysis: 400_000,

  /** Soft cap for total dump size (20MB) */
  maxDumpTotalBytes: 20_000_000,

  /** Max bytes to sniff for binary detection */
  maxBinarySniffBytes: 8000,

  /** Max bytes for config file preview */
  configPreviewMaxBytes: 120_000,

  // -------------------------
  // Display limits
  // -------------------------
  /** Max items shown in top-N lists (lint debt, etc.) */
  topNLimit: 20,

  /** Max items shown in delta reports (added/removed/modified) */
  deltaMaxItems: 50,

  /** Max cycles shown in import graph */
  maxCyclesToShow: 20,

  /** Max violations shown in import graph */
  maxViolationsToShow: 50,

  /** Max secrets findings shown */
  maxSecretsFindingsToShow: 200,

  /** Max markers in analysis output */
  maxMarkersInOutput: 120,

  /** Max imports files to show */
  maxImportsFilesToShow: 20,

  /** Max largest files to show */
  maxLargestFilesToShow: 20,

  /** Max dependencies to show in package summary */
  maxDependenciesToShow: 120,

  // -------------------------
  // Excluded directories (names)
  // -------------------------
  /** Directory names to always exclude from dumps and scans */
  ignoreDirNames: [
    'node_modules',
    '.git',
    '.hg',
    '.svn',
    '.turbo',
    '.next',
    '.nuxt',
    '.svelte-kit',
    '.angular',
    'dist',
    'build',
    'out',
    'coverage',
    'storybook-static',
    'test-results',
    '.cache',
    '.parcel-cache',
    '.vite',
    '.husky',
    '.vercel',
    '.idea',
    '.vscode',
    'tmp',
    'temp',
    '.tmp',
    '.pnpm-store',
    '.snapshot',
  ],

  // -------------------------
  // File patterns
  // -------------------------
  /** File name patterns to ignore (regexes) */
  ignoreFilePatterns: [
    /\.log$/i,
    /\.tmp$/i,
    /\.temp$/i,
    /\.swp$/i,
    /~$/i,
    /\.bak$/i,
    /\.orig$/i,
    /\.DS_Store$/i,
    // do not re-include dump outputs
    /^---.*$/i,
    /^project-.*$/i,
  ],

  /** File patterns indicating secrets (regexes) - these files are NEVER included in dumps */
  secretFilePatterns: [
    // Environment files
    /^\.env$/i,
    /^\.env\./i,
    // Certificate and key files
    /\.pem$/i,
    /\.key$/i,
    /\.p12$/i,
    /\.pfx$/i,
    /^id_rsa$/i,
    /^id_rsa\./i,
    /^id_ed25519$/i,
    /^id_ed25519\./i,
    /^id_ecdsa$/i,
    /^id_dsa$/i,
    // Credential and token files
    /^credentials\./i,
    /^credentials$/i,
    /^token\./i,
    /^token$/i,
    /^tokens\./i,
    /^secrets\./i,
    /^secrets$/i,
    /^secret\./i,
    // Generic patterns
    /secret/i,
    /credential/i,
    /private[_-]?key/i,
  ],

  /** Config files to suppress preview for (just include sha1 and size) */
  configPreviewSuppress: ['pnpm-lock.yaml'],

  // -------------------------
  // Extensions
  // -------------------------
  /** Extensions recognized as text files */
  textExtensions: [
    '.js',
    '.cjs',
    '.mjs',
    '.ts',
    '.tsx',
    '.jsx',
    '.json',
    '.md',
    '.markdown',
    '.txt',
    '.html',
    '.htm',
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.yml',
    '.yaml',
    '.xml',
    '.svg',
    '.env',
    '.gitignore',
    '.gitattributes',
    '.eslintrc',
    '.prettierrc',
  ],

  /** Extensions recognized as code files (for code-only heuristics) */
  codeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],

  // -------------------------
  // Excluded patterns summary (for output headers)
  // -------------------------
  /** Human-readable summary of excluded patterns for transparency in output headers */
  excludedPatternsSummary: [
    'node_modules/',
    'dist/',
    'coverage/',
    'storybook-static/',
    'test-results/',
    '.git/',
    'build/',
    '*.log',
    '*.tmp',
    '.env*',
    '*.pem',
    '*.key',
    'id_rsa*',
    'credentials.*',
    'token.*',
    'secrets.*',
  ].join(', '),

  // -------------------------
  // Secret detection patterns (for secrets-scan)
  // -------------------------
  secretPatterns: [
    { label: 'API_KEY', rx: /\bAPI_KEY\s*[=:]/gi },
    { label: 'TOKEN', rx: /\bTOKEN\s*[=:]/gi },
    { label: 'SECRET', rx: /\bSECRET\s*[=:]/gi },
    { label: 'PASSWORD', rx: /\bPASSWORD\s*[=:]/gi },
    { label: 'PRIVATE_KEY_HEADER', rx: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi },
    { label: 'AUTH_BEARER', rx: /authorization\s*:\s*bearer/gi },
    { label: 'AWS_ACCESS_KEY', rx: /\bAWS_ACCESS_KEY_ID\s*[=:]/gi },
    { label: 'AWS_SECRET', rx: /\bAWS_SECRET_ACCESS_KEY\s*[=:]/gi },
    { label: 'GITHUB_TOKEN', rx: /\bGITHUB_TOKEN\s*[=:]/gi },
    { label: 'NPM_TOKEN', rx: /\bNPM_TOKEN\s*[=:]/gi },
    { label: 'AZURE_KEY', rx: /\bAZURE_\w*KEY\s*[=:]/gi },
    { label: 'CLIENT_SECRET', rx: /\bCLIENT_SECRET\s*[=:]/gi },
  ],

  // -------------------------
  // Config snapshot candidates (relative paths to check)
  // -------------------------
  configSnapshotCandidates: [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',

    'tsconfig.json',
    'tsconfig.base.json',
    'tsconfig.build.json',
    'config/tsconfig.json',
    'config/tsconfig.base.json',
    'config/tsconfig.build.json',
    'config/tsconfig.test.json',
    'config/tsconfig.types.json',

    'vite.config.ts',
    'vite.config.js',
    'vite.config.themes.ts',
    'vitest.config.ts',
    'vitest.config.js',
    'vitest.setup.ts',
    'jest.config.js',
    'eslint.config.js',
    'eslint.config.mjs',
    '.eslintrc',
    '.eslintrc.json',
    '.prettierrc',
    'prettier.config.js',
    'biome.json',
    'turbo.json',

    // Storybook configs
    '.storybook/main.ts',
    '.storybook/main.js',
    '.storybook/preview.ts',
    '.storybook/preview.js',
  ],

  // -------------------------
  // Utility functions (wired for external access)
  // -------------------------
  /** @type {typeof formatTimestamp} */
  formatTimestamp: null, // Wired after function definition

  /** @type {typeof buildDumpBaseName} */
  buildDumpBaseName: null, // Wired after function definition
}

// =========================
// Derived constants from options (for convenience)
// =========================
const OUT_DIR = path.join(options.projectRoot, options.outputDirName)

// Convert arrays to Sets for efficient lookups
const IGNORE_DIR_NAMES = new Set(options.ignoreDirNames)
const CONFIG_PREVIEW_SUPPRESS = new Set(options.configPreviewSuppress)
const TEXT_EXTENSIONS = new Set(options.textExtensions)
const CODE_EXTENSIONS = new Set(options.codeExtensions)

// Alias patterns arrays for direct usage
const IGNORE_FILE_PATTERNS = options.ignoreFilePatterns
const SECRET_FILE_PATTERNS = options.secretFilePatterns
const SECRET_PATTERNS = options.secretPatterns
const EXCLUDED_PATTERNS_SUMMARY = options.excludedPatternsSummary

// Alias size limits
const MAX_TEXT_BYTES_PER_FILE_DUMP = options.maxTextBytesPerFileDump
const MAX_TEXT_BYTES_PER_FILE_ANALYSIS = options.maxTextBytesPerFileAnalysis
const MAX_DUMP_TOTAL_BYTES = options.maxDumpTotalBytes
const MAX_BINARY_SNIFF_BYTES = options.maxBinarySniffBytes
const CONFIG_PREVIEW_MAX_BYTES = options.configPreviewMaxBytes

// Alias feature flags
const USE_TIMESTAMPED_OUTPUT = options.useTimestampedOutput
const CLEAN_DIST_BEFORE_DUMP = options.cleanDistBeforeDump
const CREATE_ZIP_ARTIFACT = options.createZipArtifact

// Compute ZIP output directory (resolve relative paths against projectRoot)
const ZIP_OUTPUT_DIR = options.zipOutputDir
  ? path.isAbsolute(options.zipOutputDir)
    ? options.zipOutputDir
    : path.join(options.projectRoot, options.zipOutputDir)
  : OUT_DIR

// Whether to create a "latest" alias ZIP
const CREATE_LATEST_ALIAS = options.createLatestAlias

// Snapshot feature flags and paths
const SNAPSHOT_ENABLED = options.snapshotEnabled
const SNAPSHOT_DIR = path.isAbsolute(options.snapshotDir)
  ? options.snapshotDir
  : path.join(options.projectRoot, options.snapshotDir)

// -------------------------
// Project Name Resolution
// -------------------------

/**
 * Sanitize a string for use as a filename.
 * - Removes npm scopes (e.g., "@scope/")
 * - Allows only [a-z0-9-]
 * - Converts other characters/spaces to "-"
 * - Collapses repeated "-"
 * - Trims leading/trailing "-"
 * - Lowercases output
 * @param {string} name - The raw name to sanitize
 * @returns {string} - The sanitized filename-safe string
 */
function sanitizeFileName(name) {
  if (!name || typeof name !== 'string') return ''
  return name
    .replace(/^@[^/]+\//, '') // Remove npm scope (e.g., "@scope/")
    .toLowerCase() // Lowercase first to simplify regex
    .replace(/[^a-z0-9-]/g, '-') // Replace disallowed chars with "-"
    .replace(/-+/g, '-') // Collapse repeated "-"
    .replace(/^-+|-+$/g, '') // Trim leading/trailing "-"
}

/**
 * Resolve the project name using the following priority:
 * 1. options.projectName (if explicitly set)
 * 2. package.json "name" field (if available)
 * 3. Folder name of the project root
 *
 * The result is sanitized for safe use in filenames.
 * @returns {Promise<string>} - The resolved and sanitized project name
 */
async function resolveProjectName() {
  // Priority 1: Explicit option
  if (options.projectName) {
    return sanitizeFileName(options.projectName)
  }

  // Priority 2: package.json name
  try {
    const pkgPath = path.join(options.projectRoot, 'package.json')
    const pkgContent = await fs.readFile(pkgPath, 'utf8')
    const pkg = JSON.parse(pkgContent)
    if (pkg.name && typeof pkg.name === 'string') {
      return sanitizeFileName(pkg.name)
    }
  } catch {
    // package.json not found or invalid, fall through
  }

  // Priority 3: Folder name
  const folderName = path.basename(options.projectRoot)
  return sanitizeFileName(folderName)
}

/** Resolved project name (populated during main execution) */
let resolvedProjectName = ''

/**
 * Generate a filesystem-safe ISO timestamp (colons replaced with dashes).
 */
function safeTimestamp() {
  return new Date().toISOString().replace(/:/g, '-')
}

/** Cached timestamp for this run */
let runTimestamp = null
function getRunTimestamp() {
  if (!runTimestamp) runTimestamp = safeTimestamp()
  return runTimestamp
}

/**
 * Format a timestamp as "YYYY-MM-DD_HH-mm" using local time.
 * @param {Date} [date=new Date()] - Date to format (defaults to now)
 * @returns {string} Formatted timestamp string
 */
function formatTimestamp(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}_${hours}-${minutes}`
}

/**
 * Build a standardized dump base name.
 * @param {Object} params
 * @param {string} params.projectName - Name of the project
 * @param {string} params.timestamp - Timestamp string (e.g., from formatTimestamp())
 * @returns {string} Formatted dump base name: "dump-<projectName>-<timestamp>"
 */
function buildDumpBaseName({ projectName, timestamp }) {
  return `dump-${projectName}-${timestamp}`
}

// Wire utility functions into options for external access
options.formatTimestamp = formatTimestamp
options.buildDumpBaseName = buildDumpBaseName

/**
 * Determine the next numeric snapshot folder.
 * Scans the snapshot directory for existing numeric folders (1, 2, 3, …)
 * and returns the next available number.
 *
 * @returns {Promise<number>} The next snapshot folder number (starts at 1)
 */
async function getNextSnapshotNumber() {
  try {
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true })
    const entries = await fs.readdir(SNAPSHOT_DIR, { withFileTypes: true })

    let maxNumber = 0
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      // Only consider purely numeric folder names
      const parsed = parseInt(entry.name, 10)
      if (!Number.isNaN(parsed) && String(parsed) === entry.name && parsed > maxNumber) {
        maxNumber = parsed
      }
    }

    return maxNumber + 1
  } catch {
    // If directory doesn't exist or can't be read, start at 1
    return 1
  }
}

/**
 * Ensure the snapshot directory has a .gitignore file to exclude contents.
 * Creates the file if it doesn't exist.
 *
 * @returns {Promise<void>}
 */
async function ensureSnapshotGitignore() {
  const gitignorePath = path.join(SNAPSHOT_DIR, '.gitignore')
  const gitignoreContent = `# Ignore all snapshot contents (auto-generated by project-dump)
*
!.gitignore
`

  try {
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true })
    // Only write if file doesn't exist
    try {
      await fs.access(gitignorePath)
    } catch {
      await fs.writeFile(gitignorePath, gitignoreContent, 'utf8')
    }
  } catch (e) {
    console.warn(`⚠️  Could not create snapshot .gitignore: ${e.message}`)
  }
}

/**
 * Build output filename, optionally with timestamp suffix.
 * @param {string} base - Base name without extension (e.g. "project-dump")
 * @param {string} ext - Extension including dot (e.g. ".txt")
 * @param {boolean} [forceTimestamp=false] - Force timestamped version
 * @returns {string}
 */
function outPath(base, ext, forceTimestamp = false) {
  const suffix = forceTimestamp ? `.${getRunTimestamp()}` : ''
  return path.join(OUT_DIR, `${base}${suffix}${ext}`)
}

// Primary output paths (no timestamp) - using options.filenames
const OUT_STRUCTURE = outPath(options.filenames.structure, '.txt')
const OUT_DUMP = outPath(options.filenames.dump, '.txt')
const OUT_REPORT_JSON = outPath(options.filenames.reportJson, '.json')
const OUT_MANIFEST_JSON = outPath(options.filenames.manifestJson, '.json')
const OUT_STATE_JSON = outPath(options.filenames.stateJson, '.json')
const OUT_INSIGHTS_MD = outPath(options.filenames.insightsMd, '.md')
const OUT_RUN_MANIFEST_JSON = outPath(options.filenames.runManifestJson, '.json')

// Heuristic patterns (code-only) - these are not configurable
const RX_TODO = /\b(TODO|FIXME|HACK)\b/g
const RX_TS_IGNORE = /@ts-ignore|@ts-expect-error/g
const RX_ANY = /\bany\b|as\s+any\b/g
const RX_ESLINT_DISABLE = /eslint-disable/g

const RX_IMPORT = /^\s*import\s+.*from\s+['"][^'"]+['"]\s*;?/gm
const RX_EXPORT = /^\s*export\s+/gm
const RX_REQUIRE = /\brequire\s*\(\s*['"][^'"]+['"]\s*\)/g

const RX_FUNCTION = /\bfunction\b|\b\w+\s*=\s*\(?[^=]*\)?\s*=>|\b\w+\s*\([^=]*\)\s*{/g
const RX_CLASS = /\bclass\s+\w+/g

// -------------------------
// Utils
// -------------------------
function nowISO() {
  return new Date().toISOString()
}

/**
 * Format bytes as human-readable string (KB, MB, GB).
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

/**
 * Convert an absolute path to a normalized posix-style relative path.
 * @param {string} p - Absolute path
 * @returns {string} Relative posix-style path
 */
function rel(p) {
  return path.relative(PROJECT_ROOT, p).replace(/\\/g, '/')
}

function extOf(p) {
  return path.extname(p).toLowerCase() || '(none)'
}

function isCodeFile(absPath) {
  return CODE_EXTENSIONS.has(path.extname(absPath).toLowerCase())
}

function shouldIgnoreFileName(fileName) {
  return IGNORE_FILE_PATTERNS.some((r) => r.test(fileName))
}

function isSecretPath(filePath) {
  const name = path.basename(filePath)
  return SECRET_FILE_PATTERNS.some((r) => r.test(name))
}

async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function safeReadText(filePath, maxBytes) {
  const buf = await fs.readFile(filePath)
  const sliced = buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf
  return {
    text: sliced.toString('utf8'),
    truncated: buf.length > maxBytes,
    bytes: buf.length,
  }
}

async function sha1File(filePath) {
  const buf = await fs.readFile(filePath)
  return createHash('sha1').update(buf).digest('hex')
}

async function readJsonIfExists(p) {
  if (!(await pathExists(p))) return null
  try {
    const txt = await fs.readFile(p, 'utf8')
    return JSON.parse(txt)
  } catch {
    return null
  }
}

/**
 * Write a file and optionally a timestamped copy.
 * @param {string} filePath - Primary output path
 * @param {string} content - File content
 * @param {boolean} [skipTimestamp=false] - Skip creating timestamped copy even if enabled
 */
async function writeOutputFile(filePath, content, skipTimestamp = false) {
  await fs.writeFile(filePath, content, 'utf8')
  if (USE_TIMESTAMPED_OUTPUT && !skipTimestamp) {
    const ext = path.extname(filePath)
    const base = path.basename(filePath, ext)
    const tsPath = outPath(base, ext, true)
    await fs.writeFile(tsPath, content, 'utf8')
  }
}

async function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (TEXT_EXTENSIONS.has(ext)) return false

  let handle
  try {
    handle = await fs.open(filePath, 'r')
    const buffer = Buffer.alloc(MAX_BINARY_SNIFF_BYTES)
    const { bytesRead } = await handle.read(buffer, 0, MAX_BINARY_SNIFF_BYTES, 0)
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true
    }
    return false
  } catch {
    return true
  } finally {
    if (handle) await handle.close()
  }
}

function summarizePackageJson(pkg) {
  if (!pkg) return null
  const deps = Object.keys(pkg.dependencies ?? {})
  const devDeps = Object.keys(pkg.devDependencies ?? {})
  const peerDeps = Object.keys(pkg.peerDependencies ?? {})
  return {
    name: pkg.name ?? null,
    version: pkg.version ?? null,
    type: pkg.type ?? null,
    private: !!pkg.private,
    packageManager: pkg.packageManager ?? null,
    engines: pkg.engines ?? null,
    main: pkg.main ?? null,
    module: pkg.module ?? null,
    types: pkg.types ?? null,
    exports: pkg.exports ?? null,
    scripts: pkg.scripts ?? {},
    dependencyCounts: {
      dependencies: deps.length,
      devDependencies: devDeps.length,
      peerDependencies: peerDeps.length,
    },
    dependencies: deps.sort().slice(0, options.maxDependenciesToShow),
    devDependencies: devDeps.sort().slice(0, options.maxDependenciesToShow),
    peerDependencies: peerDeps.sort().slice(0, options.maxDependenciesToShow),
  }
}

// -------------------------
// Git file discovery
// -------------------------
async function tryGitLsFiles() {
  try {
    const { stdout } = await execFileAsync('git', ['ls-files'], {
      cwd: PROJECT_ROOT,
    })
    const files = stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((p) => path.join(PROJECT_ROOT, p))
    return files
  } catch {
    return null
  }
}

// -------------------------
// FS walk discovery (fallback)
// -------------------------
async function walkFs(dir) {
  let result = []
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return result
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // exclude output dir itself
    if (path.resolve(fullPath) === path.resolve(OUT_DIR)) continue

    if (entry.isDirectory()) {
      if (IGNORE_DIR_NAMES.has(entry.name) || entry.name.startsWith('---')) continue
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue
      result = result.concat(await walkFs(fullPath))
    } else if (entry.isFile()) {
      if (shouldIgnoreFileName(entry.name)) continue
      if (isSecretPath(fullPath)) continue
      result.push(fullPath)
    }
  }
  return result
}

async function gatherAllFiles() {
  const gitFiles = await tryGitLsFiles()
  let rawFiles
  let mode

  if (gitFiles && gitFiles.length) {
    const filtered = []
    for (const abs of gitFiles) {
      const r = rel(abs)
      const parts = r.split('/')
      if (parts.some((p) => IGNORE_DIR_NAMES.has(p))) continue
      if (path.basename(abs).startsWith('---')) continue
      if (shouldIgnoreFileName(path.basename(abs))) continue
      if (isSecretPath(abs)) continue
      filtered.push(abs)
    }
    rawFiles = filtered
    mode = 'git'
  } else {
    rawFiles = await walkFs(PROJECT_ROOT)
    mode = 'fs'
  }

  // --- Normalize, deduplicate, and sort for deterministic output ---
  const seenPaths = new Set()
  const uniqueFiles = []
  let duplicatesRemoved = 0

  for (const abs of rawFiles) {
    const normalized = rel(abs)
    if (seenPaths.has(normalized)) {
      duplicatesRemoved++
      continue
    }
    seenPaths.add(normalized)
    uniqueFiles.push(abs)
  }

  // Sort by normalized relative path for stable, deterministic order
  uniqueFiles.sort((a, b) => rel(a).localeCompare(rel(b)))

  return { mode, files: uniqueFiles, duplicatesRemoved }
}

// -------------------------
// TSConfig discovery
// -------------------------
async function discoverTsconfigs(structureFilesAbs) {
  const candidates = []
  for (const abs of structureFilesAbs) {
    const r = rel(abs)
    const base = path.basename(r).toLowerCase()
    if (!base.startsWith('tsconfig') || !base.endsWith('.json')) continue

    const isRoot = r === 'tsconfig.json'
    const isConfigDir = r.startsWith('config/') && r.endsWith('.json')
    const isPackages = r.startsWith('packages/') && r.split('/').length >= 3

    if (isRoot || isConfigDir || isPackages) candidates.push(abs)
  }

  candidates.sort((a, b) => rel(a).localeCompare(rel(b)))

  const summaries = []
  for (const abs of candidates) {
    const json = await readJsonIfExists(abs)
    if (!json) continue
    summaries.push(summarizeTsconfig(json, rel(abs)))
  }

  return { files: candidates.map(rel), summaries }
}

function summarizeTsconfig(tsc, sourcePath) {
  const c = tsc.compilerOptions ?? {}
  return {
    source: sourcePath,
    extends: tsc.extends ?? null,
    compilerOptions: {
      target: c.target ?? null,
      module: c.module ?? null,
      moduleResolution: c.moduleResolution ?? null,
      lib: c.lib ?? null,
      jsx: c.jsx ?? null,
      strict: c.strict ?? null,
      noImplicitAny: c.noImplicitAny ?? null,
      skipLibCheck: c.skipLibCheck ?? null,
      declaration: c.declaration ?? null,
      emitDeclarationOnly: c.emitDeclarationOnly ?? null,
      outDir: c.outDir ?? null,
      rootDir: c.rootDir ?? null,
      baseUrl: c.baseUrl ?? null,
      paths: c.paths ?? null,
      types: c.types ?? null,
    },
    include: tsc.include ?? null,
    exclude: tsc.exclude ?? null,
  }
}

// -------------------------
// Config snapshots
// -------------------------
async function collectConfigSnapshots() {
  const candidates = options.configSnapshotCandidates

  const snapshots = []
  for (const relPath of candidates) {
    const abs = path.join(PROJECT_ROOT, relPath)
    if (!(await pathExists(abs))) continue

    const st = await fs.stat(abs)
    const sha1 = await sha1File(abs)

    if (CONFIG_PREVIEW_SUPPRESS.has(path.basename(relPath))) {
      snapshots.push({
        file: relPath,
        sha1,
        bytes: st.size,
        previewSuppressed: true,
        truncated: null,
        preview: null,
      })
      continue
    }

    const { text, truncated } = await safeReadText(abs, CONFIG_PREVIEW_MAX_BYTES)
    snapshots.push({
      file: relPath,
      sha1,
      bytes: st.size,
      previewSuppressed: false,
      truncated,
      preview: text,
    })
  }

  return snapshots
}

// -------------------------
// Delta state management (B)
// -------------------------
async function loadPreviousState() {
  return readJsonIfExists(OUT_STATE_JSON)
}

async function saveDumpState(fileMetas, generatedAt) {
  const state = {
    generatedAt,
    files: {},
  }
  for (const f of fileMetas) {
    state.files[f.path] = {
      sha1: f.sha1,
      size: f.size,
    }
  }
  // Skip timestamping for state file (internal use only, not user-facing)
  await writeOutputFile(OUT_STATE_JSON, JSON.stringify(state, null, 2), true)
  return state
}

/**
 * Generate delta report content (returns string, does not write file).
 * @param {object|null} prevState - Previous state object
 * @param {object} currentState - Current state object
 * @returns {Promise<{content: string, stats: {added: number, removed: number, modified: number}}|null>}
 */
async function generateDeltaContent(prevState, currentState) {
  if (!prevState) return null

  const prevFiles = prevState.files ?? {}
  const currFiles = currentState.files ?? {}

  const prevPaths = new Set(Object.keys(prevFiles))
  const currPaths = new Set(Object.keys(currFiles))

  const added = [...currPaths].filter((p) => !prevPaths.has(p)).sort()
  const removed = [...prevPaths].filter((p) => !currPaths.has(p)).sort()
  const modified = []

  for (const p of currPaths) {
    if (!prevPaths.has(p)) continue
    const prev = prevFiles[p]
    const curr = currFiles[p]
    if (prev.sha1 !== curr.sha1) {
      modified.push({
        path: p,
        prevSize: prev.size,
        currSize: curr.size,
        prevSha1: prev.sha1,
        currSha1: curr.sha1,
      })
    }
  }
  modified.sort((a, b) => a.path.localeCompare(b.path))

  const maxItems = options.deltaMaxItems
  const lines = []
  lines.push(`- Previous run: **${prevState.generatedAt}**`)
  lines.push(`- Current run: **${currentState.generatedAt}**`)
  lines.push('')
  lines.push('### Summary')
  lines.push(`- Added: **${added.length}**`)
  lines.push(`- Removed: **${removed.length}**`)
  lines.push(`- Modified: **${modified.length}**`)
  lines.push('')

  if (added.length) {
    lines.push('### Added Files')
    lines.push(`(showing up to ${maxItems})`)
    lines.push('')
    for (const p of added.slice(0, maxItems)) {
      lines.push(`- \`${p}\``)
    }
    if (added.length > maxItems) {
      lines.push(`- ... and ${added.length - maxItems} more`)
    }
    lines.push('')
  }

  if (removed.length) {
    lines.push('### Removed Files')
    lines.push(`(showing up to ${maxItems})`)
    lines.push('')
    for (const p of removed.slice(0, maxItems)) {
      lines.push(`- \`${p}\``)
    }
    if (removed.length > maxItems) {
      lines.push(`- ... and ${removed.length - maxItems} more`)
    }
    lines.push('')
  }

  if (modified.length) {
    lines.push('### Modified Files')
    lines.push(`(showing up to ${maxItems})`)
    lines.push('')
    lines.push('| File | Prev Size | Curr Size | Prev SHA1 | Curr SHA1 |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const m of modified.slice(0, maxItems)) {
      lines.push(
        `| \`${m.path}\` | ${m.prevSize} | ${m.currSize} | \`${m.prevSha1.slice(0, 8)}\` | \`${m.currSha1.slice(0, 8)}\` |`,
      )
    }
    if (modified.length > maxItems) {
      lines.push(`| ... | ${modified.length - maxItems} more | | | |`)
    }
    lines.push('')
  }

  return {
    content: lines.join('\n'),
    stats: { added: added.length, removed: removed.length, modified: modified.length },
  }
}

// -------------------------
// Public API snapshot (C) - returns content string
// -------------------------
async function generatePublicApiContent() {
  const entryFiles = []
  const srcDir = path.join(PROJECT_ROOT, 'src')

  // Collect all index.ts files
  async function findIndexFiles(dir, prefix = '') {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(e.name)) continue
        await findIndexFiles(path.join(dir, e.name), `${prefix}${e.name}/`)
      } else if (e.isFile() && e.name === 'index.ts') {
        entryFiles.push({
          relPath: `src/${prefix}index.ts`,
          absPath: path.join(dir, e.name),
        })
      }
    }
  }

  await findIndexFiles(srcDir)
  entryFiles.sort((a, b) => a.relPath.localeCompare(b.relPath))

  const lines = []
  lines.push(`- Entry files scanned: **${entryFiles.length}**`)
  lines.push('')

  // Regex patterns to extract exports
  const rxNamedExport =
    /export\s+(?:const|let|var|function|class|type|interface|enum)\s+(\w+)/g
  const rxExportFrom = /export\s+\{([^}]+)\}\s+from/g
  const rxExportAll = /export\s+\*\s+from\s+['"]([^'"]+)['"]/g
  const rxExportDefault = /export\s+default\s+(?:class|function)?\s*(\w+)?/g
  const rxTypeExport = /export\s+type\s+\{([^}]+)\}/g

  for (const entry of entryFiles) {
    lines.push(`### \`${entry.relPath}\``)
    lines.push('')

    let text
    try {
      const { text: t } = await safeReadText(entry.absPath, 100_000)
      text = t
    } catch {
      lines.push('*Could not read file*')
      lines.push('')
      continue
    }

    const namedExports = []
    const reExports = []
    const wildcardExports = []
    const typeExports = []
    let defaultExport = null

    // Named exports (const, function, class, type, interface, enum)
    let match
    while ((match = rxNamedExport.exec(text)) !== null) {
      namedExports.push(match[1])
    }
    rxNamedExport.lastIndex = 0

    // Re-exports: export { X, Y } from '...'
    while ((match = rxExportFrom.exec(text)) !== null) {
      const items = match[1]
        .split(',')
        .map((s) =>
          s
            .trim()
            .split(/\s+as\s+/)[0]
            .trim(),
        )
        .filter(Boolean)
      reExports.push(...items)
    }
    rxExportFrom.lastIndex = 0

    // Wildcard: export * from '...'
    while ((match = rxExportAll.exec(text)) !== null) {
      wildcardExports.push(match[1])
    }
    rxExportAll.lastIndex = 0

    // Default export
    while ((match = rxExportDefault.exec(text)) !== null) {
      defaultExport = match[1] || '(anonymous)'
    }
    rxExportDefault.lastIndex = 0

    // Type exports: export type { ... }
    while ((match = rxTypeExport.exec(text)) !== null) {
      const items = match[1]
        .split(',')
        .map((s) =>
          s
            .trim()
            .split(/\s+as\s+/)[0]
            .trim(),
        )
        .filter(Boolean)
      typeExports.push(...items)
    }
    rxTypeExport.lastIndex = 0

    // Deduplicate and sort
    const uniqNamed = [...new Set(namedExports)].sort()
    const uniqReExports = [...new Set(reExports)].sort()
    const uniqWildcards = [...new Set(wildcardExports)].sort()
    const uniqTypes = [...new Set(typeExports)].sort()

    if (defaultExport) {
      lines.push(`**Default export:** \`${defaultExport}\``)
      lines.push('')
    }

    if (uniqNamed.length) {
      lines.push('**Named exports:**')
      for (const n of uniqNamed) lines.push(`- \`${n}\``)
      lines.push('')
    }

    if (uniqReExports.length) {
      lines.push('**Re-exports:**')
      for (const n of uniqReExports) lines.push(`- \`${n}\``)
      lines.push('')
    }

    if (uniqTypes.length) {
      lines.push('**Type exports:**')
      for (const n of uniqTypes) lines.push(`- \`${n}\``)
      lines.push('')
    }

    if (uniqWildcards.length) {
      lines.push('**Wildcard re-exports from:**')
      for (const n of uniqWildcards) lines.push(`- \`${n}\``)
      lines.push('')
    }

    if (
      !defaultExport &&
      !uniqNamed.length &&
      !uniqReExports.length &&
      !uniqWildcards.length &&
      !uniqTypes.length
    ) {
      lines.push('*No exports found*')
      lines.push('')
    }
  }

  return { content: lines.join('\n'), entryCount: entryFiles.length }
}

// -------------------------
// Component Inventory (D) - returns content string
// -------------------------
async function generateComponentInventoryContent() {
  const componentsDir = path.join(PROJECT_ROOT, 'src', 'components')
  let componentFolders
  try {
    const entries = await fs.readdir(componentsDir, { withFileTypes: true })
    componentFolders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    componentFolders = []
  }

  const lines = []
  lines.push(`- Components found: **${componentFolders.length}**`)
  lines.push('')

  for (const compName of componentFolders) {
    const compDir = path.join(componentsDir, compName)
    lines.push(`### ${compName}`)
    lines.push('')

    // Check for presence of files
    const vueFile = path.join(compDir, `${compName}.vue`)
    const typesFile = path.join(compDir, `${compName}.types.ts`)
    const indexFile = path.join(compDir, 'index.ts')

    const hasVue = await pathExists(vueFile)
    const hasTypes = await pathExists(typesFile)
    const hasIndex = await pathExists(indexFile)

    lines.push(`- Vue component: ${hasVue ? '✅' : '❌'}`)
    lines.push(`- Types file: ${hasTypes ? '✅' : '❌'}`)
    lines.push(`- Index export: ${hasIndex ? '✅' : '❌'}`)
    lines.push('')

    if (hasTypes) {
      try {
        const { text } = await safeReadText(typesFile, 50_000)

        // Extract Props interface
        const propsMatch = text.match(/interface\s+(\w*Props)\s*\{([^}]+)\}/s)
        if (propsMatch) {
          const propsName = propsMatch[1]
          const propsBody = propsMatch[2]
          const propsKeys = []
          const propLines = propsBody.split('\n')
          for (const line of propLines) {
            const keyMatch = line.match(/^\s*(\w+)\??:/)
            if (keyMatch) propsKeys.push(keyMatch[1])
          }
          lines.push(
            `**Props (${propsName}):** ${propsKeys.length > 0 ? propsKeys.map((k) => `\`${k}\``).join(', ') : '*none*'}`,
          )
          lines.push('')
        }

        // Extract Emits type
        const emitsMatch = text.match(/type\s+(\w*Emits)\s*=\s*\{([^}]+)\}/s)
        if (emitsMatch) {
          const emitsName = emitsMatch[1]
          const emitsBody = emitsMatch[2]
          const emitKeys = []
          const emitLines = emitsBody.split('\n')
          for (const line of emitLines) {
            const keyMatch = line.match(/['"]?([\w:]+)['"]?\s*:/)
            if (keyMatch) emitKeys.push(keyMatch[1])
          }
          lines.push(
            `**Emits (${emitsName}):** ${emitKeys.length > 0 ? emitKeys.map((k) => `\`${k}\``).join(', ') : '*none*'}`,
          )
          lines.push('')
        }

        // Extract Slots type (if any)
        const slotsMatch = text.match(/interface\s+(\w*Slots)\s*\{([^}]+)\}/s)
        if (slotsMatch) {
          const slotsName = slotsMatch[1]
          const slotsBody = slotsMatch[2]
          const slotKeys = []
          const slotLines = slotsBody.split('\n')
          for (const line of slotLines) {
            const keyMatch = line.match(/^\s*(\w+)\s*\??:/)
            if (keyMatch) slotKeys.push(keyMatch[1])
          }
          lines.push(
            `**Slots (${slotsName}):** ${slotKeys.length > 0 ? slotKeys.map((k) => `\`${k}\``).join(', ') : '*none*'}`,
          )
          lines.push('')
        }
      } catch {
        lines.push('*Could not parse types file*')
        lines.push('')
      }
    }
  }

  return { content: lines.join('\n'), componentCount: componentFolders.length }
}

// -------------------------
// Lint Debt Report (E) - returns content string
// -------------------------
async function generateLintDebtContent(fileMetas, prevState) {
  const debtByFile = new Map()
  const debtTotals = {
    eslintDisable: 0,
    tsIgnore: 0,
    anyUsage: 0,
    todoFixmeHack: 0,
  }

  // Regex patterns (more refined)
  const rxEslintDisable = /eslint-disable(?:-next-line)?/g
  const rxTsIgnore = /@ts-ignore|@ts-expect-error/g
  const rxAny = /:\s*any\b|as\s+any\b|<any>|Record<string,\s*any>/g
  const rxTodo = /\b(TODO|FIXME|HACK)\b/g

  for (const f of fileMetas) {
    if (f.binary) continue
    if (!isCodeFile(path.join(PROJECT_ROOT, f.path))) continue

    const abs = path.join(PROJECT_ROOT, f.path)
    let text
    try {
      const { text: t } = await safeReadText(abs, MAX_TEXT_BYTES_PER_FILE_ANALYSIS)
      text = t
    } catch {
      continue
    }

    // Remove string literals and comments for "any" detection to reduce false positives
    const textNoStrings = text.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, '""')
    const textNoComments = textNoStrings
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')

    const eslintCount = (text.match(rxEslintDisable) || []).length
    const tsIgnoreCount = (text.match(rxTsIgnore) || []).length
    const anyCount = (textNoComments.match(rxAny) || []).length
    const todoCount = (text.match(rxTodo) || []).length

    if (eslintCount || tsIgnoreCount || anyCount || todoCount) {
      debtByFile.set(f.path, {
        eslintDisable: eslintCount,
        tsIgnore: tsIgnoreCount,
        anyUsage: anyCount,
        todoFixmeHack: todoCount,
      })
      debtTotals.eslintDisable += eslintCount
      debtTotals.tsIgnore += tsIgnoreCount
      debtTotals.anyUsage += anyCount
      debtTotals.todoFixmeHack += todoCount
    }
  }

  // Sort files by total debt
  const sortedFiles = [...debtByFile.entries()]
    .map(([filePath, counts]) => ({
      path: filePath,
      ...counts,
      total:
        counts.eslintDisable + counts.tsIgnore + counts.anyUsage + counts.todoFixmeHack,
    }))
    .sort((a, b) => b.total - a.total)

  const lines = []
  lines.push(`- Files with debt: **${sortedFiles.length}**`)
  lines.push('')

  lines.push('### Summary')
  lines.push(`- eslint-disable markers: **${debtTotals.eslintDisable}**`)
  lines.push(`- ts-ignore/ts-expect-error: **${debtTotals.tsIgnore}**`)
  lines.push(`- any usage (heuristic): **${debtTotals.anyUsage}**`)
  lines.push(`- TODO/FIXME/HACK: **${debtTotals.todoFixmeHack}**`)
  lines.push('')

  // Top N for each category
  const topN = options.topNLimit

  lines.push('### Top 20 by eslint-disable')
  const topEslint = [...sortedFiles]
    .sort((a, b) => b.eslintDisable - a.eslintDisable)
    .slice(0, topN)
  if (topEslint.length && topEslint[0].eslintDisable > 0) {
    for (const f of topEslint) {
      if (f.eslintDisable === 0) break
      lines.push(`- \`${f.path}\`: ${f.eslintDisable}`)
    }
  } else {
    lines.push('*None*')
  }
  lines.push('')

  lines.push('### Top 20 by ts-ignore')
  const topTsIgnore = [...sortedFiles]
    .sort((a, b) => b.tsIgnore - a.tsIgnore)
    .slice(0, topN)
  if (topTsIgnore.length && topTsIgnore[0].tsIgnore > 0) {
    for (const f of topTsIgnore) {
      if (f.tsIgnore === 0) break
      lines.push(`- \`${f.path}\`: ${f.tsIgnore}`)
    }
  } else {
    lines.push('*None*')
  }
  lines.push('')

  lines.push('### Top 20 by any usage')
  const topAny = [...sortedFiles].sort((a, b) => b.anyUsage - a.anyUsage).slice(0, topN)
  if (topAny.length && topAny[0].anyUsage > 0) {
    for (const f of topAny) {
      if (f.anyUsage === 0) break
      lines.push(`- \`${f.path}\`: ${f.anyUsage}`)
    }
  } else {
    lines.push('*None*')
  }
  lines.push('')

  lines.push('### Top 20 by TODO/FIXME/HACK')
  const topTodo = [...sortedFiles]
    .sort((a, b) => b.todoFixmeHack - a.todoFixmeHack)
    .slice(0, topN)
  if (topTodo.length && topTodo[0].todoFixmeHack > 0) {
    for (const f of topTodo) {
      if (f.todoFixmeHack === 0) break
      lines.push(`- \`${f.path}\`: ${f.todoFixmeHack}`)
    }
  } else {
    lines.push('*None*')
  }
  lines.push('')

  // Delta comparison if previous state exists
  if (prevState?.lintDebt) {
    lines.push('### Changes Since Last Run')
    const prevDebt = prevState.lintDebt
    const diff = {
      eslintDisable: debtTotals.eslintDisable - (prevDebt.eslintDisable || 0),
      tsIgnore: debtTotals.tsIgnore - (prevDebt.tsIgnore || 0),
      anyUsage: debtTotals.anyUsage - (prevDebt.anyUsage || 0),
      todoFixmeHack: debtTotals.todoFixmeHack - (prevDebt.todoFixmeHack || 0),
    }
    const formatDiff = (n) => (n > 0 ? `+${n}` : n === 0 ? '0' : String(n))
    lines.push(`- eslint-disable: **${formatDiff(diff.eslintDisable)}**`)
    lines.push(`- ts-ignore: **${formatDiff(diff.tsIgnore)}**`)
    lines.push(`- any usage: **${formatDiff(diff.anyUsage)}**`)
    lines.push(`- TODO/FIXME/HACK: **${formatDiff(diff.todoFixmeHack)}**`)
    lines.push('')
  }

  return { content: lines.join('\n'), totals: debtTotals }
}

// -------------------------
// Import Graph & Cycles (F) - returns content string
// -------------------------
async function generateImportGraphContent(fileMetas) {
  // Build import graph for .ts files in src/
  const graph = new Map() // file -> Set of imported files
  const srcPrefix = 'src/'

  for (const f of fileMetas) {
    if (f.binary) continue
    if (!f.path.startsWith(srcPrefix)) continue
    if (!f.path.endsWith('.ts') && !f.path.endsWith('.tsx')) continue

    const abs = path.join(PROJECT_ROOT, f.path)
    let text
    try {
      const { text: t } = await safeReadText(abs, 100_000)
      text = t
    } catch {
      continue
    }

    const imports = new Set()
    const rxImport = /import\s+(?:[\w{}\s,*]+)\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = rxImport.exec(text)) !== null) {
      const specifier = match[1]
      // Only handle relative imports
      if (specifier.startsWith('.')) {
        const fileDir = path.dirname(f.path)
        let resolved = path.posix.join(fileDir, specifier)
        // Normalize to .ts if no extension
        if (
          !resolved.endsWith('.ts') &&
          !resolved.endsWith('.tsx') &&
          !resolved.endsWith('.vue')
        ) {
          // Try index.ts or direct .ts
          resolved = resolved + '.ts'
        }
        // Normalize path separators
        resolved = resolved.replace(/\\/g, '/')
        imports.add(resolved)
      }
    }

    graph.set(f.path, imports)
  }

  // Detect cycles using DFS
  const cycles = []
  const visited = new Set()
  const recStack = new Set()
  const pathStack = []

  function dfs(node) {
    visited.add(node)
    recStack.add(node)
    pathStack.push(node)

    const neighbors = graph.get(node) || new Set()
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && graph.has(neighbor)) {
        dfs(neighbor)
      } else if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStart = pathStack.indexOf(neighbor)
        if (cycleStart !== -1) {
          const cycle = pathStack.slice(cycleStart).concat(neighbor)
          cycles.push(cycle)
        }
      }
    }

    pathStack.pop()
    recStack.delete(node)
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  // Layering violations
  const violations = []

  for (const [file, imports] of graph.entries()) {
    for (const imp of imports) {
      // stories should not be imported by components or utils
      if (
        (file.startsWith('src/components/') || file.startsWith('src/utils/')) &&
        imp.startsWith('src/stories/')
      ) {
        violations.push({
          type: 'components/utils importing stories',
          importer: file,
          imported: imp,
        })
      }
      // components should not import from stories
      if (file.startsWith('src/components/') && imp.startsWith('src/stories/')) {
        violations.push({
          type: 'components importing stories',
          importer: file,
          imported: imp,
        })
      }
    }
  }

  // Deduplicate violations
  const seenViolations = new Set()
  const uniqueViolations = violations.filter((v) => {
    const key = `${v.importer}|${v.imported}`
    if (seenViolations.has(key)) return false
    seenViolations.add(key)
    return true
  })

  const lines = []
  lines.push(`- Files in graph: **${graph.size}**`)
  lines.push(`- Cycles detected: **${cycles.length}**`)
  lines.push(`- Layering violations: **${uniqueViolations.length}**`)
  lines.push('')

  if (cycles.length) {
    lines.push('### Circular Dependencies')
    lines.push('')
    const maxCycles = options.maxCyclesToShow
    for (let i = 0; i < Math.min(cycles.length, maxCycles); i++) {
      lines.push(`${i + 1}. ${cycles[i].map((c) => `\`${c}\``).join(' → ')}`)
    }
    if (cycles.length > maxCycles) {
      lines.push(`... and ${cycles.length - maxCycles} more`)
    }
    lines.push('')
  } else {
    lines.push('### Circular Dependencies')
    lines.push('*No cycles detected*')
    lines.push('')
  }

  if (uniqueViolations.length) {
    lines.push('### Layering Violations')
    lines.push('')
    lines.push('| Type | Importer | Imported |')
    lines.push('| --- | --- | --- |')
    for (const v of uniqueViolations.slice(0, options.maxViolationsToShow)) {
      lines.push(`| ${v.type} | \`${v.importer}\` | \`${v.imported}\` |`)
    }
    if (uniqueViolations.length > options.maxViolationsToShow) {
      lines.push(`| ... | ${uniqueViolations.length - 50} more | |`)
    }
    lines.push('')
  } else {
    lines.push('### Layering Violations')
    lines.push('*No violations detected*')
    lines.push('')
  }

  return {
    content: lines.join('\n'),
    stats: { cycles: cycles.length, violations: uniqueViolations.length },
  }
}

// -------------------------
// Test Matrix (G) - returns content string
// -------------------------
async function generateTestMatrixContent() {
  const componentsDir = path.join(PROJECT_ROOT, 'src', 'components')
  let componentFolders
  try {
    const entries = await fs.readdir(componentsDir, { withFileTypes: true })
    componentFolders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    componentFolders = []
  }

  const matrix = []
  let hasSpec = 0
  let hasStory = 0
  let hasBoth = 0
  let hasNeither = 0

  for (const compName of componentFolders) {
    const compDir = path.join(componentsDir, compName)
    let files
    try {
      files = await fs.readdir(compDir)
    } catch {
      files = []
    }

    const hasSpecFile = files.some((f) => f.endsWith('.spec.ts'))
    const hasStoryFile = files.some((f) => f.endsWith('.stories.ts'))
    const hasIndexFile = files.includes('index.ts')
    const hasTypesFile = files.some((f) => f.endsWith('.types.ts'))

    matrix.push({
      component: compName,
      spec: hasSpecFile,
      stories: hasStoryFile,
      index: hasIndexFile,
      types: hasTypesFile,
    })

    if (hasSpecFile && hasStoryFile) hasBoth++
    else if (hasSpecFile) hasSpec++
    else if (hasStoryFile) hasStory++
    else hasNeither++
  }

  const lines = []
  lines.push(`- Components: **${componentFolders.length}**`)
  lines.push('')

  lines.push('### Summary')
  lines.push(`- With both tests & stories: **${hasBoth}**`)
  lines.push(`- With tests only: **${hasSpec}**`)
  lines.push(`- With stories only: **${hasStory}**`)
  lines.push(`- With neither: **${hasNeither}**`)
  lines.push('')

  lines.push('### Matrix')
  lines.push('')
  lines.push('| Component | *.spec.ts | *.stories.ts | index.ts | *.types.ts |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const m of matrix) {
    const check = (b) => (b ? '✅' : '❌')
    lines.push(
      `| ${m.component} | ${check(m.spec)} | ${check(m.stories)} | ${check(m.index)} | ${check(m.types)} |`,
    )
  }
  lines.push('')

  return {
    content: lines.join('\n'),
    stats: {
      total: componentFolders.length,
      hasBoth,
      hasSpec,
      hasStory,
      hasNeither,
    },
  }
}

// -------------------------
// Secrets Scan (I) - returns content string
// -------------------------
async function generateSecretsScanContent(fileMetas) {
  const findings = []

  for (const f of fileMetas) {
    if (f.binary) continue
    // Skip non-text extensions
    const ext = extOf(path.join(PROJECT_ROOT, f.path))
    if (!TEXT_EXTENSIONS.has(ext) && ext !== '(none)') continue

    const abs = path.join(PROJECT_ROOT, f.path)
    let text
    try {
      const { text: t } = await safeReadText(abs, MAX_TEXT_BYTES_PER_FILE_ANALYSIS)
      text = t
    } catch {
      continue
    }

    const textLines = text.split('\n')
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i]
      for (const pattern of SECRET_PATTERNS) {
        // Reset regex lastIndex
        pattern.rx.lastIndex = 0
        if (pattern.rx.test(line)) {
          findings.push({
            file: f.path,
            line: i + 1,
            label: pattern.label,
          })
        }
      }
    }
  }

  // Sort and deduplicate
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

  const outputLines = []
  outputLines.push(`- Potential findings: **${findings.length}**`)
  outputLines.push('')
  outputLines.push(
    '> **Note:** This scan only reports file path + line number + pattern label.',
  )
  outputLines.push('> No secret values are output. Review each finding manually.')
  outputLines.push('')

  if (findings.length === 0) {
    outputLines.push('*No potential secrets detected.*')
  } else {
    outputLines.push('### Findings')
    outputLines.push('')
    outputLines.push('| File | Line | Pattern |')
    outputLines.push('| --- | --- | --- |')
    for (const f of findings.slice(0, options.maxSecretsFindingsToShow)) {
      outputLines.push(`| \`${f.file}\` | ${f.line} | ${f.label} |`)
    }
    if (findings.length > options.maxSecretsFindingsToShow) {
      outputLines.push(`| ... | ${findings.length - 200} more | |`)
    }
  }
  outputLines.push('')

  return { content: outputLines.join('\n'), findingsCount: findings.length }
}
async function analyzeFiles(filesAbs) {
  const fileMetas = []
  const byExt = new Map()

  let totalBytes = 0
  let totalTextFiles = 0
  let totalBinaryFiles = 0

  // v3: these are CODE-only now
  let totalCodeLines = 0
  let totalFunctions = 0
  let totalClasses = 0

  const markers = []
  const importGraph = {
    totalImports: 0,
    totalExports: 0,
    totalRequires: 0,
    filesWithMostImports: [],
  }

  const largest = []

  for (const abs of filesAbs) {
    let st
    try {
      st = await fs.stat(abs)
    } catch {
      continue
    }

    const r = rel(abs)
    const ext = extOf(abs)

    totalBytes += st.size
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1)

    const binary = await isBinaryFile(abs)
    if (binary) totalBinaryFiles++
    else totalTextFiles++

    const meta = {
      path: r,
      ext,
      size: st.size,
      binary,
      sha1: null,

      textBytes: null,
      truncated: false,

      // v3: code-only metrics (null for non-code)
      codeLines: null,
      functions: null,
      classes: null,

      imports: null,
      exports: null,
      requires: null,

      markerHits: null,
    }

    // Hash (skip huge)
    if (st.size <= 3_000_000) {
      meta.sha1 = await sha1File(abs)
    }

    if (!binary) {
      try {
        const { text, truncated, bytes } = await safeReadText(
          abs,
          MAX_TEXT_BYTES_PER_FILE_ANALYSIS,
        )
        meta.textBytes = bytes
        meta.truncated = truncated

        // v3: only compute code metrics for code files
        if (isCodeFile(abs)) {
          const lines = text.split(/\r?\n/).map((l) => l.trim())
          const codeLines = lines.filter(
            (l) => l && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'),
          )

          meta.codeLines = codeLines.length
          totalCodeLines += codeLines.length

          meta.functions = (text.match(RX_FUNCTION) || []).length
          meta.classes = (text.match(RX_CLASS) || []).length
          totalFunctions += meta.functions
          totalClasses += meta.classes

          meta.imports = (text.match(RX_IMPORT) || []).length
          meta.exports = (text.match(RX_EXPORT) || []).length
          meta.requires = (text.match(RX_REQUIRE) || []).length

          importGraph.totalImports += meta.imports
          importGraph.totalExports += meta.exports
          importGraph.totalRequires += meta.requires

          if (meta.imports > 0) {
            importGraph.filesWithMostImports.push({
              file: r,
              imports: meta.imports,
            })
          }

          const hit = (rx) => (text.match(rx) || []).length
          meta.markerHits = {
            todo: hit(RX_TODO),
            tsIgnore: hit(RX_TS_IGNORE),
            any: hit(RX_ANY),
            eslintDisable: hit(RX_ESLINT_DISABLE),
          }

          const sum =
            meta.markerHits.todo +
            meta.markerHits.tsIgnore +
            meta.markerHits.any +
            meta.markerHits.eslintDisable

          if (sum > 0) markers.push({ file: r, ...meta.markerHits })
        }
      } catch {
        // ignore read failures
      }
    }

    fileMetas.push(meta)
    largest.push({ file: r, size: st.size })
  }

  importGraph.filesWithMostImports.sort((a, b) => b.imports - a.imports)
  importGraph.filesWithMostImports = importGraph.filesWithMostImports.slice(
    0,
    options.maxImportsFilesToShow,
  )

  largest.sort((a, b) => b.size - a.size)
  const topLargest = largest.slice(0, options.maxLargestFilesToShow)

  const extSummary = [...byExt.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => ({ ext, count }))

  markers.sort((a, b) => {
    const sa = a.todo + a.tsIgnore + a.any + a.eslintDisable
    const sb = b.todo + b.tsIgnore + b.any + b.eslintDisable
    return sb - sa
  })

  return {
    totals: {
      files: filesAbs.length,
      bytes: totalBytes,
      textFiles: totalTextFiles,
      binaryFiles: totalBinaryFiles,

      // v3: these are CODE-only totals now
      codeLinesApprox: totalCodeLines,
      functionsApprox: totalFunctions,
      classesApprox: totalClasses,
    },
    extSummary,
    topLargest,
    markers: markers.slice(0, options.maxMarkersInOutput),
    importGraph,
    fileMetas,
  }
}

// -------------------------
// Dump content file
// -------------------------
async function writeProjectDump(fileMetas, mode, duplicatesRemoved = 0) {
  let out = ''
  out += `================================================================================\n`
  out += `PROJECT DUMP\n`
  out += `================================================================================\n`
  out += `Generated: ${nowISO()}\n`
  out += `Root: ${PROJECT_ROOT}\n`
  out += `Discovery mode: ${mode === 'git' ? 'git ls-files' : 'filesystem walk'}\n`
  out += `Total included files: ${fileMetas.length}\n`
  out += `Excluded patterns: ${EXCLUDED_PATTERNS_SUMMARY}\n`
  out += `Size limits: max ${formatBytes(MAX_TEXT_BYTES_PER_FILE_DUMP)}/file, max ${formatBytes(MAX_DUMP_TOTAL_BYTES)} total\n`
  if (duplicatesRemoved > 0) {
    out += `Duplicates removed: ${duplicatesRemoved}\n`
  }
  out += `================================================================================\n`
  out += `\n`

  let dumpedBytes = 0
  let skippedSecrets = 0
  let skippedLargeFiles = 0
  let skippedBinaryFiles = 0

  for (const f of fileMetas) {
    const abs = path.join(PROJECT_ROOT, f.path)

    // SECURITY: Double-check secret files are never included (defense in depth)
    if (isSecretPath(abs)) {
      out += `\n\n===SECRET_FILE:${f.path}===\n[⛔ SECRET FILE EXCLUDED – This file matches secret patterns and is never included in dumps for security reasons.]\n`
      skippedSecrets++
      continue
    }

    if (f.binary) {
      out += `\n\n===BINARY_FILE:${f.path}===\n[Binary file – content omitted]\n`
      skippedBinaryFiles++
      continue
    }

    if (typeof f.textBytes === 'number' && f.textBytes > MAX_TEXT_BYTES_PER_FILE_DUMP) {
      out += `\n\n===LARGE_FILE:${f.path}===\n[⚠️ FILE TOO LARGE – Size: ${formatBytes(f.textBytes)}, Limit: ${formatBytes(MAX_TEXT_BYTES_PER_FILE_DUMP)}. Content omitted to prevent runaway dump size.]\n`
      skippedLargeFiles++
      continue
    }

    if (dumpedBytes > MAX_DUMP_TOTAL_BYTES) {
      out += `\n\n===DUMP_TRUNCATED===\n[⚠️ TOTAL DUMP SIZE LIMIT REACHED – Limit: ${formatBytes(MAX_DUMP_TOTAL_BYTES)}. Remaining ${fileMetas.length - fileMetas.indexOf(f)} files omitted to prevent runaway dump size.]\n`
      break
    }

    try {
      const { text, truncated, bytes } = await safeReadText(
        abs,
        MAX_TEXT_BYTES_PER_FILE_DUMP,
      )
      out += `\n\n===FILE:${f.path}===\n`
      out += text
      if (truncated)
        out += `\n\n[...TRUNCATED: file exceeded ${formatBytes(MAX_TEXT_BYTES_PER_FILE_DUMP)} limit]\n`
      dumpedBytes += Math.min(bytes, MAX_TEXT_BYTES_PER_FILE_DUMP)
    } catch (e) {
      out += `\n\n===FILE:${f.path}===\n[Could not read file: ${String(e?.message || e)}]\n`
    }
  }

  // Add dump summary footer
  out += `\n\n================================================================================\n`
  out += `DUMP SUMMARY\n`
  out += `================================================================================\n`
  out += `Total bytes dumped: ${formatBytes(dumpedBytes)}\n`
  if (skippedSecrets > 0) {
    out += `Secret files excluded: ${skippedSecrets} (security protection)\n`
  }
  if (skippedLargeFiles > 0) {
    out += `Large files skipped: ${skippedLargeFiles} (exceeded ${formatBytes(MAX_TEXT_BYTES_PER_FILE_DUMP)} limit)\n`
  }
  if (skippedBinaryFiles > 0) {
    out += `Binary files skipped: ${skippedBinaryFiles}\n`
  }
  out += `================================================================================\n`

  await writeOutputFile(OUT_DUMP, out)
}

// -------------------------
// Run manifest generation
// -------------------------
/**
 * Generate a run manifest with metadata about this dump execution.
 * Contains no sensitive data (no secrets, no env values).
 *
 * @param {Object} params
 * @param {string} params.projectName - Sanitized project name
 * @param {string} params.generatedAt - ISO timestamp of generation
 * @param {string[]} params.outputFiles - Array of absolute paths to generated files
 * @returns {Object} Run manifest object
 */
function generateRunManifest({ projectName, generatedAt, outputFiles }) {
  // Build sanitized options summary (no secrets, no env values, no functions)
  const optionsSummary = {
    outputDirName: options.outputDirName,
    useTimestampedOutput: options.useTimestampedOutput,
    cleanDistBeforeDump: options.cleanDistBeforeDump,
    createZipArtifact: options.createZipArtifact,
    createLatestAlias: options.createLatestAlias,
    zipOutputDir: options.zipOutputDir || options.outputDirName,
    snapshotEnabled: options.snapshotEnabled,
    snapshotDir: options.snapshotDir,
    maxTextBytesPerFileDump: options.maxTextBytesPerFileDump,
    maxTextBytesPerFileAnalysis: options.maxTextBytesPerFileAnalysis,
    maxDumpTotalBytes: options.maxDumpTotalBytes,
    topNLimit: options.topNLimit,
    deltaMaxItems: options.deltaMaxItems,
    ignoreDirNamesCount: options.ignoreDirNames.length,
    textExtensionsCount: options.textExtensions.length,
    codeExtensionsCount: options.codeExtensions.length,
  }

  return {
    projectName,
    generatedAt,
    scriptFile: 'project-dump.mjs',
    scriptVersion: 'v6',
    options: optionsSummary,
    outputFiles: outputFiles.map((f) => path.relative(options.projectRoot, f)),
  }
}

// -------------------------
// Structure output
// -------------------------
async function writeStructure(mode, filesAbs, duplicatesRemoved = 0) {
  const lines = []
  lines.push(
    `================================================================================`,
  )
  lines.push(`PROJECT STRUCTURE`)
  lines.push(
    `================================================================================`,
  )
  lines.push(`Generated: ${nowISO()}`)
  lines.push(`Root: ${PROJECT_ROOT}`)
  lines.push(`Discovery mode: ${mode === 'git' ? 'git ls-files' : 'filesystem walk'}`)
  lines.push(`Total included files: ${filesAbs.length}`)
  lines.push(`Excluded patterns: ${EXCLUDED_PATTERNS_SUMMARY}`)
  if (duplicatesRemoved > 0) {
    lines.push(`Duplicates removed: ${duplicatesRemoved}`)
  }
  lines.push(
    `================================================================================`,
  )
  lines.push('')
  for (const abs of filesAbs) lines.push(rel(abs))
  await writeOutputFile(OUT_STRUCTURE, lines.join('\n'))
}

// -------------------------
// Report writing
// -------------------------
async function writeReports(payload) {
  const { meta, analysis } = payload

  // Write JSON report only (no markdown - consolidated into project-insights.md)
  await writeOutputFile(OUT_REPORT_JSON, JSON.stringify(payload, null, 2))

  const manifest = {
    generatedAt: meta.generatedAt,
    root: meta.root,
    files: analysis.fileMetas.map((f) => ({
      path: f.path,
      size: f.size,
      binary: f.binary,
      sha1: f.sha1,
    })),
  }
  // Skip timestamping for manifest file to stay within 10-file cap
  await writeOutputFile(OUT_MANIFEST_JSON, JSON.stringify(manifest, null, 2), true)
}

// -------------------------
// Clean dist directory (optional)
// -------------------------
async function cleanDistDirectory() {
  const distPath = path.join(PROJECT_ROOT, 'dist')
  try {
    const exists = await pathExists(distPath)
    if (exists) {
      await fs.rm(distPath, { recursive: true, force: true })
      console.info(`🧹 Cleaned dist/ directory`)
    }
  } catch (e) {
    console.warn(`⚠️  Could not clean dist/: ${e.message}`)
  }
}

// -------------------------
// ZIP Artifact Creation
// -------------------------

/**
 * Files to include in the ZIP artifact (base names without path).
 * Only includes core dump output files - excludes run manifest and other internal files.
 * Order is lexicographic for deterministic output.
 */
const ZIP_INCLUDED_FILES = [
  'dump-state.json',
  'project-dump.txt',
  'project-insights.md',
  'project-manifest.json',
  'project-report.json',
  'project-structure.txt',
]

/**
 * Create a ZIP artifact containing the generated dump outputs.
 * When snapshot mode is enabled, the ZIP is placed in a new numbered subfolder.
 *
 * @param {Object} params
 * @param {string} params.projectName - Sanitized project name
 * @param {string} params.timestamp - Timestamp string from formatTimestamp()
 * @returns {Promise<{zipPath: string, snapshotDir?: string, snapshotNumber?: number, includedFiles: string[]} | null>}
 *   Returns null if ZIP creation is disabled or fails
 */
async function createZipArtifact({ projectName, timestamp }) {
  if (!CREATE_ZIP_ARTIFACT) {
    return null
  }

  // Build the ZIP base name following the naming convention
  const zipBaseName = buildDumpBaseName({ projectName, timestamp })
  const zipFileName = `${zipBaseName}.zip`

  // Determine output directory (snapshot mode uses numbered subfolders)
  let actualZipOutputDir = ZIP_OUTPUT_DIR
  let snapshotNumber = null
  let snapshotFolderPath = null

  if (SNAPSHOT_ENABLED) {
    // Ensure snapshot .gitignore exists
    await ensureSnapshotGitignore()

    // Get the next snapshot number
    snapshotNumber = await getNextSnapshotNumber()
    snapshotFolderPath = path.join(SNAPSHOT_DIR, String(snapshotNumber))
    actualZipOutputDir = snapshotFolderPath
  }

  const zipPath = path.join(actualZipOutputDir, zipFileName)

  // Ensure ZIP output directory exists
  await fs.mkdir(actualZipOutputDir, { recursive: true })

  // Mapping from ZIP_INCLUDED_FILES base names to actual output paths
  const fileMapping = {
    'dump-state.json': OUT_STATE_JSON,
    'project-dump.txt': OUT_DUMP,
    'project-insights.md': OUT_INSIGHTS_MD,
    'project-manifest.json': OUT_MANIFEST_JSON,
    'project-report.json': OUT_REPORT_JSON,
    'project-structure.txt': OUT_STRUCTURE,
  }

  // Collect files that exist
  const zipEntries = {}
  const includedFiles = []

  // Sort entries lexicographically for deterministic output
  const sortedFileNames = [...ZIP_INCLUDED_FILES].sort()

  for (const fileName of sortedFileNames) {
    const filePath = fileMapping[fileName]
    if (!filePath) {
      continue
    }

    try {
      const exists = await pathExists(filePath)
      if (!exists) {
        // dump-state.json is optional (only present after delta mode used)
        if (fileName === 'dump-state.json') {
          continue
        }
        console.warn(`⚠️  ZIP: Expected file not found: ${fileName}`)
        continue
      }

      const content = await fs.readFile(filePath)
      // Create entry path inside ZIP: <zipBaseName>/<fileName>
      const entryPath = `${zipBaseName}/${fileName}`
      zipEntries[entryPath] = content
      includedFiles.push(fileName)
    } catch (e) {
      console.warn(`⚠️  ZIP: Could not read ${fileName}: ${e.message}`)
    }
  }

  if (includedFiles.length === 0) {
    console.warn(`⚠️  ZIP: No files to include, skipping ZIP creation`)
    return null
  }

  try {
    // Create ZIP using fflate (synchronous for simplicity, files are small)
    const zipped = zipSync(zipEntries, {
      // Use default compression level
    })

    await fs.writeFile(zipPath, zipped)

    // Create "latest" alias if enabled (only when not in snapshot mode)
    let latestZipPath = null
    if (CREATE_LATEST_ALIAS && !SNAPSHOT_ENABLED) {
      const latestZipFileName = `dump-${projectName}-latest.zip`
      latestZipPath = path.join(ZIP_OUTPUT_DIR, latestZipFileName)
      await fs.writeFile(latestZipPath, zipped)
    }

    return {
      zipPath,
      latestZipPath,
      snapshotDir: snapshotFolderPath,
      snapshotNumber,
      includedFiles,
    }
  } catch (e) {
    console.error(`❌ ZIP creation failed: ${e.message}`)
    return null
  }
}

// -------------------------
// Main
// -------------------------
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  // Resolve project name (priority: options > package.json > folder name)
  resolvedProjectName = await resolveProjectName()

  console.info(`🔎 Project dump starting… (v6)`)
  console.info(`📁 Root: ${PROJECT_ROOT}`)
  console.info(`📛 Project: ${resolvedProjectName}`)
  console.info(`🗂️  Output: ${OUT_DIR}`)
  if (USE_TIMESTAMPED_OUTPUT) {
    console.info(`📅 Timestamped output: enabled`)
  }
  if (CREATE_ZIP_ARTIFACT) {
    const zipDir = path.relative(PROJECT_ROOT, ZIP_OUTPUT_DIR)
    console.info(`📦 ZIP artifact: enabled → ${zipDir}`)
    if (SNAPSHOT_ENABLED) {
      const snapshotDir = path.relative(PROJECT_ROOT, SNAPSHOT_DIR)
      console.info(`📸 Snapshot mode: enabled → ${snapshotDir}`)
    }
  }

  // Optional: clean dist before dump
  if (CLEAN_DIST_BEFORE_DUMP) {
    await cleanDistDirectory()
  }

  // Load previous state for delta comparison
  const prevState = await loadPreviousState()
  if (prevState) {
    console.info(`📊 Previous state found from: ${prevState.generatedAt}`)
  }

  const structure = await gatherAllFiles()
  const filesAbs = structure.files
  const duplicatesRemoved = structure.duplicatesRemoved

  console.info(`📄 Files discovered (${structure.mode}): ${filesAbs.length}`)
  if (duplicatesRemoved > 0) {
    console.info(`⚠️  Duplicates removed: ${duplicatesRemoved}`)
  }
  await writeStructure(structure.mode, filesAbs, duplicatesRemoved)

  const pkg = await readJsonIfExists(path.join(PROJECT_ROOT, 'package.json'))
  const pkgSummary = summarizePackageJson(pkg)

  const tsconfigs = await discoverTsconfigs(filesAbs)
  const configSnapshots = await collectConfigSnapshots()

  console.info(`🧠 Running heuristics analysis…`)
  const analysis = await analyzeFiles(filesAbs)

  console.info(`🧾 Writing dump file…`)
  await writeProjectDump(analysis.fileMetas, structure.mode, duplicatesRemoved)

  const generatedAt = nowISO()
  const payload = {
    meta: {
      generatedAt,
      root: PROJECT_ROOT,
      node: process.version,
      scriptVersion: 'v6',
      timestampedOutput: USE_TIMESTAMPED_OUTPUT,
    },
    structure: {
      mode: structure.mode,
      fileCount: filesAbs.length,
      duplicatesRemoved,
    },
    pkgSummary,
    tsconfigs,
    configSnapshots,
    analysis,
  }

  console.info(`🧾 Writing reports…`)
  await writeReports(payload)

  // Save current state for delta comparison
  console.info(`💾 Saving state for future delta comparison…`)
  const currentState = await saveDumpState(analysis.fileMetas, generatedAt)

  // -------------------------
  // Generate consolidated project-insights.md
  // -------------------------
  console.info(`📝 Generating consolidated project insights…`)

  const insightsSections = []

  // Header section
  insightsSections.push('# Project Insights')
  insightsSections.push('')
  insightsSections.push(`- **Generated:** ${generatedAt}`)
  insightsSections.push(`- **Root:** \`${PROJECT_ROOT}\``)
  insightsSections.push(
    `- **Discovery mode:** ${structure.mode === 'git' ? 'git ls-files' : 'filesystem walk'}`,
  )
  insightsSections.push(`- **Included files:** ${filesAbs.length}`)
  insightsSections.push(`- **Excluded patterns:** ${EXCLUDED_PATTERNS_SUMMARY}`)
  if (duplicatesRemoved > 0) {
    insightsSections.push(`- **Duplicates removed:** ${duplicatesRemoved}`)
  }
  insightsSections.push('')
  insightsSections.push('---')
  insightsSections.push('')

  // Public API Snapshot
  console.info(`📦 Generating public API snapshot…`)
  const publicApiResult = await generatePublicApiContent()
  console.info(`   Entry files: ${publicApiResult.entryCount}`)
  insightsSections.push('## Public API Snapshot')
  insightsSections.push('')
  insightsSections.push(publicApiResult.content)
  insightsSections.push('---')
  insightsSections.push('')

  // Component Inventory
  console.info(`🧩 Generating component inventory…`)
  const inventoryResult = await generateComponentInventoryContent()
  console.info(`   Components: ${inventoryResult.componentCount}`)
  insightsSections.push('## Component Inventory')
  insightsSections.push('')
  insightsSections.push(inventoryResult.content)
  insightsSections.push('---')
  insightsSections.push('')

  // Test Matrix
  console.info(`🧪 Generating test matrix…`)
  const testMatrixResult = await generateTestMatrixContent()
  console.info(
    `   Components: ${testMatrixResult.stats.total}, Both tests+stories: ${testMatrixResult.stats.hasBoth}, Neither: ${testMatrixResult.stats.hasNeither}`,
  )
  insightsSections.push('## Test Matrix')
  insightsSections.push('')
  insightsSections.push(testMatrixResult.content)
  insightsSections.push('---')
  insightsSections.push('')

  // Lint Debt Report
  console.info(`🔍 Generating lint debt report…`)
  const lintDebtResult = await generateLintDebtContent(analysis.fileMetas, prevState)
  console.info(
    `   eslint-disable: ${lintDebtResult.totals.eslintDisable}, ts-ignore: ${lintDebtResult.totals.tsIgnore}, any: ${lintDebtResult.totals.anyUsage}, TODO/FIXME: ${lintDebtResult.totals.todoFixmeHack}`,
  )
  insightsSections.push('## Lint Debt Report')
  insightsSections.push('')
  insightsSections.push(lintDebtResult.content)
  insightsSections.push('---')
  insightsSections.push('')

  // Update state with lint debt for future comparison
  currentState.lintDebt = lintDebtResult.totals
  // Skip timestamping for state file (internal use only, not user-facing)
  await writeOutputFile(OUT_STATE_JSON, JSON.stringify(currentState, null, 2), true)

  // Import Graph
  console.info(`🔗 Generating import graph report…`)
  const importGraphResult = await generateImportGraphContent(analysis.fileMetas)
  console.info(
    `   Cycles: ${importGraphResult.stats.cycles}, Violations: ${importGraphResult.stats.violations}`,
  )
  insightsSections.push('## Import Graph')
  insightsSections.push('')
  insightsSections.push(importGraphResult.content)
  insightsSections.push('---')
  insightsSections.push('')

  // Secrets Scan
  console.info(`🔐 Running secrets scan…`)
  const secretsScanResult = await generateSecretsScanContent(analysis.fileMetas)
  console.info(`   Potential findings: ${secretsScanResult.findingsCount}`)
  insightsSections.push('## Secrets Scan')
  insightsSections.push('')
  insightsSections.push(secretsScanResult.content)

  // Delta Summary (if previous state exists)
  if (prevState) {
    console.info(`📊 Generating delta summary…`)
    const deltaResult = await generateDeltaContent(prevState, currentState)
    if (deltaResult) {
      console.info(
        `   Added: ${deltaResult.stats.added}, Removed: ${deltaResult.stats.removed}, Modified: ${deltaResult.stats.modified}`,
      )
      insightsSections.push('---')
      insightsSections.push('')
      insightsSections.push('## Delta Summary')
      insightsSections.push('')
      insightsSections.push(deltaResult.content)
    }
  } else {
    console.info(
      `📊 No previous state - skipping delta summary (state saved for next run)`,
    )
  }

  // Write consolidated insights file
  await writeOutputFile(OUT_INSIGHTS_MD, insightsSections.join('\n'))

  // Generate and write run manifest
  console.info(`📋 Generating run manifest…`)
  const runManifest = generateRunManifest({
    projectName: resolvedProjectName,
    generatedAt,
    outputFiles: [
      OUT_STRUCTURE,
      OUT_DUMP,
      OUT_REPORT_JSON,
      OUT_MANIFEST_JSON,
      OUT_STATE_JSON,
      OUT_INSIGHTS_MD,
    ],
  })
  // Skip timestamping for manifest to stay within file cap
  await writeOutputFile(OUT_RUN_MANIFEST_JSON, JSON.stringify(runManifest, null, 2), true)

  // Output summary
  const outputFiles = [
    OUT_STRUCTURE,
    OUT_DUMP,
    OUT_REPORT_JSON,
    OUT_MANIFEST_JSON,
    OUT_STATE_JSON,
    OUT_INSIGHTS_MD,
    OUT_RUN_MANIFEST_JSON,
  ]

  // Create ZIP artifact if enabled
  let zipResult = null
  if (CREATE_ZIP_ARTIFACT) {
    console.info(`📦 Creating ZIP artifact…`)
    const zipTimestamp = formatTimestamp(new Date(generatedAt))
    zipResult = await createZipArtifact({
      projectName: resolvedProjectName,
      timestamp: zipTimestamp,
    })
    if (zipResult) {
      console.info(`   ZIP: ${path.relative(PROJECT_ROOT, zipResult.zipPath)}`)
      if (zipResult.snapshotNumber) {
        console.info(`   Snapshot: #${zipResult.snapshotNumber}`)
      }
      if (zipResult.latestZipPath) {
        console.info(`   Latest: ${path.relative(PROJECT_ROOT, zipResult.latestZipPath)}`)
      }
      console.info(`   Files included: ${zipResult.includedFiles.length}`)
    }
  }

  console.info(`✅ Done.`)
  console.info(`\nOutputs (${outputFiles.length} files):`)
  for (const f of outputFiles) {
    console.info(`- ${path.relative(PROJECT_ROOT, f)}`)
  }
  if (zipResult) {
    console.info(`\nZIP artifact:`)
    console.info(`- ${path.relative(PROJECT_ROOT, zipResult.zipPath)}`)
    if (zipResult.snapshotNumber) {
      console.info(`  (snapshot #${zipResult.snapshotNumber})`)
    }
    if (zipResult.latestZipPath) {
      console.info(`- ${path.relative(PROJECT_ROOT, zipResult.latestZipPath)}`)
    }
  }
}

main().catch((err) => {
  console.error('❌ Dump failed:', err)
  process.exit(1)
})
