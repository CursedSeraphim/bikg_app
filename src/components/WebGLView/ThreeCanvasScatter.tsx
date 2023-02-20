import React, { useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import * as THREE from 'three';
import { selectNodes } from '../Store/CSVSlice';

/**
 * to-do - do this the first time the data is loaded and store the result in the store
 *
 * */
function getMinMaxPositions(data) {
  let minX = Number.MAX_VALUE;
  let minY = Number.MAX_VALUE;
  let maxX = Number.MIN_VALUE;
  let maxY = Number.MIN_VALUE;

  data.forEach(({ x, y }) => {
    if (x < minX) {
      minX = x;
    }
    if (y < minY) {
      minY = y;
    }
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  });

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
  };
}

function normalizePositions(data, min, max) {
  const normalizedPositions = [];

  data.forEach(({ x, y }) => {
    const nx = ((x - min.x) / (max.x - min.x)) * 2 - 1;
    const ny = ((y - min.y) / (max.y - min.y)) * 2 - 1;
    normalizedPositions.push(nx, ny, 1);
  });

  return normalizedPositions;
}

function ThreeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const data = useSelector(selectNodes);

  useEffect(() => {
    if (!canvasRef.current || !data) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 0); // second param is opacity, 0 => transparent

    // Normalize the positions
    const { min, max } = getMinMaxPositions(data);
    const normalizedPositions = normalizePositions(data, min, max);

    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 3, color: 0xaaaaaa, sizeAttenuation: false });

    // // Assuming `data` is an array of objects with `x`, `y`, and `z` properties.
    // console.log('data:', data);
    // const positions = [];
    // data.forEach(({ id, x, y }) => {
    //   console.log('pushing vertex');
    //   positions.push(x, y, 1);
    // });

    const positionAttribute = new THREE.Float32BufferAttribute(normalizedPositions, 3);
    geometry.setAttribute('position', positionAttribute);

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const cubeGeometry = new THREE.BoxGeometry();
    cubeGeometry.translate(1, 0, 1);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    scene.add(cube);

    camera.position.z = 10;

    function animate() {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    }
    animate();
  }, [canvasRef, data]);

  return <canvas ref={canvasRef} />;
}

export default ThreeCanvas;
