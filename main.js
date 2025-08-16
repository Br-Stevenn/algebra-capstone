import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { createShelves } from './shelves.js';
import {
  fillZBoxes,
  moveBoxAlongPath,
  colorByIndex,
  buildBoxesFromZ
} from './boxes.js';
import {
  parseMatrix,
  formatMatrix,
  formatPositions,
  parsePointsMatrix,
  comparePoints,
  parseMatrixZ,
  mulMatVec3
} from './calculator.js';

// Para ver como funciona Three.js
// https://threejs.org/manual/#en/installation

// Para ver como funciona la creación de escenas
// https://threejs.org/manual/#en/creating-a-scene

// Para ver como funciona la cámara
// https://threejs.org/docs/#api/en/cameras/PerspectiveCamera

// Para ver como funciona el renderizador
// https://threejs.org/docs/#api/en/renderers/WebGLRenderer

// Para ver como funcionana las luces
// https://threejs.org/docs/#api/en/lights/AmbientLight
// https://threejs.org/docs/#api/en/lights/DirectionalLight

// Para ver como funciona la generacion de cuadrículas y ejes
// https://threejs.org/docs/#api/en/helpers/GridHelper
// https://threejs.org/docs/#api/en/helpers/AxesHelper

// Para ver como funciona Mesh, SphereGeometry y MeshStandardMateria
// https://threejs.org/docs/#api/en/objects/Mesh
// https://threejs.org/docs/#api/en/geometries/SphereGeometry
// https://threejs.org/docs/#api/en/materials/MeshStandardMaterial

// Para ver como funciona CylinderGeometry
// https://threejs.org/docs/#api/en/geometries/CylinderGeometry

// Para ver como funciona BoxGeometry
// https://threejs.org/docs/#api/en/geometries/BoxGeometry

// Para ver como funciona Vector3
// https://threejs.org/docs/#api/en/math/Vector3

// Para ver como funciona clook
// https://threejs.org/docs/#api/en/core/Clock


// Esto es para crear la escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Configuración de la cámara
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(8, 7, 12); camera.lookAt(0, 0, 0);

// Configuración del renderizador
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Creación de las luces
scene.add(new THREE.AmbientLight(0xffffff, .7));
const dir = new THREE.DirectionalLight(0xffffff, .9);
dir.position.set(6, 10, 6); dir.castShadow = true; scene.add(dir);

// Agregamos una cuadrícula y ejes
scene.add(new THREE.GridHelper(26, 26, 0x555555, 0x222222));
scene.add(new THREE.AxesHelper(4));

// Constantes de configuración
const unit = 1.2, shelfY = 0.6;
const tmpV = new THREE.Vector3();
const pickables = [];
const { shelfZ, shelfX, zAnchors, xAnchors } = createShelves(scene, { unit, shelfY });


// Llenar Z evitando el centro (La idea es generarlos de forma aleatoria basado en la matriz)
fillZBoxes(scene, zAnchors, pickables, tmpV);
pickables.forEach((b, i) => b.material.color.copy(colorByIndex(i, pickables.length)));

// Aquí ya parten los controles para manejar los elementos de la escena
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const shelfQuat = new THREE.Quaternion();
shelfX.getWorldQuaternion(shelfQuat);
pickables.forEach(b => b.setRotationFromQuaternion(shelfQuat));

function colorizeCurrent() {
  pickables.forEach((b, i) => b.material.color.copy(colorByIndex(i, pickables.length)));
}

function move(dt) {
  const v = 3.2 * dt;

  // Posicion de la cámara
  if (keys['j']) camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 1 * dt);
  if (keys['l']) camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -1 * dt);
  if (keys['i']) camera.position.y += v;
  if (keys['k']) camera.position.y -= v;
  if (keys['u']) camera.position.multiplyScalar(0.98);
  if (keys['o']) camera.position.multiplyScalar(1.02);
  camera.lookAt(0, 0, 0);
}

document.getElementById('resetBtn').onclick = () => location.reload();

// Esta función transforma las posiciones de los objetos a un array plano
function renderResults(M, beforeLocal, afterLocal, colors) {
  const mInfo = document.getElementById('mInfo');
  const posTables = document.getElementById('posTables');
  mInfo.textContent = `Matriz (R³→R³):\n${formatMatrix(M)}`;
  posTables.innerHTML = formatPositions(beforeLocal, afterLocal, null, colors);
}
document.getElementById('clearResults').onclick = () => {
  document.getElementById('mInfo').textContent = '';
  document.getElementById('posTables').innerHTML = '';
};


// 
let lastAfter = null;
document.getElementById('applyMat').onclick = async () => {
  try {
    const Z = parseMatrixZ(document.getElementById('matZ').value);
    buildBoxesFromZ(scene, zAnchors, Z, pickables, tmpV, shelfZ);
    colorizeCurrent();

    const M = parseMatrix(document.getElementById('mat33').value);

    const beforeLocal = pickables.map(b => {
      const p = b.userData.zLocal;
      return [p.x, p.y, p.z];
    });

    const afterLocal = beforeLocal.map(p => mulMatVec3(M, p));

    lastAfter = afterLocal;

    const colors = pickables.map(b => `#${b.material.color.getHexString()}`);
    renderResults(Z, beforeLocal, afterLocal, colors);

    const lift = 1;
    for (let i = 0; i < pickables.length; i++) {
      const box = pickables[i];
      const toLocal = new THREE.Vector3(...afterLocal[i]);
      const toWorld = shelfX.localToWorld(toLocal.clone());

      const from = box.position.clone();
      const mid1 = from.clone(); mid1.x += lift;
      const mid2 = toWorld.clone(); mid2.x += lift;

      await moveBoxAlongPath(box, [from, mid1, mid2, toWorld], 0.9);
    }

    const qX = new THREE.Quaternion(); shelfX.getWorldQuaternion(qX);
    pickables.forEach(b => b.setRotationFromQuaternion(qX));

  } catch (err) {
    alert(err.message || String(err));
  }
};

document.getElementById('compareBtn').onclick = () => {
  const out = document.getElementById('compareMsg');
  try {
    if (!lastAfter) { out.textContent = 'Aplica una matriz primero.'; out.style.color = '#ffd27d'; return; }
    const E = parsePointsMatrix(document.getElementById('matResult').value);
    const res = comparePoints(E, lastAfter, 1e-2);
    if (res.ok) { out.textContent = res.message; out.style.color = '#7dffa7'; }
    else if (res.mismatches) {
      const first = res.mismatches.slice(0, 3).map(m =>
        `fila ${m.row}, col ${m.col}: exp=${m.exp.toFixed(3)} vs got=${m.got.toFixed(3)} (Δ=${m.diff.toFixed(3)})`
      ).join(' • ');
      out.textContent = `No coincide: ${first}${res.mismatches.length > 3 ? ' …' : ''}`;
      out.style.color = '#ff9b7d';
    } else { out.textContent = res.message || 'No coincide'; out.style.color = '#ff9b7d'; }
  } catch (e) {
    out.textContent = e.message || 'Error al parsear'; out.style.color = '#ffd27d';
  }
};


// Esto genera el bucle de animación (Para que se vea más bonito)
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  move(clock.getDelta());
  renderer.render(scene, camera);
}
animate();