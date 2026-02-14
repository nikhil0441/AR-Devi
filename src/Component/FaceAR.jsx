import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const FaceAR = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const crownRef = useRef(null);
  const particlesRef = useRef(null);
  const tilakRef = useRef(null);

  const [status, setStatus] = useState("Starting...");

  useEffect(() => {
    if (!window.FaceMesh || !window.Camera) {
      setStatus("❌ MediaPipe missing!");
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(63, 640 / 480, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(640, 480);
    renderer.setClearColor(0x000000, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(0, 5, 5);
    scene.add(light);

    // ===== EXTRA: SPARKLE PARTICLES =====
    const pGeo = new THREE.BufferGeometry();
    const pCount = 30;
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 2;
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.08,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });
    const sparkles = new THREE.Points(pGeo, pMat);
    particlesRef.current = sparkles;
    scene.add(sparkles);

    // ===== EXTRA: RED TILAK =====
    const tilakGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const tilakMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tilak = new THREE.Mesh(tilakGeo, tilakMat);
    tilakRef.current = tilak;
    scene.add(tilak);

    new GLTFLoader().load("/crown.glb", (gltf) => {
      const crown = gltf.scene;
      crown.traverse((child) => {
        if (child.isMesh) child.material.side = THREE.DoubleSide;
      });
      crownRef.current = crown;
      scene.add(crown);
      setStatus("✅ Ready!");
    });

    const faceMesh = new window.FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (!crownRef.current || !results.multiFaceLandmarks?.[0]) {
        renderer.render(scene, camera);
        return;
      }

      const lm = results.multiFaceLandmarks[0];
      const forehead = lm[10];
      const leftEye = lm[33];
      const rightEye = lm[263];
      const nose = lm[1];
      const glabella = lm[168]; // Point for Tilak

      // ===== CROWN POSITION (TERA ORIGINAL) =====
      const x = (forehead.x - 0.5) * 8;
      const y = -(forehead.y - 0.5) * 1 + 1.5;
      const z = -forehead.z * 10;
      crownRef.current.position.set(x, y, z);

      // ===== CROWN ROTATION (TERA ORIGINAL) =====
      const tilt = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
      const pitch = (nose.y - forehead.y) * 2;
      crownRef.current.rotation.set(pitch, 0, tilt);

      // ===== CROWN SIZE (TERA ORIGINAL) =====
      const headSize = Math.abs(rightEye.x - leftEye.x);
      const scale = headSize * 3;
      crownRef.current.scale.set(scale, scale, scale);

      // ===== EXTRA EFFECTS LOGIC =====
      // Tilak position
      const tx = (glabella.x - 0.5) * 8;
      const ty = -(glabella.y - 0.5) * 6;
      const tz = -glabella.z * 10 + 0.2;
      tilakRef.current.position.set(tx, ty, tz);
      tilakRef.current.scale.set(headSize * 2, headSize * 2, headSize * 2);

      // Sparkles follow crown
      particlesRef.current.position.set(x, y + 0.5, z);
      particlesRef.current.rotation.y += 0.02;

      renderer.render(scene, camera);
    });

    const cam = new window.Camera(videoRef.current, {
      onFrame: async () => {
        await faceMesh.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    cam.start();

    return () => {
      cam.stop();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
      }}
    >
      <h1 style={{ color: "#ffd700", margin: 20 }}>👑 {status}</h1>
      <div
        style={{
          position: "relative",
          width: 640,
          height: 480,
          border: "3px solid #ffd700",
          borderRadius: 10,
        }}
      >
        <video
          ref={videoRef}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
          }}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            zIndex: 10,
          }}
        />
      </div>
      <div
        style={{
          marginTop: 20,
          padding: 15,
          background: "#222",
          borderRadius: 10,
          fontFamily: "monospace",
          textAlign: "center",
        }}
      >
        <p style={{ color: "gold" }}>✨ Sparkles & Tilak Added ✨</p>
        <p>Position aur Scale tera wala hi rakha hai.</p>
      </div>
    </div>
  );
};

export default FaceAR;
