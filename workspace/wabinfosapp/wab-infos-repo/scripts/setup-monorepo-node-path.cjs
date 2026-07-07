'use strict';

const fs = require('fs');
const path = require('path');

/** Résout next/sharp depuis la racine du monorepo (Passenger / nodevenv N0C). */
function setupMonorepoNodePath(appDir) {
  const root = path.resolve(appDir, '../..');
  const candidates = [path.join(appDir, 'node_modules'), path.join(root, 'node_modules')];
  const existing = candidates.filter((dir) => fs.existsSync(dir));
  if (!existing.length) {
    return;
  }
  const extra = existing.join(path.delimiter);
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${extra}${path.delimiter}${process.env.NODE_PATH}`
    : extra;
  require('module').Module._initPaths();
}

module.exports = { setupMonorepoNodePath };
