import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Try multiple locations — supports both 'nateh' machine and current user
const USER = process.env.USERNAME || process.env.USER || 'USER';
const PUPPETEER_PATH = (() => {
  const candidates = [
    `C:/Users/${USER}/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer`,
    'C:/Users/nateh/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer',
  ];
  for (const c of candidates) {
    try { require.resolve(c); return c; } catch {}
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
})();
const CHROME_CACHE = (() => {
  const candidates = [
    `C:/Users/${USER}/.cache/puppeteer/chrome`,
    `C:/Users/${USER}/AppData/Local/puppeteer/chrome`,
    'C:/Users/nateh/.cache/puppeteer/chrome',
  ];
  for (const c of candidates) { if (fs.existsSync(c)) return c; }
  return candidates[0];
})();

let puppeteer;
try {
  puppeteer = require(PUPPETEER_PATH);
} catch (e) {
  console.error('Failed to load Puppeteer from:', PUPPETEER_PATH);
  console.error(e.message);
  process.exit(1);
}

const url   = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

// Ensure output directory exists
const screenshotDir = path.join(__dirname, 'temporary screenshots');
fs.mkdirSync(screenshotDir, { recursive: true });

// Auto-increment filename
let n = 1;
while (fs.existsSync(path.join(screenshotDir, label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`))) {
  n++;
}
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const filepath = path.join(screenshotDir, filename);

// Locate Chrome executable dynamically
let executablePath;
if (fs.existsSync(CHROME_CACHE)) {
  for (const version of fs.readdirSync(CHROME_CACHE)) {
    const candidates = [
      path.join(CHROME_CACHE, version, 'chrome-win64', 'chrome.exe'),
      path.join(CHROME_CACHE, version, 'chrome-linux64', 'chrome'),
      path.join(CHROME_CACHE, version, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) { executablePath = c; break; }
    }
    if (executablePath) break;
  }
}

const launchOptions = {
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};
if (executablePath) {
  launchOptions.executablePath = executablePath;
  console.log('Using Chrome:', executablePath);
}

const browser = await puppeteer.launch(launchOptions);
const page    = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
await new Promise(r => setTimeout(r, 800)); // let fonts/animations settle
await page.screenshot({ path: filepath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${filepath}`);
