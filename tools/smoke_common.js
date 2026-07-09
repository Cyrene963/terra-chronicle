const fs = require('fs');
const path = require('path');

const ROOT = '/root/terra-chronicle-game';
const LIVE_ROOT = process.env.TERRA_LIVE_ROOT || '/var/www/terra-pixijs';

function scriptVersions(indexPath = path.join(LIVE_ROOT, 'index.html')) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const versions = {};
  const re = /src="(src\/(state|alchemy|battle|dungeon|upgrade|main)\.js\?v=([^"]+))"/g;
  let m;
  while ((m = re.exec(html))) {
    versions[`${m[2]}.js`] = m[3];
  }
  return versions;
}

function expectedScript(name, versions = scriptVersions()) {
  const version = versions[name];
  if (!version) throw new Error(`Missing ${name} version in live index.html`);
  return `src/${name}?v=${version}`;
}

function hasExpectedScript(scripts, name, versions = scriptVersions()) {
  const expected = expectedScript(name, versions);
  return scripts.some(src => src.includes(expected));
}

function badConsole(msg) {
  const text = msg.text();
  if (msg.type() !== 'error' && msg.type() !== 'warning') return false;
  if (/Failed to load resource.*favicon/i.test(text)) return false;
  if (/PixiJS Error: Could not initialize shader\.?$/i.test(text) || /^\s*$/.test(text)) return false;
  if (/WebGL.*ReadPixels|GPU stall due to ReadPixels|#define SHADER_NAME|INVALID_OPERATION: useProgram|INVALID_OPERATION: drawElements|CONTEXT_LOST_WEBGL|Attribute .* is not present in the shader/i.test(text)) return false;
  return true;
}

function sha256(filePath) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function compareSourceLive(files) {
  return files.map(rel => {
    const source = path.join(ROOT, rel);
    const live = path.join(LIVE_ROOT, rel);
    const sourceExists = fs.existsSync(source);
    const liveExists = fs.existsSync(live);
    const sourceHash = sourceExists ? sha256(source) : null;
    const liveHash = liveExists ? sha256(live) : null;
    return { rel, sourceExists, liveExists, sourceHash, liveHash, ok: sourceExists && liveExists && sourceHash === liveHash };
  });
}

module.exports = {
  ROOT,
  LIVE_ROOT,
  scriptVersions,
  expectedScript,
  hasExpectedScript,
  badConsole,
  sha256,
  compareSourceLive,
};
