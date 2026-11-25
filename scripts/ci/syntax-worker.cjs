// Parse with the running Node/V8 grammar, without executing or linking modules.
const vm = require('node:vm');
const fs = require('node:fs');
const files = JSON.parse(fs.readFileSync(0, 'utf8'));
let failures = 0;
for (const file of files) {
  try {
    const source = fs.readFileSync(file, 'utf8').replace(/^#![^\n]*/, '');
    if (file.endsWith('.cjs'))
      new vm.Script('(function(exports,require,module,__filename,__dirname){\n' + source + '\n})', {
        filename: file,
      });
    else new vm.SourceTextModule(source, { identifier: file });
  } catch (error) {
    console.error(file + ': ' + error.message);
    failures++;
  }
}
if (failures) process.exitCode = 1;
else
  console.log('Syntax checked with ' + process.version + ': ' + files.length + ' JavaScript files');
