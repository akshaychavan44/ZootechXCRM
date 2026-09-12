const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'node_modules/next/dist/lib/recursive-delete.js'),
  path.join(__dirname, 'node_modules/next/dist/esm/lib/recursive-delete.js')
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix infinite recursion bug t++ -> t + 1
  if (content.includes('t++')) {
    content = content.replace(/unlinkPath\(p,\s*isDir,\s*t\+\+\)/g, 'unlinkPath(p, isDir, t + 1)');
  }

  // Handle Windows / OneDrive reparse point where isDirectory is false on folders
  if (!content.includes('code === "EPERM" && !isDir')) {
    content = content.replace(
      'const code = (0, _iserror.default)(e) && e.code;',
      `const code = (0, _iserror.default)(e) && e.code;
        if (code === "EPERM" && !isDir) {
            try {
                const stat = await _fs.promises.stat(p);
                if (stat.isDirectory()) {
                    await _fs.promises.rmdir(p);
                    return;
                }
            } catch {}
        }`
    );
    content = content.replace(
      'const code = isError(e) && e.code;',
      `const code = isError(e) && e.code;
        if (code === "EPERM" && !isDir) {
            try {
                const stat = await promises.stat(p);
                if (stat.isDirectory()) {
                    await promises.rmdir(p);
                    return;
                }
            } catch {}
        }`
    );
  }

  // Handle OneDrive reparse points reporting as symlinks
  if (!content.includes('isSymlink = false;')) {
    content = content.replace(
      /const isSymlink = (?:part\.)?isSymbolicLink\(\);/g,
      `let isSymlink = part.isSymbolicLink();
        if (isSymlink) {
            try {
                const stats = await ${file.includes('esm') ? 'promises' : '_fs.promises'}.stat(absolutePath);
                isDirectory = stats.isDirectory();
                try {
                    await ${file.includes('esm') ? 'promises' : '_fs.promises'}.readlink(absolutePath);
                } catch {
                    isSymlink = false;
                }
            } catch {}
        }`
    );
  }

  fs.writeFileSync(file, content, 'utf8');
  console.log('[patch-next] Successfully patched', path.relative(__dirname, file));
}
