const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'src', 'routes');
const controllersDir = path.join(__dirname, '..', 'src', 'controllers');

function parseRouteFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {
    file: path.basename(filePath),
    controllerFile: null,
    controllerVar: null,
    methods: new Set()
  };

  // find controller require: const X = require('../controllers/name');
  const reqMatch = content.match(/const\s+(\w+)\s*=\s*require\(['\"]\.{2}\/controllers\/(\w+)['\"]\)/);
  if (reqMatch) {
    result.controllerVar = reqMatch[1];
    result.controllerFile = reqMatch[2] + '.js';
  }

  if (!result.controllerVar) return result;

  // find occurrences of controllerVar.method
  const methodRegex = new RegExp(result.controllerVar + "\\.(\\w+)", 'g');
  let m;
  while ((m = methodRegex.exec(content)) !== null) {
    result.methods.add(m[1]);
  }

  return result;
}

function checkControllers() {
  const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  const report = [];

  for (const f of files) {
    const r = parseRouteFile(path.join(routesDir, f));
    if (!r.controllerFile) {
      report.push({ file: r.file, ok: true, note: 'no controller required (static routes or middleware only)' });
      continue;
    }

    const controllerPath = path.join(controllersDir, r.controllerFile);
    if (!fs.existsSync(controllerPath)) {
      report.push({ file: r.file, ok: false, note: `controller file not found: ${r.controllerFile}` });
      continue;
    }

    const controller = require(controllerPath);
    const missing = [];
    for (const method of r.methods) {
      if (typeof controller[method] !== 'function') {
        missing.push(method);
      }
    }

    if (missing.length > 0) {
      report.push({ file: r.file, ok: false, note: `missing methods: ${missing.join(', ')}` });
    } else {
      report.push({ file: r.file, ok: true, note: `all methods present (${[...r.methods].join(', ')})` });
    }
  }

  console.log('\nController check report:');
  for (const r of report) {
    if (r.ok) {
      console.log(`  [OK]  ${r.file} - ${r.note}`);
    } else {
      console.log(`  [ERR] ${r.file} - ${r.note}`);
    }
  }

  const errors = report.filter(r => !r.ok);
  if (errors.length > 0) {
    console.log('\nSome controllers are missing methods or files. Please review the errors above.');
    process.exitCode = 2;
  } else {
    console.log('\nAll route controllers appear to export the required handler functions.');
  }
}

if (require.main === module) {
  checkControllers();
}

module.exports = { checkControllers };
