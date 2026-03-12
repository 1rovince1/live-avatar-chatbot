// // // // // In frontend/main.js

// // // // import * as THREE from 'three';
// // // // import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// // // // import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// // // // // --- Basic Three.js Setup (unchanged) ---
// // // // const scene = new THREE.Scene();
// // // // scene.background = new THREE.Color(0x222222);

// // // // const canvas = document.getElementById('avatar-canvas');
// // // // const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// // // // const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
// // // // camera.position.set(0, 1.2, 1.5);
// // // // scene.add(camera);

// // // // const controls = new OrbitControls(camera, renderer.domElement);
// // // // controls.target.set(0, 1, 0);
// // // // controls.update();

// // // // // --- Lighting (unchanged) ---
// // // // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
// // // // scene.add(ambientLight);
// // // // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
// // // // directionalLight.position.set(1, 1, 1);
// // // // scene.add(directionalLight);

// // // // // --- Avatar and Animation Setup ---
// // // // const loader = new GLTFLoader();
// // // // let avatar = null;
// // // // let mixer = null; 

// // // // let lipSyncMesh = null;
// // // // let mouthOpenIndex = -1;
// // // // let currentLipSync = null;
// // // // let isSpeaking = false; // <-- NEW: Our own reliable flag

// // // // loader.load('./assets/avatar.glb', (gltf) => {
// // // //     avatar = gltf.scene;
// // // //     scene.add(avatar);
    
// // // //     avatar.traverse(node => {
// // // //         if (node.isSkinnedMesh && node.name === 'Wolf3D_Head') {
// // // //             lipSyncMesh = node;
// // // //         }
// // // //     });

// // // //     if (lipSyncMesh) {
// // // //         if (lipSyncMesh.morphTargetDictionary.hasOwnProperty('mouthOpen')) {
// // // //             mouthOpenIndex = lipSyncMesh.morphTargetDictionary['mouthOpen'];
// // // //             console.log(`SUCCESS: Found 'mouthOpen' at index [${mouthOpenIndex}]`);
// // // //         } else {
// // // //             console.error("CRITICAL: This model does not have a 'mouthOpen' morph target.");
// // // //         }
// // // //     } else {
// // // //         console.error("CRITICAL: Could not find a mesh named 'Wolf3D_Head'.");
// // // //     }
// // // // }, undefined, (error) => console.error(error));


// // // // // --- Chat Logic and Audio Handling ---
// // // // const chatForm = document.getElementById('chat-form');
// // // // const userInput = document.getElementById('user-input');
// // // // const chatBox = document.getElementById('chat-box');
// // // // const audio = new Audio();

// // // // audio.addEventListener('ended', () => {
// // // //     isSpeaking = false; // <-- Use our flag
// // // //     currentLipSync = null;
// // // // });

// // // // chatForm.addEventListener('submit', async (e) => {
// // // //     e.preventDefault();
// // // //     const message = userInput.value;
// // // //     if (!message) return;
// // // //     addMessage(message, 'user');
// // // //     userInput.value = '';
// // // //     try {
// // // //         const response = await fetch('/chat', {
// // // //             method: 'POST',
// // // //             headers: { 'Content-Type': 'application/json' },
// // // //             body: JSON.stringify({ message })
// // // //         });
// // // //         if(!response.ok) throw new Error(`Server error: ${response.statusText}`);
// // // //         const data = await response.json();
// // // //         addMessage(data.text, 'bot');
// // // //         playResponse(data.audioUrl, data.lipsyncUrl);
// // // //     } catch (error) {
// // // //         console.error("Failed to get response:", error);
// // // //         addMessage("Sorry, I encountered an error.", 'bot');
// // // //     }
// // // // });

// // // // function addMessage(text, sender) {
// // // //     const messageElem = document.createElement('div');
// // // //     messageElem.classList.add('message', `${sender}-message`);
// // // //     messageElem.textContent = text;
// // // //     chatBox.appendChild(messageElem);
// // // //     chatBox.scrollTop = chatBox.scrollHeight;
// // // // }

// // // // function playResponse(audioUrl, lipsyncUrl) {
// // // //     fetch(lipsyncUrl)
// // // //         .then(response => response.json())
// // // //         .then(lipsyncData => {
// // // //             currentLipSync = lipsyncData;
// // // //             isSpeaking = true; // <-- Use our flag
// // // //             audio.src = audioUrl;
// // // //             audio.play();
// // // //         });
// // // // }

// // // // // --- Animation Loop ---
// // // // const clock = new THREE.Clock();
// // // // function animate() {
// // // //     requestAnimationFrame(animate);
// // // //     const delta = clock.getDelta();
// // // //     if (mixer) mixer.update(delta);

// // // //     // --- REVISED AND DEBUGGED LIP-SYNC LOGIC ---
// // // //     if (isSpeaking && lipSyncMesh && currentLipSync && mouthOpenIndex !== -1) {
// // // //         const currentTime = audio.currentTime;
// // // //         let currentVisemeKey = 'A';
// // // //         for (const viseme of currentLipSync.mouthCues) {
// // // //             if (currentTime >= viseme.start) {
// // // //                 currentVisemeKey = viseme.value;
// // // //             } else {
// // // //                 break;
// // // //             }
// // // //         }
        
// // // //         let mouthOpenValue = 0;
// // // //         switch (currentVisemeKey) {
// // // //             case 'A': case 'X': mouthOpenValue = 0; break;
// // // //             case 'B': case 'C': case 'G': case 'H': mouthOpenValue = 0.4; break;
// // // //             case 'D': case 'E': case 'F': mouthOpenValue = 0.8; break;
// // // //             default: mouthOpenValue = 0; break;
// // // //         }

// // // //         // --- DEBUG STEP 1: Direct Assignment ---
// // // //         // We removed the smoothing for now to guarantee movement.
// // // //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = mouthOpenValue;

// // // //         // --- DEBUG STEP 2: Real-time Logging ---
// // // //         // This will prove the code is running.
// // // //         console.log(`Time: ${currentTime.toFixed(2)}, Viseme: ${currentVisemeKey}, Setting Mouth Value To: ${mouthOpenValue}`);

// // // //     } else if (lipSyncMesh && mouthOpenIndex !== -1) {
// // // //         // When not speaking, ensure mouth is closed.
// // // //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = 0;
// // // //     }

// // // //     // --- Standard render and resize logic ---
// // // //     const canvas = renderer.domElement;
// // // //     if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
// // // //          renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
// // // //          camera.aspect = canvas.clientWidth / canvas.clientHeight;
// // // //          camera.updateProjectionMatrix();
// // // //     }
// // // //     renderer.render(scene, camera);
// // // // }
// // // // animate();






// // // // In frontend/main.js

// // // import * as THREE from 'three';
// // // import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// // // import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// // // // --- Basic Three.js Setup (unchanged) ---
// // // const scene = new THREE.Scene();
// // // scene.background = new THREE.Color(0x222222);

// // // const canvas = document.getElementById('avatar-canvas');
// // // const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

// // // const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
// // // camera.position.set(0, 1.2, 1.5);
// // // scene.add(camera);

// // // const controls = new OrbitControls(camera, renderer.domElement);
// // // controls.target.set(0, 1, 0);
// // // controls.update();

// // // // --- Lighting (unchanged) ---
// // // const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
// // // scene.add(ambientLight);
// // // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
// // // directionalLight.position.set(1, 1, 1);
// // // scene.add(directionalLight);

// // // // --- Avatar and Animation Setup ---
// // // const loader = new GLTFLoader();
// // // let avatar = null;
// // // let mixer = null; 

// // // let lipSyncMesh = null;
// // // let mouthOpenIndex = -1;
// // // let currentLipSync = null;
// // // let isSpeaking = false;

// // // loader.load('./assets/avatar.glb', (gltf) => {
// // //     avatar = gltf.scene;
// // //     scene.add(avatar);
    
// // //     avatar.traverse(node => {
// // //         if (node.isSkinnedMesh && node.name === 'Wolf3D_Head') {
// // //             lipSyncMesh = node;
// // //         }
// // //     });

// // //     if (lipSyncMesh) {
// // //         if (lipSyncMesh.morphTargetDictionary.hasOwnProperty('mouthOpen')) {
// // //             mouthOpenIndex = lipSyncMesh.morphTargetDictionary['mouthOpen'];
// // //             console.log(`SUCCESS: Found 'mouthOpen' at index [${mouthOpenIndex}]`);
// // //             console.log("DEBUG: ALL AVAILABLE MORPH TARGETS:", lipSyncMesh.morphTargetDictionary);
// // //         } else {
// // //             console.error("CRITICAL: This model does not have a 'mouthOpen' morph target.");
// // //         }
// // //     } else {
// // //         console.error("CRITICAL: Could not find a mesh named 'Wolf3D_Head'.");
// // //     }
// // // }, undefined, (error) => console.error(error));


// // // // --- Chat Logic and Audio Handling (unchanged) ---
// // // const chatForm = document.getElementById('chat-form');
// // // const userInput = document.getElementById('user-input');
// // // const chatBox = document.getElementById('chat-box');
// // // const audio = new Audio();

// // // audio.addEventListener('ended', () => {
// // //     isSpeaking = false;
// // //     currentLipSync = null;
// // // });

// // // chatForm.addEventListener('submit', async (e) => {
// // //     e.preventDefault();
// // //     const message = userInput.value;
// // //     if (!message) return;
// // //     addMessage(message, 'user');
// // //     userInput.value = '';
// // //     try {
// // //         const response = await fetch('/chat', {
// // //             method: 'POST',
// // //             headers: { 'Content-Type': 'application/json' },
// // //             body: JSON.stringify({ message })
// // //         });
// // //         if(!response.ok) throw new Error(`Server error: ${response.statusText}`);
// // //         const data = await response.json();
// // //         addMessage(data.text, 'bot');
// // //         playResponse(data.audioUrl, data.lipsyncUrl);
// // //     } catch (error) {
// // //         console.error("Failed to get response:", error);
// // //         addMessage("Sorry, I encountered an error.", 'bot');
// // //     }
// // // });

// // // function addMessage(text, sender) {
// // //     const messageElem = document.createElement('div');
// // //     messageElem.classList.add('message', `${sender}-message`);
// // //     messageElem.textContent = text;
// // //     chatBox.appendChild(messageElem);
// // //     chatBox.scrollTop = chatBox.scrollHeight;
// // // }

// // // function playResponse(audioUrl, lipsyncUrl) {
// // //     fetch(lipsyncUrl)
// // //         .then(response => response.json())
// // //         .then(lipsyncData => {
// // //             currentLipSync = lipsyncData;
// // //             isSpeaking = true;
// // //             audio.src = audioUrl;
// // //             audio.play();
// // //         });
// // // }

// // // // --- Animation Loop ---
// // // const clock = new THREE.Clock();
// // // function animate() {
// // //     requestAnimationFrame(animate);
// // //     const delta = clock.getDelta();
// // //     if (mixer) mixer.update(delta);

// // //     if (isSpeaking && lipSyncMesh && currentLipSync && mouthOpenIndex !== -1) {
// // //         const currentTime = audio.currentTime;
// // //         let currentVisemeKey = 'A';
// // //         for (const viseme of currentLipSync.mouthCues) {
// // //             if (currentTime >= viseme.start) {
// // //                 currentVisemeKey = viseme.value;
// // //             } else {
// // //                 break;
// // //             }
// // //         }
        
// // //         let mouthOpenValue = 0;
// // //         switch (currentVisemeKey) {
// // //             case 'A': case 'X': mouthOpenValue = 0; break;
// // //             case 'B': case 'C': case 'G': case 'H': mouthOpenValue = 0.4; break;
// // //             case 'D': case 'E': case 'F': mouthOpenValue = 0.8; break;
// // //             default: mouthOpenValue = 0; break;
// // //         }
        
// // //         // =========================================================
// // //         // !! THIS IS THE ONLY LINE THAT HAS CHANGED !!
// // //         // We are now smoothing the movement for a natural look.
// // //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
// // //             lipSyncMesh.morphTargetInfluences[mouthOpenIndex],
// // //             mouthOpenValue,
// // //             0.2 // You can adjust this value (0.1 to 0.5) to change the smoothness
// // //         );
// // //         // =========================================================

// // //     } else if (lipSyncMesh && mouthOpenIndex !== -1) {
// // //         // When not speaking, smoothly close the mouth
// // //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
// // //             lipSyncMesh.morphTargetInfluences[mouthOpenIndex],
// // //             0,
// // //             0.2
// // //         );
// // //     }

// // //     // Standard render and resize logic
// // //     const canvas = renderer.domElement;
// // //     if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
// // //          renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
// // //          camera.aspect = canvas.clientWidth / canvas.clientHeight;
// // //          camera.updateProjectionMatrix();
// // //     }
// // //     renderer.render(scene, camera);
// // // }
// // // animate();



// // // In frontend/main.js

// // import * as THREE from 'three';
// // import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// // import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// // import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// // // No longer need the DOMContentLoaded wrapper because of the 'defer' in the script tag

// // // --- Scene, Renderer, Camera, Lights, etc. ---
// // const scene = new THREE.Scene();
// // const canvas = document.getElementById('avatar-canvas');
// // const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// // renderer.setPixelRatio(window.devicePixelRatio);
// // renderer.toneMapping = THREE.ACESFilmicToneMapping;
// // renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct, modern property
// // renderer.shadowMap.enabled = true;
// // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// // const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
// // camera.position.set(0, 1.2, 2.2); 
// // scene.add(camera);

// // const controls = new OrbitControls(camera, renderer.domElement);
// // controls.target.set(0, 1, 0);
// // controls.minDistance = 1.5; controls.maxDistance = 4; controls.minPolarAngle = Math.PI / 4; controls.maxPolarAngle = Math.PI / 1.8; controls.enablePan = false;
// // controls.update();

// // scene.add(new THREE.AmbientLight(0xffffff, 0.1));
// // const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
// // keyLight.position.set(-3, 3, 3);
// // keyLight.castShadow = true;
// // scene.add(keyLight);

// // const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
// // fillLight.position.set(3, 2, 3);
// // scene.add(fillLight);

// // const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
// // rimLight.position.set(0, 2, -5);
// // scene.add(rimLight);

// // const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
// // ground.rotation.x = -Math.PI / 2;
// // ground.receiveShadow = true;
// // scene.add(ground);

// // new RGBELoader().setPath('assets/').load('background.hdr', function(texture) {
// //     texture.mapping = THREE.EquirectangularReflectionMapping;
// //     scene.background = texture;
// //     scene.environment = texture;
// // }, undefined, function(error) {
// //     console.error('An error occurred loading the background texture.', error);
// // });

// // // --- Avatar and Animation Setup ---
// // const loader = new GLTFLoader();
// // let avatar = null;
// // let lipSyncMesh = null;
// // let mouthOpenIndex = -1;
// // let currentLipSync = null;
// // let isSpeaking = false;

// // loader.load('./assets/avatar.glb', (gltf) => {
// //     avatar = gltf.scene;
// //     avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
// //     scene.add(avatar);
// //     avatar.traverse(n => { if (n.isSkinnedMesh && n.name === 'Wolf3D_Head') lipSyncMesh = n; });
// //     if (lipSyncMesh && lipSyncMesh.morphTargetDictionary.hasOwnProperty('mouthOpen')) {
// //         mouthOpenIndex = lipSyncMesh.morphTargetDictionary['mouthOpen'];
// //         console.log(`SUCCESS: Found 'mouthOpen' at index [${mouthOpenIndex}]`);
// //     }
// // });

// // // --- UI and Chat Logic ---
// // const chatForm = document.getElementById('chat-form');
// // const userInput = document.getElementById('user-input');
// // const chatBox = document.getElementById('chat-box');
// // const audio = new Audio();
// // const rimLightToggle = document.getElementById('rim-light-toggle');
// // const micButton = document.getElementById('mic-button');

// // rimLightToggle.addEventListener('click', () => { rimLight.visible = !rimLight.visible; });
// // audio.addEventListener('ended', () => { isSpeaking = false; currentLipSync = null; });

// // chatForm.addEventListener('submit', (e) => {
// //     e.preventDefault();
// //     const message = userInput.value;
// //     if (message) {
// //         submitChat(message);
// //     }
// // });

// // async function submitChat(message) {
// //     addMessage(message, 'user');
// //     userInput.value = '';
// //     try {
// //         const response = await fetch('/chat', {
// //             method: 'POST',
// //             headers: { 'Content-Type': 'application/json' },
// //             body: JSON.stringify({ message })
// //         });
// //         if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
// //         const data = await response.json();
// //         addMessage(data.text, 'bot');
// //         playResponse(data.audioUrl, data.lipsyncUrl);
// //     } catch (error) {
// //         console.error("Failed to get response:", error);
// //         addMessage("Sorry, I encountered an error.", 'bot');
// //     }
// // }

// // // --- VOICE INPUT LOGIC ---
// // const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// // let recognition = null;

// // if (SpeechRecognition) {
// //     recognition = new SpeechRecognition();
// //     recognition.continuous = false;
// //     recognition.lang = 'en-US';
// //     recognition.interimResults = true;

// //     micButton.addEventListener('click', () => {
// //         micButton.classList.add('recording');
// //         recognition.start();
// //     });

// //     recognition.onresult = (event) => {
// //         const transcript = Array.from(event.results).map(r => r[0]).map(r => r.transcript).join('');
// //         userInput.value = transcript;
// //         if (event.results[0].isFinal) {
// //             submitChat(transcript);
// //         }
// //     };

// //     recognition.onend = () => { micButton.classList.remove('recording'); };
// //     recognition.onerror = (event) => { console.error("Speech recognition error:", event.error); micButton.classList.remove('recording'); };
// // } else {
// //     console.warn("Speech Recognition is not supported in this browser.");
// //     micButton.style.display = 'none';
// // }

// // function addMessage(text, sender) { const m = document.createElement('div'); m.classList.add('message', `${sender}-message`); m.textContent = text; chatBox.appendChild(m); chatBox.scrollTop = chatBox.scrollHeight; }
// // function playResponse(audioUrl, lipsyncUrl) { fetch(lipsyncUrl).then(r => r.json()).then(d => { currentLipSync = d; isSpeaking = true; audio.src = audioUrl; audio.play(); }); }

// // // --- Animation Loop ---
// // function animate() {
// //     requestAnimationFrame(animate);
// //     if (isSpeaking && lipSyncMesh && currentLipSync && mouthOpenIndex !== -1) {
// //         const t = audio.currentTime; let c = 'A';
// //         for (const v of currentLipSync.mouthCues) { if (t >= v.start) c = v.value; else break; }
// //         let m = 0;
// //         switch (c) { case 'A': case 'X': m = 0; break; case 'B': case 'C': case 'G': case 'H': m = 0.4; break; case 'D': case 'E': case 'F': m = 0.8; break; }
// //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthOpenIndex], m, 0.2);
// //     } else if (lipSyncMesh && mouthOpenIndex !== -1) {
// //         lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthOpenIndex], 0, 0.2);
// //     }
// //     const canvas = renderer.domElement;
// //     if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
// //         renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
// //         camera.aspect = canvas.clientWidth / canvas.clientHeight;
// //         camera.updateProjectionMatrix();
// //     }
// //     renderer.render(scene, camera);
// // }
// // animate();







// // In frontend/main.js

// import * as THREE from 'three';
// import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
// import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
// import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// // --- Scene, Renderer, and Camera Setup ---
// const scene = new THREE.Scene();
// const canvas = document.getElementById('avatar-canvas');
// const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// renderer.setPixelRatio(window.devicePixelRatio);
// renderer.toneMapping = THREE.ACESFilmicToneMapping;
// renderer.outputColorSpace = THREE.SRGBColorSpace;
// renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
// scene.add(camera);

// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enablePan = false;
// controls.update();

// // =========================================================
// // ==           LIGHTING & ENVIRONMENT UPDATE             ==
// // =========================================================
// // Boosted all light intensities significantly for better visibility
// scene.add(new THREE.AmbientLight(0xffffff, 0.5)); // Lifted ambient light

// const keyLight = new THREE.DirectionalLight(0xffffff, 2.5); // Main light is much stronger
// keyLight.position.set(-3, 3, 3);
// keyLight.castShadow = true;
// // Improve shadow quality
// keyLight.shadow.mapSize.width = 2048;
// keyLight.shadow.mapSize.height = 2048;
// scene.add(keyLight);

// const fillLight = new THREE.DirectionalLight(0xffffff, 1.5); // Fill light is stronger
// fillLight.position.set(3, 2, 3);
// scene.add(fillLight);

// const rimLight = new THREE.DirectionalLight(0xffffff, 3.0); // Backlight is stronger
// rimLight.position.set(0, 2, -5);
// scene.add(rimLight);
// // =========================================================

// const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
// ground.rotation.x = -Math.PI / 2;
// ground.receiveShadow = true;
// scene.add(ground);
// new RGBELoader().setPath('assets/').load('background.hdr', function(t){t.mapping=THREE.EquirectangularReflectionMapping;scene.background=t;scene.environment=t;});

// // --- Post-Processing Setup ---
// const composer = new EffectComposer(renderer);
// let bokehPass; // Declare it here so we can update it later

// // --- Avatar and Animation Setup ---
// const loader = new GLTFLoader();
// let avatar = null;
// let lipSyncMesh = null;
// let mouthOpenIndex = -1;
// let mouthSmileIndex = -1; 
// let currentLipSync = null;
// let isSpeaking = false;

// loader.load('./assets/avatar.glb', (gltf) => {
//     avatar = gltf.scene;
//     avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
//     scene.add(avatar);
    
//     // =========================================================
//     // ==        NEW: ADAPTIVE CAMERA FRAMING LOGIC           ==
//     // =========================================================
//     // Calculate the avatar's size and center
//     const box = new THREE.Box3().setFromObject(avatar);
//     const center = new THREE.Vector3();
//     const size = new THREE.Vector3();
//     box.getCenter(center);
//     box.getSize(size);

//     console.log(`Avatar loaded. Center:`, center, `Size:`, size);

//     // Frame the camera based on the calculated size
//     // We aim the camera at the center of the model
//     controls.target.copy(center);
    
//     // We position the camera for a bust shot (head and shoulders)
//     camera.position.set(
//         center.x, 
//         // center.y + size.y * 0.6, // Position camera slightly above the model's center
//         center.y + 1.2,
//         center.z + 1.0  // Position camera away based on model height
//     );

//     // Update controls for the new framing
//     controls.minDistance = size.y * 0.5; // Don't get closer than half the avatar's height
//     controls.maxDistance = size.y * 1.5; // Or further than 1.5x
//     controls.update();

//     // Now that we have the camera position, we can set up the post-processing
//     composer.addPass(new RenderPass(scene, camera));
//     bokehPass = new BokehPass(scene, camera, {
//         focus: camera.position.distanceTo(center), // Focus on the avatar's center
//         aperture: 0.002,
//         maxblur: 0.005
//     });
//     composer.addPass(bokehPass);
//     // =========================================================
    
//     avatar.traverse(n => { if (n.isSkinnedMesh && n.name === 'Wolf3D_Head') lipSyncMesh = n; });
//     if (lipSyncMesh) {
//         const d = lipSyncMesh.morphTargetDictionary;
//         if (d.hasOwnProperty('mouthOpen')) mouthOpenIndex = d['mouthOpen'];
//         if (d.hasOwnProperty('mouthSmile')) mouthSmileIndex = d['mouthSmile'];
//         console.log(`SUCCESS: Found mouthOpen at [${mouthOpenIndex}], mouthSmile at [${mouthSmileIndex}]`);
//     }
// });


// // --- UI and Chat Logic (minified, unchanged) ---
// const chatForm=document.getElementById('chat-form'),userInput=document.getElementById('user-input'),chatBox=document.getElementById('chat-box'),audio=new Audio,rimLightToggle=document.getElementById('rim-light-toggle'),micButton=document.getElementById('mic-button');
// rimLightToggle.addEventListener('click',()=>{rimLight.visible=!rimLight.visible});audio.addEventListener('ended',()=>{isSpeaking=!1;currentLipSync=null});chatForm.addEventListener('submit',e=>{e.preventDefault();const t=userInput.value;t&&submitChat(t)});async function submitChat(e){addMessage(e,"user");userInput.value="";try{const t=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e})});if(!t.ok)throw new Error(`Server error: ${t.statusText}`);const n=await t.json();addMessage(n.text,"bot"),playResponse(n.audioUrl,n.lipsyncUrl)}catch(t){console.error("Failed to get response:",t),addMessage("Sorry, I encountered an error.","bot")}}
// const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null;SpeechRecognition?(recognition=new SpeechRecognition,recognition.continuous=!1,recognition.lang="en-US",recognition.interimResults=!0,micButton.addEventListener('click',()=>{micButton.classList.add("recording"),recognition.start()}),recognition.onresult=e=>{const t=Array.from(e.results).map(e=>e[0]).map(e=>e.transcript).join("");userInput.value=t,e.results[0].isFinal&&submitChat(t)},recognition.onend=()=>{micButton.classList.remove("recording")},recognition.onerror=e=>{console.error("Speech recognition error:",e.error),micButton.classList.remove("recording")}):(console.warn("Speech Recognition is not supported in this browser."),micButton.style.display="none");
// function addMessage(e,t){const n=document.createElement("div");n.classList.add("message",`${t}-message`),n.textContent=e,chatBox.appendChild(n),chatBox.scrollTop=chatBox.scrollHeight}function playResponse(e,t){fetch(t).then(e=>e.json()).then(t=>{currentLipSync=t,isSpeaking=!0,audio.src=e,audio.play()})}

// // --- Animation Loop ---
// function animate() {
//     requestAnimationFrame(animate);
//     if (isSpeaking && lipSyncMesh && currentLipSync) { /* ... (lip-sync logic unchanged) ... */ } 
//     else if (lipSyncMesh) { /* ... (lip-sync logic unchanged) ... */ }
//     const canvas = renderer.domElement;
//     if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
//          const width = canvas.clientWidth; const height = canvas.clientHeight;
//          renderer.setSize(width, height, false); composer.setSize(width, height);
//          camera.aspect = width / height; camera.updateProjectionMatrix();
//     }
//     composer.render();
// }
// // Minified lip-sync logic from previous step for brevity
// function animateLips(){if(isSpeaking&&lipSyncMesh&tLipSync&&mouthOpenIndex!==-1){const e=audio.currentTime;let t="A";for(const n of currentLipSync.mouthCues){if(e>=n.start)t=n.value;else break}let n=0,o=0;switch(t){case"A":case"X":n=0;break;case"B":n=.2;break;case"C":case"G":case"H":n=.3,o=.2;break;case"E":n=.4,o=.5;break;case"D":case"F":n=.7;break;default:n=0}lipSyncMesh.morphTargetInfluences[mouthOpenIndex]=THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthOpenIndex],n,.3),mouthSmileIndex!==-1&&(lipSyncMesh.morphTargetInfluences[mouthSmileIndex]=THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthSmileIndex],o,.3))}else if(lipSyncMesh&&mouthOpenIndex!==-1){lipSyncMesh.morphTargetInfluences[mouthOpenIndex]=THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthOpenIndex],0,.2),mouthSmileIndex!==-1&&(lipSyncMesh.morphTargetInfluences[mouthSmileIndex]=THREE.MathUtils.lerp(lipSyncMesh.morphTargetInfluences[mouthSmileIndex],0,.2))}}
// function mainAnimate() { requestAnimationFrame(mainAnimate); animateLips(); const canvas = renderer.domElement; if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) { const width = canvas.clientWidth; const height = canvas.clientHeight; renderer.setSize(width, height, false); composer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); } composer.render(); } mainAnimate();


// In frontend/main.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';

// --- Scene, Renderer, and Camera Setup ---
const scene = new THREE.Scene();
const canvas = document.getElementById('avatar-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
scene.add(camera);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false;
controls.enableZoom = false;
controls.enablePan = false;

// --- Lighting & Environment ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(-3, 3, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
fillLight.position.set(3, 2, 3);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
rimLight.position.set(0, 2, -5);
scene.add(rimLight);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
new RGBELoader().setPath('assets/').load('background.hdr', function(t){t.mapping=THREE.EquirectangularReflectionMapping;scene.background=t;scene.environment=t;});

// --- Post-Processing Setup ---
const composer = new EffectComposer(renderer);
let bokehPass;

// --- Avatar and Animation Setup ---
const loader = new GLTFLoader();
let avatar = null;
let lipSyncMesh = null;
let mouthOpenIndex = -1;
let mouthSmileIndex = -1; 
let currentLipSync = null;
let isSpeaking = false;
let cameraBoundaryBox = null;

loader.load('./assets/rovince-animated-avatar.glb', (gltf) => {
    avatar = gltf.scene;
    avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
    scene.add(avatar);
    
    const box = new THREE.Box3().setFromObject(avatar);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Initial Framing
    camera.position.set(center.x, center.y + size.y * 0.1, center.z + size.y);
    controls.target.copy(center);
    controls.update();

    // Define Movement Boundaries
    cameraBoundaryBox = new THREE.Box3(
        new THREE.Vector3(center.x - 0.3, center.y - 0.2, center.z + size.y * 0.6),
        new THREE.Vector3(center.x + 0.3, center.y + size.y * 0.4, center.z + size.y * 1.4)
    );

    composer.addPass(new RenderPass(scene, camera));
    bokehPass = new BokehPass(scene, camera, { focus: camera.position.distanceTo(center), aperture: 0.002, maxblur: 0.005 });
    composer.addPass(bokehPass);
    
    avatar.traverse(n => { if (n.isSkinnedMesh && n.name === 'Wolf3D_Head') lipSyncMesh = n; });
    if (lipSyncMesh) {
        const d = lipSyncMesh.morphTargetDictionary;
        if (d.hasOwnProperty('mouthOpen')) mouthOpenIndex = d['mouthOpen'];
        if (d.hasOwnProperty('mouthSmile')) mouthSmileIndex = d['mouthSmile'];
    }
});

// --- Custom Camera Controls ---
let isDragging = false;
canvas.addEventListener('mousedown', () => { isDragging = true; });
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });
canvas.addEventListener('mousemove', (event) => {
    if (!isDragging) return;
    camera.translateX(-event.movementX * 0.002);
    camera.translateY(event.movementY * 0.002);
    if (cameraBoundaryBox) camera.position.clamp(cameraBoundaryBox.min, cameraBoundaryBox.max);
});
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    camera.translateZ(event.deltaY * 0.1);
    if (cameraBoundaryBox) camera.position.clamp(cameraBoundaryBox.min, cameraBoundaryBox.max);
});

// --- UI and Chat Logic (unchanged) ---
const chatForm=document.getElementById('chat-form'),userInput=document.getElementById('user-input'),chatBox=document.getElementById('chat-box'),audio=new Audio,rimLightToggle=document.getElementById('rim-light-toggle'),micButton=document.getElementById('mic-button');
rimLightToggle.addEventListener('click',()=>{rimLight.visible=!rimLight.visible});audio.addEventListener('ended',()=>{isSpeaking=!1;currentLipSync=null});chatForm.addEventListener('submit',e=>{e.preventDefault();const t=userInput.value;t&&submitChat(t)});
// async function submitChat(e){addMessage(e,"user");userInput.value="";try{const t=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:e})});if(!t.ok)throw new Error(`Server error: ${t.statusText}`);const n=await t.json();addMessage(n.text,"bot"),playResponse(n.audioUrl,n.lipsyncUrl)}catch(t){console.error("Failed to get response:",t),addMessage("Sorry, I encountered an error.","bot")}}


async function submitChat(message) {
    // 1. Add user message
    addMessage(message, 'user');
    userInput.value = '';

    // 2. Create and show the loading indicator
    const loaderElem = document.createElement('div');
    loaderElem.classList.add('message', 'bot-message', 'typing-indicator');
    loaderElem.innerHTML = '<span></span><span></span><span></span>';
    chatBox.appendChild(loaderElem);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 3. Send the request to the backend
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        // 4. Remove the loading indicator as soon as the response arrives
        chatBox.removeChild(loaderElem);

        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        
        // 5. Play the response
        const data = await response.json();
        addMessage(data.text, 'bot');
        playResponse(data.audioUrl, data.lipsyncUrl);
        
    } catch (error) {
        // Remove the loader even if there is an error
        if (chatBox.contains(loaderElem)) {
            chatBox.removeChild(loaderElem);
        }
        console.error("Failed to get response:", error);
        addMessage("Sorry, I encountered an error.", 'bot');
    }
}


const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null;SpeechRecognition?(recognition=new SpeechRecognition,recognition.continuous=!1,recognition.lang="en-US",recognition.interimResults=!0,micButton.addEventListener('click',()=>{micButton.classList.add("recording"),recognition.start()}),recognition.onresult=e=>{const t=Array.from(e.results).map(e=>e[0]).map(e=>e.transcript).join("");userInput.value=t,e.results[0].isFinal&&submitChat(t)},recognition.onend=()=>{micButton.classList.remove("recording")},recognition.onerror=e=>{console.error("Speech recognition error:",e.error),micButton.classList.remove("recording")}):(console.warn("Speech Recognition is not supported in this browser."),micButton.style.display="none");
function addMessage(e,t){const n=document.createElement("div");n.classList.add("message",`${t}-message`),n.textContent=e,chatBox.appendChild(n),chatBox.scrollTop=chatBox.scrollHeight}function playResponse(e,t){fetch(t).then(e=>e.json()).then(t=>{currentLipSync=t,isSpeaking=!0,audio.src=e,audio.play()})}

// =========================================================
// ==           FIXED: FULL ANIMATION LOOP                ==
// =========================================================
function animate() {
    requestAnimationFrame(animate);

    // Lip-sync logic using the correct variable names
    if (isSpeaking && lipSyncMesh && currentLipSync && mouthOpenIndex !== -1) {
        const currentTime = audio.currentTime;
        let currentVisemeKey = 'A';
        for (const viseme of currentLipSync.mouthCues) {
            if (currentTime >= viseme.start) {
                currentVisemeKey = viseme.value;
            } else {
                break;
            }
        }
        
        let mouthOpenValue = 0;
        let mouthSmileValue = 0;
        switch (currentVisemeKey) {
            case 'A': case 'X': mouthOpenValue = 0; break;
            case 'B': mouthOpenValue = 0.2; break;
            case 'C': case 'G': case 'H': mouthOpenValue = 0.3; mouthSmileValue = 0.2; break;
            case 'E': mouthOpenValue = 0.4; mouthSmileValue = 0.5; break;
            case 'D': case 'F': mouthOpenValue = 0.7; break;
            default: mouthOpenValue = 0; break;
        }

        lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
            lipSyncMesh.morphTargetInfluences[mouthOpenIndex], mouthOpenValue, 0.3
        );
        if (mouthSmileIndex !== -1) {
            lipSyncMesh.morphTargetInfluences[mouthSmileIndex] = THREE.MathUtils.lerp(
                lipSyncMesh.morphTargetInfluences[mouthSmileIndex], mouthSmileValue, 0.3
            );
        }
    } else if (lipSyncMesh && mouthOpenIndex !== -1) {
        lipSyncMesh.morphTargetInfluences[mouthOpenIndex] = THREE.MathUtils.lerp(
            lipSyncMesh.morphTargetInfluences[mouthOpenIndex], 0, 0.2
        );
        if (mouthSmileIndex !== -1) {
            lipSyncMesh.morphTargetInfluences[mouthSmileIndex] = THREE.MathUtils.lerp(
                lipSyncMesh.morphTargetInfluences[mouthSmileIndex], 0, 0.2
            );
        }
    }

    // Renderer resize and render logic
    const canvas = renderer.domElement;
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
         const width = canvas.clientWidth;
         const height = canvas.clientHeight;
         renderer.setSize(width, height, false);
         composer.setSize(width, height);
         camera.aspect = width / height;
         camera.updateProjectionMatrix();
    }

    // --- PROCEDURAL IDLE ANIMATIONS ---
    const time = Date.now() * 0.001; // Get current time in seconds

    if (avatar) {
        // 1. Simulate Breathing (Moves the entire avatar chest up and down very slightly)
        // Using a sine wave to create a smooth, looping breath cycle
        const breathCycle = Math.sin(time * 2.0); 
        avatar.position.y = breathCycle * 0.005; 
        
        // 2. Simulate Head Movement
        // We look for standard bone names. RPM usually uses 'Head' or 'Neck'
        const headBone = avatar.getObjectByName('Head') || avatar.getObjectByName('Neck');
        
        if (headBone) {
            if (isSpeaking) {
                // When speaking, add slight, erratic head bobs to match talking energy
                headBone.rotation.x = Math.sin(time * 5) * 0.01;
                headBone.rotation.y = Math.sin(time * 1.5) * 0.02;
                headBone.rotation.z = Math.sin(time * 3) * 0.005;
            } else {
                // When idle, slow, gentle drifting so she doesn't look frozen
                headBone.rotation.x = Math.sin(time * 0.8) * 0.02;
                headBone.rotation.y = Math.sin(time * 0.5) * 0.03;
            }
        }
    }
    
    composer.render();
}

// Start the animation loop
animate();