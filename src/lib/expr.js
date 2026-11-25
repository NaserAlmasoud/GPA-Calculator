// Small, safe formula evaluator for syllabus formulas such as "9/40 * (m1 + m2)".
// Supports numbers, variables, + - * / ^, parentheses, unary minus and a few functions.
// No eval(): formulas come from pasted text.

const FUNCS = {
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  clamp: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
  avg: (...xs) => xs.reduce((a, b) => a + b, 0) / xs.length,
};

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const num = Number(src.slice(i, j));
      if (Number.isNaN(num)) throw new Error(`Bad number "${src.slice(i, j)}"`);
      tokens.push({ type: 'num', value: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ type: 'id', value: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/^(),'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    throw new Error(`Unexpected character "${ch}"`);
  }
  return tokens;
}

// Compiles to an AST once; evaluate many times.
export function compile(src) {
  const tokens = tokenize(String(src));
  let pos = 0;
  const peek = () => tokens[pos];
  const take = (value) => {
    const t = tokens[pos];
    if (!t || (value && t.value !== value)) throw new Error(`Expected "${value}"`);
    pos++;
    return t;
  };

  function expression() {
    let node = term();
    while (peek() && (peek().value === '+' || peek().value === '-')) {
      const op = take().value;
      node = { op, a: node, b: term() };
    }
    return node;
  }
  function term() {
    let node = unary();
    while (peek() && (peek().value === '*' || peek().value === '/')) {
      const op = take().value;
      node = { op, a: node, b: unary() };
    }
    return node;
  }
  // unary minus binds looser than ^, so -2^2 = -4
  function unary() {
    if (peek() && peek().value === '-') { take('-'); return { op: 'neg', a: unary() }; }
    if (peek() && peek().value === '+') { take('+'); return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().value === '^') {
      take('^');
      return { op: '^', a: base, b: unary() };
    }
    return base;
  }
  function primary() {
    const t = peek();
    if (!t) throw new Error('Unexpected end of formula');
    if (t.type === 'num') { pos++; return { num: t.value }; }
    if (t.type === 'id') {
      pos++;
      if (peek() && peek().value === '(') {
        if (!FUNCS[t.value]) throw new Error(`Unknown function "${t.value}"`);
        take('(');
        const args = [];
        if (peek() && peek().value !== ')') {
          args.push(expression());
          while (peek() && peek().value === ',') { take(','); args.push(expression()); }
        }
        take(')');
        return { fn: t.value, args };
      }
      return { id: t.value };
    }
    if (t.value === '(') { take('('); const e = expression(); take(')'); return e; }
    throw new Error(`Unexpected "${t.value}"`);
  }

  const ast = expression();
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos].value}"`);
  return ast;
}

export function variablesOf(ast, out = new Set()) {
  if (ast.id) out.add(ast.id);
  if (ast.a) variablesOf(ast.a, out);
  if (ast.b) variablesOf(ast.b, out);
  if (ast.args) ast.args.forEach((x) => variablesOf(x, out));
  return out;
}

export function evaluate(ast, vars) {
  if ('num' in ast) return ast.num;
  if (ast.id) {
    const v = vars[ast.id];
    if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`Missing value "${ast.id}"`);
    return v;
  }
  if (ast.fn) return FUNCS[ast.fn](...ast.args.map((x) => evaluate(x, vars)));
  const a = evaluate(ast.a, vars);
  switch (ast.op) {
    case 'neg': return -a;
    case '+': return a + evaluate(ast.b, vars);
    case '-': return a - evaluate(ast.b, vars);
    case '*': return a * evaluate(ast.b, vars);
    case '/': return a / evaluate(ast.b, vars);
    case '^': return a ** evaluate(ast.b, vars);
    default: throw new Error('Bad formula');
  }
}

export function evalFormula(src, vars) {
  return evaluate(compile(src), vars);
}
