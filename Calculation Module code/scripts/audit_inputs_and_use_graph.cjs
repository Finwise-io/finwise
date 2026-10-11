// AUDIT ONLY (2026-10-11) — audit_inputs_and_use: reads the code with the TypeScript compiler and
// writes, to the path given as argv[2], a JSON of:
//   units  — every registered function/orchestrator (by its /* ─ MK-… header) and every top-level
//            declaration in every file, with file, line, test-or-not
//   edges  — unit → unit, one per identifier that resolves (through imports) to another unit
//   facts  — per registered unit: parameters, fields read off its own parameters/locals, constants
//            read, numeric fallbacks (?? N, || N, param = N)
//   writes — every place a property name is WRITTEN (object-literal key, assignment, string key)
// Changes no app code. Run: node audit_inputs_and_use_graph.cjs OUT.json
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = process.argv[2];

const ROOTS = ['src', 'app', 'MoneyKeel', 'Calculation Module code'];
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name === 'node_modules') continue; walk(p); }
    else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.d.ts')) files.push(p);
  }
};
ROOTS.forEach((r) => walk(path.join(ROOT, r)));
const rel = (p) => path.relative(ROOT, p);
const isTest = (r) => /__tests__|\.test\.tsx?$|\.probe\.|scratch_tests|jest\.setup|\/bench\//.test(r);

const program = ts.createProgram(files, {
  allowJs: false, jsx: ts.JsxEmit.ReactNative, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler, baseUrl: ROOT, paths: { '@/*': ['./src/*'] },
  skipLibCheck: true, noEmit: true, esModuleInterop: true, allowSyntheticDefaultImports: true,
  resolveJsonModule: true, strict: false,
});
const checker = program.getTypeChecker();
const ours = new Set(files.map((f) => path.resolve(f)));

const units = [];            // {uid, id, name, file, line, start, end, test, kind}
const unitsByFile = new Map();
const HEADER = /^\/\* ─ (MK-[A-Z]{2}-[FO]-\d{3}) ─.*?(?:(\d) · ([A-Z][A-Z ()a-z-]*))?\s*$/;

function declName(n) {
  if (n.name && ts.isIdentifier(n.name)) return n.name.text;
  if (n.name && ts.isStringLiteral(n.name)) return n.name.text;
  if (ts.isExportAssignment(n)) return 'default';
  return null;
}
const DECL_KINDS = new Set([ts.SyntaxKind.FunctionDeclaration, ts.SyntaxKind.VariableDeclaration, ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyAssignment, ts.SyntaxKind.ClassDeclaration, ts.SyntaxKind.PropertyDeclaration, ts.SyntaxKind.ExportAssignment,
  ts.SyntaxKind.ShorthandPropertyAssignment]);

for (const f of files) {
  const sf = program.getSourceFile(f);
  if (!sf) continue;
  const r = rel(f);
  const list = [];
  // top-level declarations
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) {
      const nm = declName(st) || 'default';
      list.push({ name: nm, node: st });
    } else if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) list.push({ name: d.name.text, node: d });
    } else if (ts.isExportAssignment(st)) list.push({ name: 'default', node: st });
  }
  const text = sf.text;
  const lines = text.split('\n');
  // registered headers
  let off = 0;
  const lineStarts = sf.getLineStarts();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(HEADER);
    if (!m) continue;
    let j = i; while (j < lines.length && !lines[j].includes('*/')) j++;
    const hdr = lines.slice(i, j + 1).join('\n');
    const endPos = lineStarts[j] + lines[j].indexOf('*/') + 2;
    // first declaration node starting after the header
    let best = null;
    const visit = (n) => {
      if (best) return;
      if (n.getStart(sf) >= endPos && DECL_KINDS.has(n.kind)) { best = n; return; }
      if (n.end > endPos) ts.forEachChild(n, visit);
    };
    ts.forEachChild(sf, visit);
    if (!best) continue;
    let node = best;
    if (ts.isVariableDeclaration(node) === false && node.parent && ts.isVariableDeclarationList(node.parent)) node = node.parent.declarations[0];
    const hname = (lines[i + 1] || '').replace(/^\s*\*\s*/, '').trim();
    const entry = { name: declName(node) || hname, node, id: m[1], tier: m[2] ? `${m[2]} · ${m[3]}`.trim() : '', header: hdr, hname, hline: i + 1 };
    const same = list.find((x) => x.node === node);
    if (same) Object.assign(same, entry); else list.push(entry);
  }
  // THE STORE: each action of the one store is its own unit, so a screen that calls one action does
  // not count as calling every action (src/store/useStore.ts)
  if (r === 'src/store/useStore.ts') {
    let biggest = null;
    const v = (n) => { if (ts.isObjectLiteralExpression(n) && (!biggest || n.properties.length > biggest.properties.length)) biggest = n; ts.forEachChild(n, v); };
    v(sf);
    if (biggest) for (const pp of biggest.properties) if (pp.name && ts.isIdentifier(pp.name) && !list.find((x) => x.node === pp)) list.push({ name: 'store.' + pp.name.text, node: pp, storeProp: pp.name.text });
  }
  const us = list.map((x) => {
    const start = x.node.getStart(sf);
    const u = { uid: units.length, id: x.id || null, name: x.name, hname: x.hname || null, file: r, line: sf.getLineAndCharacterOfPosition(start).line + 1,
      start, end: x.node.end, test: isTest(r), tier: x.tier || null, header: x.header || null, node: x.node, storeProp: x.storeProp || null, kind: kindOf(x.node) };
    units.push(u); return u;
  });
  // file-level pseudo unit for statements outside declarations
  const top = { uid: units.length, id: null, name: '<module>', file: r, line: 1, start: 0, end: sf.end + 1, test: isTest(r), node: sf };
  units.push(top); us.push(top);
  unitsByFile.set(path.resolve(f), us);
}
function kindOf(n) {
  let i = n.initializer; while (i && (ts.isParenthesizedExpression(i) || ts.isAsExpression(i))) i = i.expression;
  if (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) return 'function';
  if (i && (ts.isArrowFunction(i) || ts.isFunctionExpression(i))) return 'function';
  if (i && ts.isCallExpression(i)) return 'call';
  if (ts.isClassDeclaration(n)) return 'class';
  return 'value';
}
const innermost = (absFile, pos) => {
  const us = unitsByFile.get(absFile); if (!us) return null;
  let best = null;
  for (const u of us) if (u.start <= pos && pos < u.end && (!best || (u.end - u.start) < (best.end - best.start))) best = u;
  return best;
};
const declUnit = (decl) => {
  const sf = decl.getSourceFile(); const abs = path.resolve(sf.fileName);
  if (!ours.has(abs)) return null;
  if ((ts.isPropertySignature(decl) || ts.isMethodSignature(decl)) && rel(sf.fileName) === 'src/store/useStore.ts' && decl.name) {
    const sp = (unitsByFile.get(abs) || []).find((u) => u.storeProp === decl.name.getText(sf));
    if (sp) return sp;
  }
  return innermost(abs, decl.getStart(sf));
};

const edges = new Map();     // "a>b" → count
let identSeen = 0, resolved = 0;
for (const f of files) {
  const sf = program.getSourceFile(f); if (!sf) continue;
  const abs = path.resolve(f);
  const visit = (n) => {
    // an import is not a use; a re-export is not either — EXCEPT in a route file, where
    // `export { default } from '…Screen'` is how the route shows its screen
    if (ts.isImportDeclaration(n) || (ts.isExportDeclaration(n) && n.moduleSpecifier && !rel(f).startsWith('app/'))) return;
    if (ts.isIdentifier(n)) {
      identSeen++;
      let sym = null;
      try { sym = checker.getSymbolAtLocation(n); } catch (e) {}
      const syms = [];
      if (sym) {
        syms.push(sym);
        if (sym.flags & ts.SymbolFlags.Alias) { try { syms.push(checker.getAliasedSymbol(sym)); } catch (e) {} }
      }
      if (n.parent && ts.isShorthandPropertyAssignment(n.parent)) {
        try { const v = checker.getShorthandAssignmentValueSymbol(n.parent); if (v) { syms.push(v); if (v.flags & ts.SymbolFlags.Alias) syms.push(checker.getAliasedSymbol(v)); } } catch (e) {}
      }
      const from = innermost(abs, n.getStart(sf));
      for (const s of syms) for (const d of (s.declarations || [])) {
        const to = declUnit(d);
        if (!to || !from || to === from) continue;
        // skip the unit's own name at its declaration site
        resolved++;
        const k = `${from.uid}>${to.uid}`; edges.set(k, (edges.get(k) || 0) + 1);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
}

// ── facts per registered unit ────────────────────────────────────────────────────────────────
const SKIP_FIELDS = new Set(['length', 'map', 'filter', 'reduce', 'forEach', 'some', 'every', 'find', 'findIndex', 'flatMap', 'push',
  'slice', 'join', 'includes', 'indexOf', 'keys', 'values', 'entries', 'toFixed', 'getTime', 'getFullYear', 'getMonth', 'getDate',
  'toISOString', 'trim', 'toLowerCase', 'toUpperCase', 'split', 'replace', 'startsWith', 'endsWith', 'concat', 'sort', 'match', 'test',
  'has', 'get', 'set', 'add', 'size', 'then', 'catch', 'apply', 'call', 'bind', 'toString', 'padStart', 'localeCompare', 'flat', 'fill',
  'at', 'from', 'isArray', 'max', 'min', 'abs', 'round', 'floor', 'ceil', 'pow', 'log', 'exp', 'sqrt', 'now', 'isFinite', 'parse',
  'stringify', 'assign', 'freeze', 'reverse', 'shift', 'unshift', 'pop', 'splice', 'getDay', 'setDate', 'setMonth', 'getHours', 'delete']);
const facts = {};
const _lc = new Map(); const lines0 = (sf) => { if (!_lc.has(sf)) _lc.set(sf, sf.text.split('\n')); return _lc.get(sf); };
for (const u of units) {
  if (!u.id) continue;
  const n = u.node; const sf = n.getSourceFile();
  let fn = n;
  if (ts.isVariableDeclaration(n) || ts.isPropertyAssignment(n) || ts.isPropertyDeclaration(n)) fn = n.initializer || n;
  while (fn && (ts.isParenthesizedExpression(fn) || ts.isAsExpression(fn))) fn = fn.expression;
  const params = [];
  const paramNames = new Set();
  const defaults = [];
  if (fn && fn.parameters) {
    for (const p of fn.parameters) {
      const ptype = p.type ? p.type.getText(sf).replace(/\s+/g, ' ').slice(0, 4000) : '';
      const props = [];
      if (p.type && ts.isTypeLiteralNode(p.type)) for (const m of p.type.members) if (m.name) props.push(m.name.getText(sf));
      if (ts.isIdentifier(p.name)) { params.push({ name: p.name.text, type: ptype, props, optional: !!(p.questionToken || p.initializer) }); paramNames.add(p.name.text); }
      else { const names = []; p.name.elements.forEach((e) => { if (ts.isIdentifier(e.name)) { names.push(e.name.text); paramNames.add(e.name.text); } }); params.push({ name: `{${names.join(', ')}}`, type: ptype, props: names }); }
      if (p.initializer && ts.isNumericLiteral(p.initializer)) defaults.push({ text: p.getText(sf).slice(0, 120), num: p.initializer.text, line: sf.getLineAndCharacterOfPosition(p.getStart(sf)).line + 1 });
    }
  }
  const fields = new Map();   // field → {line, base}
  const consts = new Map();
  const visit = (x) => {
    if (ts.isPropertyAccessExpression(x)) {
      const isCallee = x.parent && ts.isCallExpression(x.parent) && x.parent.expression === x;
      const nm = x.name.text;
      // root identifier of the chain
      let root = x.expression; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isNonNullExpression(root) || ts.isParenthesizedExpression(root) || ts.isCallExpression(root)) root = root.expression;
      let rootLocal = false; let fromCall = null; let base = null;
      if (ts.isIdentifier(root)) {
        base = root.text;
        const s = checker.getSymbolAtLocation(root);
        const d = s && s.declarations && s.declarations[0];
        if (d && d.getSourceFile() === sf && d.getStart(sf) >= u.start && d.getStart(sf) < u.end) {
          rootLocal = true;
          // a local made by calling another function: its fields are that function's output
          let init = ts.isVariableDeclaration(d) ? d.initializer : null;
          while (init && (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isAwaitExpression(init) || ts.isNonNullExpression(init))) init = init.expression;
          if (init && ts.isBinaryExpression(init)) init = init.left;
          if (init && ts.isCallExpression(init)) {
            let ce = init.expression; if (ts.isPropertyAccessExpression(ce)) ce = ce.name;
            let cs = null; try { cs = checker.getSymbolAtLocation(ce); if (cs && (cs.flags & ts.SymbolFlags.Alias)) cs = checker.getAliasedSymbol(cs); } catch (e) {}
            const cd = cs && cs.declarations && cs.declarations[0];
            const cu = cd ? declUnit(cd) : null;
            if (cu) fromCall = cu.uid;
          }
        }
        if (paramNames.has(root.text)) { rootLocal = true; fromCall = null; }
        if (!rootLocal && /^(useStore|store|state|getState)$/.test(root.text)) { rootLocal = true; base = 'store'; }
      }
      if (!isCallee && rootLocal && !SKIP_FIELDS.has(nm)) {
        if (!fields.has(nm)) fields.set(nm, { line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, text: x.getText(sf).slice(0, 80), base, fromCall, param: paramNames.has(base) });
      }
    }
    if (ts.isElementAccessExpression(x) && x.argumentExpression && ts.isStringLiteral(x.argumentExpression)) {
      const nm = x.argumentExpression.text;
      if (!fields.has(nm)) fields.set(nm, { line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, text: x.getText(sf).slice(0, 80) });
    }
    if (ts.isIdentifier(x) && /^[A-Z][A-Z0-9_]{2,}$/.test(x.text)) {
      const s = checker.getSymbolAtLocation(x);
      let s2 = s; if (s && (s.flags & ts.SymbolFlags.Alias)) { try { s2 = checker.getAliasedSymbol(s); } catch (e) {} }
      const d = s2 && s2.declarations && s2.declarations[0];
      if (d && ts.isVariableDeclaration(d) && d.initializer && ours.has(path.resolve(d.getSourceFile().fileName))) {
        const dsf = d.getSourceFile();
        const init = d.initializer.getText(dsf).replace(/\s+/g, ' ');
        if (!consts.has(x.text)) consts.set(x.text, { file: rel(dsf.fileName), line: dsf.getLineAndCharacterOfPosition(d.getStart(dsf)).line + 1, value: init.slice(0, 160),
          numeric: /^-?[\d_.]+$/.test(init.replace(/ as const$/, '')) });
      }
    }
    if (ts.isBinaryExpression(x) && (x.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || x.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      let r = x.right; if (ts.isPrefixUnaryExpression(r) && ts.isNumericLiteral(r.operand)) r = r.operand;
      if (ts.isNumericLiteral(r)) defaults.push({ text: x.getText(sf).replace(/\s+/g, ' ').slice(0, 140), num: r.text, line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1 });
    }
    if (ts.isNumericLiteral(x)) {
      const v = Number(x.text);
      const TRIV = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 30, 31, 52, 60, 100, 365, 366, 1000, 1e3, 0.5, 10000, 86400000, 864e5, 3600, 1440]);
      const par = x.parent; const gp = par && par.parent;
      let skip = TRIV.has(v);
      const callArgOf = (node) => { let c = node.parent; if (c && ts.isPrefixUnaryExpression(c)) c = c.parent; return c && ts.isCallExpression(c) && c.arguments.includes(node.parent && ts.isPrefixUnaryExpression(node.parent) ? node.parent : node) ? c : null; };
      const ce = callArgOf(x);
      if (ce) { const nmx = ts.isPropertyAccessExpression(ce.expression) ? ce.expression.name.text : (ts.isIdentifier(ce.expression) ? ce.expression.text : ''); if (/^(slice|toFixed|padStart|substring|substr|setDate|setMonth|setFullYear|Date|UTC|splice|round|toPrecision|repeat|charAt|at|fill|Array)$/.test(nmx)) skip = true; }
      if (par && ts.isElementAccessExpression(par)) skip = true;
      // inside a nested registered unit? that unit reports it
      const inner = innermost(path.resolve(sf.fileName), x.getStart(sf));
      if (inner && inner.uid !== u.uid && inner.id) skip = true;
      if (!skip) {
        const ln = sf.getLineAndCharacterOfPosition(x.getStart(sf)).line;
        const ctx = lines0(sf).slice(Math.max(0, ln - 4), ln + 3).join('\n');
        nums.push({ num: x.text, line: ln + 1, text: lines0(sf)[ln].trim().slice(0, 160), ctx: ctx.slice(0, 900) });
      }
    }
    ts.forEachChild(x, visit);
  };
  const nums = [];
  visit(n);
  facts[u.id] = { params, fields: [...fields].map(([k, v]) => ({ field: k, ...v })), consts: [...consts].map(([k, v]) => ({ name: k, ...v })), defaults, nums };
}

// ── every call of a registered function, with what is handed in ────────────────────────────
const calls = [];
for (const f of files) {
  const sf = program.getSourceFile(f); if (!sf) continue;
  const r = rel(f);
  const visit = (x) => {
    if (ts.isCallExpression(x)) {
      let ce = x.expression; if (ts.isPropertyAccessExpression(ce)) ce = ce.name;
      let cs = null; try { cs = checker.getSymbolAtLocation(ce); if (cs && (cs.flags & ts.SymbolFlags.Alias)) cs = checker.getAliasedSymbol(cs); } catch (e) {}
      const cd = cs && cs.declarations && cs.declarations[0];
      const cu = cd ? declUnit(cd) : null;
      if (cu && cu.id) {
        const from = innermost(path.resolve(f), x.getStart(sf));
        const props = {};
        x.arguments.forEach((a, i) => {
          if (ts.isObjectLiteralExpression(a)) a.properties.forEach((pp) => {
            if (pp.name) props[pp.name.getText(sf)] = (ts.isPropertyAssignment(pp) ? pp.initializer.getText(sf) : pp.getText(sf)).replace(/\s+/g, ' ').slice(0, 220);
            else if (ts.isSpreadAssignment(pp)) props['...' + i] = pp.expression.getText(sf).slice(0, 120);
          });
        });
        calls.push({ callee: cu.id, file: r, line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, from: from ? from.uid : null, test: isTest(r),
          args: x.arguments.map((a) => a.getText(sf).replace(/\s+/g, ' ').slice(0, 300)), props });
      }
    }
    ts.forEachChild(x, visit);
  };
  visit(sf);
}

// ── every write of a property name ───────────────────────────────────────────────────────────
const writes = Object.create(null);   // name → [{file,line,how,unit}]
const STORE_ACTIONS = new Set(units.filter((u) => u.storeProp && /^(set|add|update|delete|record|toggle|save|adopt|confirm|resolve|import|fund|allocate|seed)[A-Z]/.test(u.storeProp)).map((u) => u.storeProp));
const reads = Object.create(null); const mentions = Object.create(null); const storeCalls = [];
const ctxOf = (node) => {
  // the call (or JSX attribute) an object key / string sits inside — up to six steps out
  let x = node.parent; let hops = 0;
  while (x && hops < 6) {
    if (ts.isJsxAttribute(x)) return { jsx: x.name.getText() };
    if (ts.isCallExpression(x)) { const e = x.expression; return { callee: ts.isPropertyAccessExpression(e) ? e.name.text : (ts.isIdentifier(e) ? e.text : '') }; }
    if (ts.isReturnStatement(x) || ts.isVariableDeclaration(x) || ts.isArrowFunction(x)) return { other: ts.SyntaxKind[x.kind] };
    x = x.parent; hops++;
  }
  return {};
};
const addW = (nm, sf, node, how) => {
  const r = rel(sf.fileName); if (isTest(r)) return;
  const u = innermost(path.resolve(sf.fileName), node.getStart(sf));
  (writes[nm] = writes[nm] || []).push({ file: r, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, how, unit: u ? u.uid : null, ...ctxOf(node) });
};
for (const f of files) {
  const sf = program.getSourceFile(f); if (!sf || isTest(rel(f))) continue;
  const visit = (x) => {
    if ((ts.isPropertyAssignment(x) || ts.isShorthandPropertyAssignment(x)) && x.name && (ts.isIdentifier(x.name) || ts.isStringLiteral(x.name)) && ts.isObjectLiteralExpression(x.parent)) addW(x.name.text, sf, x, 'object key');
    if (ts.isBinaryExpression(x) && x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && x.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const l = x.left;
      if (ts.isPropertyAccessExpression(l)) addW(l.name.text, sf, x, 'assignment');
      if (ts.isElementAccessExpression(l) && ts.isStringLiteral(l.argumentExpression)) addW(l.argumentExpression.text, sf, x, 'assignment');
    }
    if (ts.isStringLiteral(x) && /^[A-Za-z_][A-Za-z0-9_]{2,}$/.test(x.text) && x.parent && (ts.isCallExpression(x.parent) || ts.isPropertyAssignment(x.parent) || ts.isArrayLiteralExpression(x.parent) || ts.isJsxAttribute(x.parent) || ts.isConditionalExpression(x.parent) || ts.isBinaryExpression(x.parent)))
      addW(x.text, sf, x, 'string key');
    if (ts.isPropertyAccessExpression(x) && !(ts.isBinaryExpression(x.parent) && x.parent.left === x && x.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken)) {
      const nm = x.name.text; const r = rel(sf.fileName);
      const u = innermost(path.resolve(sf.fileName), x.getStart(sf));
      (reads[nm] = reads[nm] || []).push({ file: r, line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, unit: u ? u.uid : null });
    }
    if (ts.isElementAccessExpression(x) && x.argumentExpression && ts.isStringLiteral(x.argumentExpression)) {
      const nm = x.argumentExpression.text; const r = rel(sf.fileName);
      const u = innermost(path.resolve(sf.fileName), x.getStart(sf));
      (reads[nm] = reads[nm] || []).push({ file: r, line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, unit: u ? u.uid : null });
    }
    if (ts.isStringLiteral(x) && /^[A-Za-z_][A-Za-z0-9_]{2,}$/.test(x.text)) {
      const u = innermost(path.resolve(sf.fileName), x.getStart(sf));
      (mentions[x.text] = mentions[x.text] || []).push({ file: rel(sf.fileName), line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, unit: u ? u.uid : null });
    }
    // what a screen hands to a store action — the fields a person's entry is saved under
    if (ts.isCallExpression(x)) {
      let ce = x.expression; if (ts.isPropertyAccessExpression(ce)) ce = ce.name;
      let cs = null; try { cs = checker.getSymbolAtLocation(ce); } catch (e) {}
      const cd = cs && cs.declarations && cs.declarations[0];
      const cu = cd ? declUnit(cd) : null;
      const isSetState = ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'setState';
      const calleeName = ts.isIdentifier(ce) ? ce.text : '';
      const byName = STORE_ACTIONS.has(calleeName) ? calleeName : null;
      if ((cu && cu.storeProp) || isSetState || byName) {
        const keys = [];
        const grab = (o, depth) => { if (!o) return; if (ts.isObjectLiteralExpression(o)) o.properties.forEach((pp) => { if (pp.name && (ts.isIdentifier(pp.name) || ts.isStringLiteral(pp.name))) { keys.push(pp.name.text); if (depth < 1 && ts.isPropertyAssignment(pp)) grab(pp.initializer, depth + 1); } }); };
        x.arguments.forEach((a) => grab(a, 0));
        storeCalls.push({ action: cu && cu.storeProp ? cu.storeProp : (byName || 'setState'), file: rel(sf.fileName), line: sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1, keys, unit: (innermost(path.resolve(sf.fileName), x.getStart(sf)) || {}).uid });
      }
    }
    // template literal heads like `ri_${k}`
    if (ts.isTemplateExpression(x)) addW('TEMPLATE:' + x.head.text, sf, x, 'built key');
    ts.forEachChild(x, visit);
  };
  visit(sf);
}

const out = {
  counts: { files: files.length, units: units.length, registered: units.filter((u) => u.id).length, identSeen, resolved, edges: edges.size },
  units: units.map(({ node, ...u }) => u),
  edges: [...edges.keys()].map((k) => k.split('>').map(Number)),
  facts, writes, calls, reads, mentions, storeCalls,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(JSON.stringify(out.counts));
