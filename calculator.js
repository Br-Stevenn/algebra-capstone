// Usa window.math

// Esto se encarga de convertir la matriz a un arreglo
function toPlainArray(x) {
  if (x && typeof x === 'object' && typeof x.toArray === 'function') return x.toArray();
  return x;
}

// Esto pasa el string de la matriz a un array 3x3
export function parseMatrix(str) {
  let M;
  const s = (str || '').trim();

  try { M = JSON.parse(s); } catch { }

  if (!M) {
    try { M = window.math.evaluate(s); } catch { }
  }

  if (!M) {
    const rows = s.split(/[\n;]+/).map(r => r.trim()).filter(Boolean);
    if (rows.length) {
      M = rows.map(r => r.split(/[,\s]+/).filter(Boolean).map(Number));
    }
  }

  M = toPlainArray(M);

  if (!Array.isArray(M) || M.length !== 3 || !Array.isArray(M[0]) || M[0].length !== 3) {
    throw new Error('Matriz 3×3 inválida');
  }

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const v = Number(M[i][j]);
      if (!Number.isFinite(v)) throw new Error('Matriz 3×3 inválida (elementos no numéricos)');
      M[i][j] = v;
    }
  }
  return M;
}


// Esto pasa el string del vector a un array 3x1
export function parseVector(str) {
  let v;
  const s = (str || '').trim();

  try { v = JSON.parse(s); } catch { }

  if (!v) {
    try { v = window.math.evaluate(s); } catch { }
  }

  if (!v) {
    v = s.split(/[,\s]+/).filter(Boolean).map(Number);
  }

  v = toPlainArray(v);
  if (!Array.isArray(v)) v = [v];

  if (v.length !== 3 || !v.every(n => Number.isFinite(Number(n)))) {
    throw new Error('Vector 3×1 inválido');
  }
  return v.map(Number);
}

// Esto ya genera la transformación lineal
export function applyR3toR3(objects, M) {
  if (!Array.isArray(M) || M.length !== 3 || !Array.isArray(M[0]) || M[0].length !== 3) {
    throw new Error('Matriz 3×3 inválida');
  }
  function t(v) {
    const x = v.x, y = v.y, z = v.z;
    v.set(
      M[0][0] * x + M[0][1] * y + M[0][2] * z,
      M[1][0] * x + M[1][1] * y + M[1][2] * z,
      M[2][0] * x + M[2][1] * y + M[2][2] * z
    );
  }
  objects.forEach(obj => t(obj.position));
}

// Esto sólo colorea las cajas según la proyección R3 -> R1
export function colorByR3toR1(pickables, v) {
  if (!Array.isArray(v) || v.length !== 3) throw new Error('Vector 3×1 inválido');
  const proj = (pt) => v[0] * pt.x + v[1] * pt.y + v[2] * pt.z;
  let min = Infinity, max = -Infinity;
  const vals = pickables.map(b => { const s = proj(b.position); min = Math.min(min, s); max = Math.max(max, s); return s; });
  pickables.forEach((b, i) => {
    const t = (vals[i] - min) / ((max - min) || 1);
    b.material.color.setHSL(0.04 + 0.33 * t, 0.85, 0.55);
  });
}

// Esto multiplica una matriz 3x3 por un vector 3x1
export function mulMatVec3(M, p) {
  return [
    M[0][0] * p[0] + M[0][1] * p[1] + M[0][2] * p[2],
    M[1][0] * p[0] + M[1][1] * p[1] + M[1][2] * p[2],
    M[2][0] * p[0] + M[2][1] * p[1] + M[2][2] * p[2],
  ];
}

// Esto ya transforma los puntos usando la matriz
export function transformPoints(M, points) {
  return points.map(p => mulMatVec3(M, p));
}


// Esto es para el producto punto de dos vectores 3x1
export function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// Redondeo a decimales, pero creo que es más util un entero
export function round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d; }

// Esto es para convertir las posiciones de los objetos a un array plano
export function positionsToArray(objects) {
  return objects.map(o => [o.position.x, o.position.y, o.position.z]);
}

// Esto retorna un string redondeado
export function formatMatrix(M) {
  return M.map(r => r.map(v => String(round(v, 3)).padStart(6, ' ')).join(' ')).join('\n');
}

// Esto ya genera la tabla de posiciones
export function formatPositions(before, after, projVals) {
  const rows = [];
  for (let i = 0; i < before.length; i++) {
    const b = before[i].map(v => round(v, 2));
    const a = after[i].map(v => round(v, 2));
    const r = projVals ? round(projVals[i], 2) : '';
    rows.push(`<tr><td>${i}</td><td>[${b.join(', ')}]</td><td>→</td><td>[${a.join(', ')}]</td><td>${r}</td></tr>`);
  }
  return `<table style="width:100%;border-collapse:collapse">
    <thead><tr><th>#</th><th>Antes</th><th></th><th>Después</th><th>v·p</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table>`;
}
