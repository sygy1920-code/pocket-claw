const path = require('path');
const os = require('os');
const fs = require('fs');

const platform = os.platform();
let appDir;

if (platform === 'darwin') {
  appDir = path.join(os.homedir(), 'Library', 'Application Support', 'pocket-claw');
} else if (platform === 'win32') {
  appDir = path.join(os.homedir(), 'AppData', 'pocket-claw');
} else {
  appDir = path.join(os.homedir(), '.config', 'pocket-claw');
}

const memoryFile = path.join(appDir, 'memory', 'pet-memory.json');
const envFile = path.join(appDir, '.env');

let cleared = false;

if (fs.existsSync(memoryFile)) {
  fs.unlinkSync(memoryFile);
  console.log('✅ Memory cleared:', memoryFile);
  cleared = true;
}

if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, 'utf-8');
  const lines = content.split('\n').filter(l => !l.trim().startsWith('GLM_API_KEY='));
  if (lines.length < content.split('\n').length) {
    fs.writeFileSync(envFile, lines.join('\n'));
    console.log('✅ API Key removed from:', envFile);
    cleared = true;
  }
}

if (!cleared) {
  console.log('ℹ️ No memory or API key found to clear.');
}
