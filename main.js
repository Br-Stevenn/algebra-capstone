import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { createShelves } from './shelves.js';
import { spawnBox, fillZBoxes, tryPick, tryPlace, snapAll, moveAllZtoX, snapAllToX } from './boxes.js';
import { applyR3toR3, colorByR3toR1, parseMatrix, parseVector, positionsToArray, transformPoints, dot3, formatMatrix, formatPositions } from './calculator.js';


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

const { shelfZ, shelfX, zAnchors, xAnchors, buildXShelf, snapTargets } = createShelves(scene, { unit, shelfY });

// Llenar Z evitando el centro (La idea es generarlos de forma aleatoria basado en la matriz)
fillZBoxes(scene, zAnchors, pickables, tmpV);

// Bolita (Esto hay que borrarlo, sólo era de referencia y pruebas)
const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x2b6cff })
);
ball.position.set(-1.5, 0.35, 2.2);
scene.add(ball);

// Garra (esto hay que borrarlo, no se alcanza a implementar)
const claw = new THREE.Group();
const arm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.08, 1.6, 16),
  new THREE.MeshStandardMaterial({ color: 0xcccccc })
);
arm.rotation.z = Math.PI / 2;

// Añadir el brazo y los puntos de la garra
const p1 = new THREE.Mesh(new THREE.BoxGeometry(.1, .4, .1), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
const p2 = p1.clone();
p1.position.set(.85, .2, 0); p2.position.set(.85, -.2, 0);
claw.add(arm, p1, p2);
claw.position.set(-2, 1.2, 2.2);
scene.add(claw);

let clawOpen = true;
function setClaw(open) { clawOpen = open; const gap = open ? 0.22 : 0.08; p1.position.y = gap; p2.position.y = -gap; }
setClaw(true);

// Esto es una referencia para el pick (Tampoco se alcanza a implementar)
const carriedRef = { current: null };

// Aquí ya parten los controles para manejar los elementos de la escena
const keys = {};
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function move(dt) {
  const v = 3.2 * dt;

  // Garra
  if (keys['a']) claw.position.x -= v;
  if (keys['d']) claw.position.x += v;
  if (keys['w']) claw.position.z -= v;
  if (keys['s']) claw.position.z += v;
  if (keys['q']) claw.position.y += v;
  if (keys['e']) claw.position.y -= v;

  // Bola
  if (keys['arrowleft']) ball.position.x -= v;
  if (keys['arrowright']) ball.position.x += v;
  if (keys['arrowup']) ball.position.z -= v;
  if (keys['arrowdown']) ball.position.z += v;

  // Mover la caja
  if (carriedRef.current) carriedRef.current.position.copy(claw.position).add(new THREE.Vector3(0, -0.25, 0));

  // Posicion de la cámara
  if (keys['j']) camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 1 * dt);
  if (keys['l']) camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -1 * dt);
  if (keys['i']) camera.position.y += v;
  if (keys['k']) camera.position.y -= v;
  if (keys['u']) camera.position.multiplyScalar(0.98);
  if (keys['o']) camera.position.multiplyScalar(1.02);
  camera.lookAt(0, 0, 0);

  // Rotación de estanterías (Esro era más de pruebas, pero se puede eliminar)
  const r = 1.5 * dt;
  if (keys['1']) shelfZ.rotation.y += r;
  if (keys['2']) shelfZ.rotation.y -= r;
  if (keys['3']) shelfX.rotation.y += r;
  if (keys['4']) shelfX.rotation.y -= r;
}

// Formatear posiciones para mostrar en tabla
document.getElementById('shelfXMode').onchange = (e) => {
  buildXShelf(e.target.value);
};


document.getElementById('toggleClaw').onclick = () => setClaw(!clawOpen);
document.getElementById('pick').onclick = () => tryPick(claw, pickables, carriedRef, clawOpen);
document.getElementById('place').onclick = () => { setClaw(true); tryPlace(claw, snapTargets, carriedRef, tmpV); };
document.getElementById('snap').onclick = () => snapAll(pickables, snapTargets, tmpV);
document.getElementById('resetBtn').onclick = () => location.reload();

document.getElementById('applyMat').onclick = async () => {
  try {
    const M = parseMatrix(document.getElementById('mat33').value);
    const v = parseVector(document.getElementById('vec31').value);

    // Aplica R3 -> R3 a las cajas
    applyR3toR3([...pickables], M);

    // Colorea por proyección R3 -> R1 (Esto se hace para pruebas y saber como camian las cajas)
    colorByR3toR1(pickables, v);

    // Mueve de forma automatica Z -> X (Se basa en las anclas actuales de X: 3×3 o 1×1)
    await moveAllZtoX(pickables, xAnchors, tmpV);

  } catch (err) {
    alert(err.message || String(err));
  }
};

// Esta función transforma las posiciones de los objetos a un array plano
// La idea es luego comparar las posiciones antes y después de aplicar la matriz
function renderResults(M, v, beforePosArr, afterPosArr){
  const mInfo = document.getElementById('mInfo');
  const posTables = document.getElementById('posTables');
  const projVals = afterPosArr.map(p => dot3(v,p));
  mInfo.textContent =
    `Matriz (R³→R³):\n${formatMatrix(M)}\n\n` +
    `Vector (R³→R¹): [${v.map(n=>n.toFixed(3)).join(', ')}]`;
  posTables.innerHTML = formatPositions(beforePosArr, afterPosArr, projVals);
}

document.getElementById('clearResults').onclick = ()=>{
  document.getElementById('mInfo').textContent = '';
  document.getElementById('posTables').innerHTML = '';
};


document.getElementById('applyMat').onclick = async ()=>{
  try{
    const M = parseMatrix(document.getElementById('mat33').value);
    const v = parseVector(document.getElementById('vec31').value);

    // Captura coordenadas actuales)
    const before = positionsToArray(pickables);

    // Calcula en memoria los nuevos puntos
    const after  = transformPoints(M, before);

    renderResults(M, v, before, after);

    // Actualiza la escena para que coincida con los nuevos puntos
    for (let i=0;i<pickables.length;i++){
      const p = after[i];
      pickables[i].position.set(p[0], p[1], p[2]);
    }

    // Esto es para colorear las cajas según la proyección R3 -> R1
    colorByR3toR1(pickables, v);

    // Movemos automáticamente Z -> X despues de aplicar
    if (typeof xAnchors !== 'undefined' && xAnchors.length){
      await moveAllZtoX(pickables, xAnchors, tmpV);
    }

  }catch(err){
    alert(err.message || String(err));
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
