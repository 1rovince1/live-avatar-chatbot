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

// // --- Avatar and Animation Setup ---
// const loader = new GLTFLoader();
// let avatar = null;
// let lipSyncMesh = null;
// let mouthOpenIndex = -1;
// let mouthSmileIndex = -1; 
// let currentLipSync = null;
// let isSpeaking = false;
// let cameraBoundaryBox = null;

// loader.load('./assets/avatar.glb', (gltf) => {
//     avatar = gltf.scene;
//     avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
//     scene.add(avatar);
    
//     const box = new THREE.Box3().setFromObject(avatar);
//     const center = box.getCenter(new THREE.Vector3());
//     const size = box.getSize(new THREE.Vector3());

//     // Initial Framing
//     camera.position.set(center.x, center.y + size.y * 0.1, center.z + size.y);
//     controls.target.copy(center);
//     controls.update();

//     // Define Movement Boundaries
//     cameraBoundaryBox = new THREE.Box3(
//         new THREE.Vector3(center.x - 0.3, center.y - 0.2, center.z + size.y * 0.6),
//         new THREE.Vector3(center.x + 0.3, center.y + size.y * 0.4, center.z + size.y * 1.4)
//     );

//     composer.addPass(new RenderPass(scene, camera));
//     bokehPass = new BokehPass(scene, camera, { focus: camera.position.distanceTo(center), aperture: 0.002, maxblur: 0.005 });
//     composer.addPass(bokehPass);
    
//     avatar.traverse(n => { if (n.isSkinnedMesh && n.name === 'Wolf3D_Head') lipSyncMesh = n; });
//     if (lipSyncMesh) {
//         const d = lipSyncMesh.morphTargetDictionary;
//         if (d.hasOwnProperty('mouthOpen')) mouthOpenIndex = d['mouthOpen'];
//         if (d.hasOwnProperty('mouthSmile')) mouthSmileIndex = d['mouthSmile'];
//     }
// });

// --- Avatar and Animation Setup ---
const loader = new GLTFLoader();
let avatar = null;

// NEW: Use an array to hold Head, Teeth, and Tongue meshes!
let faceMeshes =[]; 
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

    cameraBoundaryBox = new THREE.Box3(
        new THREE.Vector3(center.x - 0.3, center.y - 0.2, center.z + size.y * 0.6),
        new THREE.Vector3(center.x + 0.3, center.y + size.y * 0.4, center.z + size.y * 1.4)
    );

    composer.addPass(new RenderPass(scene, camera));
    bokehPass = new BokehPass(scene, camera, { focus: camera.position.distanceTo(center), aperture: 0.002, maxblur: 0.005 });
    composer.addPass(bokehPass);
    
    // =========================================================
    // == UPGRADED UNIVERSAL FACE FINDER                      ==
    // =========================================================
    avatar.traverse(n => { 
        if (n.isSkinnedMesh && n.morphTargetDictionary) {
            const dict = n.morphTargetDictionary;
            // If the mesh has jawOpen OR mouthOpen, it belongs to the mouth system!
            if (dict.hasOwnProperty('jawOpen') || dict.hasOwnProperty('mouthOpen')) {
                faceMeshes.push(n);
                console.log("SUCCESS: Linked mesh for lip-sync:", n.name);
            }
        } 
    });

    if (faceMeshes.length === 0) {
        console.error("CRITICAL: Could not find any face meshes with morph targets.");
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

    if (isSpeaking && faceMeshes.length > 0 && currentLipSync) {
        const t = audio.currentTime;
        let c = 'A';
        for (const v of currentLipSync.mouthCues) {
            if (t >= v.start) c = v.value;
            else break;
        }
        
        // Target values based on Rhubarb's A-H cues
        let jawVal = 0, smileVal = 0, puckerVal = 0, funnelVal = 0;
        
        switch (c) {
            case 'A': case 'X': break; // Silence/MBP (Mouth closed)
            case 'B': jawVal = 0.1; break; // K, S, T
            case 'C': jawVal = 0.2; smileVal = 0.2; break; // E, AE
            case 'D': jawVal = 0.4; break; // A, I (Wide open)
            case 'E': jawVal = 0.3; funnelVal = 0.5; puckerVal = 0.2; break; // O (Rounded)
            case 'F': jawVal = 0.1; puckerVal = 0.6; funnelVal = 0.4; break; // U (Puckered)
            case 'G': case 'H': jawVal = 0.2; funnelVal = 0.2; break; // F, V, L
        }

        // Apply these values to ALL linked meshes (Head, Teeth, Tongue)
        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;

            // Helper function to smoothly apply shapes only if the mesh actually has them
            const applyMorph = (shapeName, targetValue) => {
                if (dict.hasOwnProperty(shapeName)) {
                    const idx = dict[shapeName];
                    influences[idx] = THREE.MathUtils.lerp(influences[idx], targetValue, 0.4);
                }
            };

            // Apply Advanced ARKit shapes (Your new model)
            applyMorph('jawOpen', jawVal);
            applyMorph('mouthSmile', smileVal);
            applyMorph('mouthSmileLeft', smileVal);
            applyMorph('mouthSmileRight', smileVal);
            applyMorph('mouthPucker', puckerVal);
            applyMorph('mouthFunnel', funnelVal);

            // Apply Fallback shapes (In case you use RPM later)
            applyMorph('mouthOpen', jawVal);
        });

    } else if (faceMeshes.length > 0) {
        // Smoothly close mouth when silent
        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;

            const closeMorph = (shapeName) => {
                if (dict.hasOwnProperty(shapeName)) {
                    const idx = dict[shapeName];
                    influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.2);
                }
            };

            closeMorph('jawOpen');
            closeMorph('mouthOpen');
            closeMorph('mouthSmile');
            closeMorph('mouthSmileLeft');
            closeMorph('mouthSmileRight');
            closeMorph('mouthPucker');
            closeMorph('mouthFunnel');
        });
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
    const time = Date.now() * 0.001; 

    if (avatar) {
        const breathCycle = Math.sin(time * 2.0); 
        avatar.position.y = breathCycle * 0.005; 
        
        const headBone = avatar.getObjectByName('Head') || avatar.getObjectByName('Neck');
        if (headBone) {
            if (isSpeaking) {
                headBone.rotation.x = Math.sin(time * 5) * 0.01;
                headBone.rotation.y = Math.sin(time * 1.5) * 0.02;
                headBone.rotation.z = Math.sin(time * 3) * 0.005;
            } else {
                headBone.rotation.x = Math.sin(time * 0.8) * 0.02;
                headBone.rotation.y = Math.sin(time * 0.5) * 0.03;
            }
        }
    }
    
    composer.render();
}

animate();