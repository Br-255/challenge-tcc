// Uses the installed compiler; emitted code and SQLite are confined to OS temp / memory.
const path = require('node:path')
const Module = require('node:module')
if (process.env.QUIZ_TEST_ROOT) {
  const original = Module._resolveFilename
  Module._resolveFilename = function (name, parent, ...rest) {
    if (name.startsWith('@/')) name = path.join(process.env.QUIZ_TEST_ROOT, 'src', name.slice(2))
    return original.call(this, name, parent, ...rest)
  }
} else {
  const fs = require('node:fs')
  const os = require('node:os')
  const { spawnSync } = require('node:child_process')
  const ts = require('typescript')
  const root = path.resolve(__dirname, '../..')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-backend-tests-'))
  const files = ts.sys.readDirectory(path.join(root, 'src/lib'), ['.ts'])
    .concat(ts.sys.readDirectory(path.join(root, 'src/app/api'), ['.ts']))
  const program = ts.createProgram(files, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10, esModuleInterop: true, skipLibCheck: true, strict: true,
    rootDir: root, outDir: temp, baseUrl: root, paths: { '@/*': ['src/*'] } })
  const diagnostics = ts.getPreEmitDiagnostics(program)
  if (diagnostics.length) {
    console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => '\n' }))
    process.exitCode = 1
  } else {
    program.emit()
    const result = spawnSync(process.execPath, ['--test', '--require', __filename,
      path.join(temp, 'src/lib/backend.test.js')], { stdio: 'inherit', env: { ...process.env,
        DATABASE_PATH: ':memory:', EVENT_TIMEZONE: 'America/Sao_Paulo', QUIZ_TEST_ROOT: temp,
        NODE_PATH: path.join(root, 'node_modules') } })
    process.exitCode = result.status ?? 1
  }
  // Temp artifacts intentionally retained for failed-run inspection; no live files are deleted.
  console.log(`Isolated test artifacts: ${temp}`)
}
