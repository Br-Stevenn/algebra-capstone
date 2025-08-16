// Usa window.math

// Esto se encarga de convertir la matriz a un arreglo
function toPlainArray(x) {
  if (x && typeof x === 'object' && typeof x.toArray === 'function') return x.toArray();
  return x;
}

// Redondeo a decimales, pero creo que es más util un entero
export function round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d; }

// Esto pasa el string de la matriz a un array 3x3
export function parseMatrix(str) {
  let M; const s = (str || '').trim();
  try { M = JSON.parse(s); } catch { }
  if (!M) { try { M = window.math.evaluate(s); } catch { } }
  if (!M) {
    const rows = s.split(/[\n;]+/).map(r => r.trim()).filter(Boolean);
    if (rows.length) { M = rows.map(r => r.split(/[,\s]+/).filter(Boolean).map(Number)); }
  }
  M = toPlainArray(M);
  if (!Array.isArray(M) || M.length !== 3 || !Array.isArray(M[0]) || M[0].length !== 3) throw new Error('Matriz 3×3 inválida');
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const v = Number(M[i][j]); if (!Number.isFinite(v)) throw new Error('Matriz 3×3 inválida');
    M[i][j] = v;
  }
  return M;
}


// Esto retorna un string redondeado
export function formatMatrix(M) {
  return M.map(r => r.map(v => String(round(v, 3)).padStart(6, ' ')).join(' ')).join('\n');
}

// Esto ya genera la tabla de posiciones
export function formatPositions(before, after) {
  const rows = [];
  for (let i = 0; i < before.length; i++) {
    const b = before[i].map(v => round(v, 2));
    const a = after[i].map(v => round(v, 2));
    rows.push(`<tr><td>${i}</td><td>[${b.join(', ')}]</td><td>→</td><td>[${a.join(', ')}]</td></tr>`);
  }
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr><th>#</th><th>Antes</th><th></th><th>Después</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table>`;
}


// Esto es para parsear la matriz resultado (Nx3)
export function parsePointsMatrix(str) {
  const s = (str || '').trim();
  if (!s) throw new Error('La matriz resultado está vacía');

  let A;
  try { A = JSON.parse(s); } catch { }
  if (!A) { try { A = window.math.evaluate(s); } catch { } }
  if (!A) {
    const rows = s.split(/[\n;]+/).map(r => r.trim()).filter(Boolean);
    A = rows.map(r => r.split(/[,\s]+/).filter(Boolean).map(Number));
  }
  A = toPlainArray(A);

  if (!Array.isArray(A) || A.length === 0) throw new Error('Formato inválido de matriz resultado');
  for (const r of A) {
    if (!Array.isArray(r) || r.length !== 3 || !r.every(n => Number.isFinite(Number(n)))) {
      throw new Error('Cada fila debe tener 3 números (Nx3)');
    }
  }
  return A.map(row => row.map(Number));
}

// Esto compara dos matrices de puntos (Nx3)
export function comparePoints(expected, actual, tol = 1e-2) {
  if (expected.length !== actual.length) {
    return { ok: false, message: `Filas distintas: esperado ${expected.length}, actual ${actual.length}` };
  }
  const mismatches = [];
  for (let i = 0; i < expected.length; i++) {
    for (let j = 0; j < 3; j++) {
      const diff = Math.abs(expected[i][j] - actual[i][j]);
      if (diff > tol) mismatches.push({ row: i, col: j, exp: expected[i][j], got: actual[i][j], diff });
    }
  }
  return mismatches.length ? { ok: false, mismatches } : { ok: true, message: `¡Coinciden! (tol=${tol})` };
}

export function parseMatrixZ(str) {
  const s = (str || '').trim();
  let Z;

  // JSON primero
  try { Z = JSON.parse(s); } catch { }

  // Usamos math.js para evaluar expresiones
  if (!Z) { try { Z = window.math?.evaluate(s); } catch { } }

  // Si no es JSON ni math, lo manejamos como string
  if (!Z) {
    const rows = s.split(/[\n;]+/).map(r => r.trim()).filter(Boolean);
    Z = rows.map(r => r.split(/[,\s]+/).filter(Boolean).map(Number));
  }

  // Lo convertimos a un array plano
  if (Z && typeof Z === 'object' && typeof Z.toArray === 'function') Z = Z.toArray();

  // Validación de la matriz Z
  if (!Array.isArray(Z) || Z.length !== 3 || !Z.every(r => Array.isArray(r) && r.length === 3)) {
    throw new Error('Matriz Z inválida: debe ser 3×3');
  }

  // Normalizamos los valores a -1, 0 o 1
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const v = Number(Z[i][j]);
      if (!Number.isFinite(v)) throw new Error('Matriz Z: valores no numéricos');
      const r = Math.round(v);
      if (![-1, 0, 1].includes(r)) throw new Error('Matriz Z: sólo -1, 0 o 1');
      Z[i][j] = r;
    }
  }
  return Z;
}

// Multiplica una matriz 3x3 por un vector 3D
export function mulMatVec3(M, v) {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}