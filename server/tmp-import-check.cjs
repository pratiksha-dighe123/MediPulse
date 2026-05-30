const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname);
const errors = [];

function checkFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const importRegex = /from\s+['\"](.+?)['\"]/;

  lines.forEach((line, index) => {
    const match = line.match(importRegex);
    if (!match) return;

    const importPath = match[1];
    if (!importPath.startsWith('.')) return;

    const raw = path.resolve(path.dirname(filePath), importPath);
    const candidates = [raw, `${raw}.js`, path.join(raw, 'index.js')];
    const found = candidates.some((candidate) => fs.existsSync(candidate));

    if (!found) {
      errors.push({
        file: path.relative(root, filePath).replace(/\\/g, '/'),
        line: index + 1,
        importPath,
      });
    }
  });
}

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') return;
      walk(fullPath);
      return;
    }

    if (entry.isFile() && fullPath.endsWith('.js')) {
      checkFile(fullPath);
    }
  });
}

walk(root);

if (errors.length === 0) {
  console.log('NO_UNRESOLVED_IMPORTS');
  process.exit(0);
}

errors
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
  .forEach((error) => {
    console.log(`${error.file}:${error.line} -> ${error.importPath}`);
  });
