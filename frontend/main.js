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
controls.enableRotate = false; controls.enableZoom = false; controls.enablePan = false;

// =========================================================
// ==           IMPROVED INDOOR LIGHTING                  ==
// =========================================================
// Since he will be in a room, we want brighter, softer ambient light
scene.add(new THREE.AmbientLight(0xffffff, 1.5)); 

const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
keyLight.position.set(-2, 2, 3); // Moved slightly more to the front
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(2, 2, 2);
scene.add(fillLight);

// We removed the dark gray 'ground' plane so it doesn't clip with the 3D room floor!

// =========================================================
// ==           NEW: LOAD THE 3D ENVIRONMENT              ==
// =========================================================
const loader = new GLTFLoader();

loader.load('./assets/room.glb', (gltf) => {
    const room = gltf.scene;
    
    // --- 1. FIX THE SCALE (Size) ---
    // If the room is tiny, we multiply its size. 
    // Try 10, 30, 50, or even 100 depending on the specific model!
    const scaleFactor = 3; 
    room.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // --- 2. FIX THE POSITION (Placement) ---
    // Move the room so the floor lines up with his feet (Y = 0 is usually his feet)
    // You can also push the room backward (negative Z) so he isn't standing in a wall
    // Values: (X: left/right, Y: up/down, Z: forward/backward)
    room.position.set(0, 0, 0); 

    scene.add(room);
    console.log("SUCCESS: Doctor's office environment loaded.");
}, undefined, (e) => {
    console.log("Room not found yet, that's okay! We will just use the background.");
});


// --- Post-Processing Setup ---
const composer = new EffectComposer(renderer);
let bokehPass;

// =========================================================
// ==           NEW: ANIMATION MIXER VARIABLES            ==
// =========================================================
const clock = new THREE.Clock(); 
let mixer = null;
let idleAction = null;
let talkingAction = null;
let activeAction = null;

// --- Avatar Setup ---
let avatar = null;
let faceMeshes =[]; 
let currentLipSync = null;
let isSpeaking = false;
let cameraBoundaryBox = null;

let jawOpenIdx = -1, mouthOpenIdx = -1, mouthSmileIdx = -1, mouthPuckerIdx = -1, mouthFunnelIdx = -1;

loader.load('./assets/rovince-doctor.glb', (gltf) => {
    avatar = gltf.scene;
    avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
    
    // =========================================================
    // == NEW: ROTATE AVATAR TO FACE THE CHAT WINDOW          ==
    // =========================================================
    avatar.rotation.y = -0.15; // Turns the avatar slightly to the right
    scene.add(avatar);
    
    // 1. Initialize the Animation Mixer
    mixer = new THREE.AnimationMixer(avatar);

    // 2. Load the Idle & Talking Animations (Cleaned)
    function cleanMixamoAnimation(clip) {
        const filteredTracks = clip.tracks.filter(t => t.name.endsWith('.quaternion'));
        filteredTracks.forEach(t => t.name = t.name.replace('mixamorig_', ''));
        clip.tracks = filteredTracks;
        return clip;
    }

    loader.load('./assets/breathing_idle.glb', (animGltf) => {
        let animationClip = animGltf.animations[0];
        if (animationClip) {
            animationClip = cleanMixamoAnimation(animationClip); 
            idleAction = mixer.clipAction(animationClip);
            idleAction.play(); 
            activeAction = idleAction;
        }
    });

    loader.load('./assets/talking.glb', (animGltf) => {
        let animationClip = animGltf.animations[0];
        if (animationClip) {
            animationClip = cleanMixamoAnimation(animationClip);
            talkingAction = mixer.clipAction(animationClip);
        }
    });

    // =========================================================
    // == FIXED: FIND THE HEAD FOR PERFECT FRAMING            ==
    // =========================================================
    const headBone = avatar.getObjectByName('Head') || avatar.getObjectByName('Neck');
    const targetPosition = new THREE.Vector3();
    
    if (headBone) {
        // If we found the head, get its exact coordinate in the 3D world
        headBone.getWorldPosition(targetPosition);
    } else {
        // Fallback: guess based on height
        const box = new THREE.Box3().setFromObject(avatar);
        box.getCenter(targetPosition);
        targetPosition.y += box.getSize(new THREE.Vector3()).y * 0.35; 
    }

    // Shift framing to the right (moves avatar left)
    const xOffset = -0.25; 

    // Put camera at face height, slightly away
    camera.position.set(targetPosition.x + xOffset, targetPosition.y, targetPosition.z + 2);
    
    // Tell the camera controls to stare directly at the face
    controls.target.copy(targetPosition).add(new THREE.Vector3(xOffset, 0, 0));
    controls.update();

    cameraBoundaryBox = new THREE.Box3(
        new THREE.Vector3((targetPosition.x + xOffset) - 0.4, targetPosition.y - 0.3, targetPosition.z + 0.6),
        new THREE.Vector3((targetPosition.x + xOffset) + 0.4, targetPosition.y + 0.3, targetPosition.z + 3.0)
    );

    // Setup Depth of Field to softly blur the doctor's office in the background
    composer.addPass(new RenderPass(scene, camera));
    // bokehPass = new BokehPass(scene, camera, { 
    //     focus: camera.position.distanceTo(targetPosition), // Focus precisely on the face
    //     aperture: 0.003, // Slight blur
    //     maxblur: 0.005 
    // });
    // composer.addPass(bokehPass);
    
    // --- Universal Face Finder ---
    avatar.traverse(n => { 
        if (n.isSkinnedMesh && n.morphTargetDictionary) {
            const dict = n.morphTargetDictionary;
            if (dict.hasOwnProperty('jawOpen') || dict.hasOwnProperty('mouthOpen')) {
                faceMeshes.push(n);
                if (dict.hasOwnProperty('jawOpen')) jawOpenIdx = dict['jawOpen'];
                if (dict.hasOwnProperty('mouthOpen')) mouthOpenIdx = dict['mouthOpen'];
                if (dict.hasOwnProperty('mouthSmile')) mouthSmileIdx = dict['mouthSmile'];
                if (dict.hasOwnProperty('mouthSmileLeft')) mouthSmileIdx = dict['mouthSmileLeft'];
                if (dict.hasOwnProperty('mouthPucker')) mouthPuckerIdx = dict['mouthPucker'];
                if (dict.hasOwnProperty('mouthFunnel')) mouthFunnelIdx = dict['mouthFunnel'];
            }
        } 
    });
});

// =========================================================
// == SMOOTH ANIMATION CROSSFADER                         ==
// =========================================================
function fadeToAction(nextAction, duration) {
    if (!nextAction || !activeAction || nextAction === activeAction) return;
    nextAction.reset().fadeIn(duration).play();
    activeAction.fadeOut(duration);
    activeAction = nextAction;
}


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
    camera.translateZ(event.deltaY * 0.001);
    if (cameraBoundaryBox) camera.position.clamp(cameraBoundaryBox.min, cameraBoundaryBox.max);
});

// --- UI and Chat Logic ---
const chatForm=document.getElementById('chat-form'),userInput=document.getElementById('user-input'),chatBox=document.getElementById('chat-box'),audio=new Audio,rimLightToggle=document.getElementById('rim-light-toggle'),micButton=document.getElementById('mic-button');

rimLightToggle.addEventListener('click',()=>{rimLight.visible=!rimLight.visible});

// EVENT: When audio finishes playing
audio.addEventListener('ended', () => { 
    isSpeaking = false; 
    currentLipSync = null; 
    // Fade back to the Idle animation over 0.5 seconds!
    fadeToAction(idleAction, 0.5); 
});

chatForm.addEventListener('submit',e=>{e.preventDefault();const t=userInput.value;t&&submitChat(t)});

async function submitChat(message) {
    addMessage(message, 'user');
    userInput.value = '';
    const loaderElem = document.createElement('div');
    loaderElem.classList.add('message', 'bot-message', 'typing-indicator');
    loaderElem.innerHTML = '<span></span><span></span><span></span>';
    chatBox.appendChild(loaderElem);
    chatBox.scrollTop = chatBox.scrollHeight;

    // NEW: Get the selected voice from the dropdown
    const selectedVoice = document.getElementById('voice-select').value;

    try {
        const response = await fetch('/chat', { 
            method: 'POST', 
            headers: { 
                'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                    message: message,
                    voice: selectedVoice 
            }) 
        });
        chatBox.removeChild(loaderElem);
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        const data = await response.json();
        addMessage(data.text, 'bot');
        playResponse(data.audioUrl, data.lipsyncUrl);
    } catch (error) {
        if (chatBox.contains(loaderElem)) chatBox.removeChild(loaderElem);
        addMessage("Sorry, I encountered an error.", 'bot');
    }
}

function addMessage(e,t){const n=document.createElement("div");n.classList.add("message",`${t}-message`),n.textContent=e,chatBox.appendChild(n),chatBox.scrollTop=chatBox.scrollHeight}

function playResponse(audioUrl, lipsyncUrl) {
    fetch(lipsyncUrl).then(e => e.json()).then(data => {
        currentLipSync = data;
        isSpeaking = true;
        audio.src = audioUrl;
        audio.play();
        
        // Fade into the Talking animation over 0.5 seconds!
        fadeToAction(talkingAction, 0.5);
    });
}

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognition=null;SpeechRecognition?(recognition=new SpeechRecognition,recognition.continuous=!1,recognition.lang="en-US",recognition.interimResults=!0,micButton.addEventListener('click',()=>{micButton.classList.add("recording"),recognition.start()}),recognition.onresult=e=>{const t=Array.from(e.results).map(e=>e[0]).map(e=>e.transcript).join("");userInput.value=t,e.results[0].isFinal&&submitChat(t)},recognition.onend=()=>{micButton.classList.remove("recording")},recognition.onerror=e=>{console.error("Speech recognition error:",e.error),micButton.classList.remove("recording")}):(console.warn("Speech Recognition is not supported in this browser."),micButton.style.display="none");


// --- Full Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    // 1. UPDATE THE SKELETON (Body Movement)
    const delta = clock.getDelta();
    if (mixer) {
        mixer.update(delta); // This advances the active Mixamo animation!
    }

    // 2. UPDATE THE MORPH TARGETS (Lip Sync)
    if (isSpeaking && faceMeshes.length > 0 && currentLipSync) {
        const t = audio.currentTime;
        let c = 'A';
        for (const v of currentLipSync.mouthCues) {
            if (t >= v.start) c = v.value;
            else break;
        }
        
        let jawVal = 0, smileVal = 0, puckerVal = 0, funnelVal = 0;
        switch (c) {
            case 'A': case 'X': break; 
            case 'B': jawVal = 0.1; break; 
            case 'C': jawVal = 0.2; smileVal = 0.2; break; 
            case 'D': jawVal = 0.4; break; 
            case 'E': jawVal = 0.3; funnelVal = 0.5; puckerVal = 0.2; break; 
            case 'F': jawVal = 0.1; puckerVal = 0.6; funnelVal = 0.4; break; 
            case 'G': case 'H': jawVal = 0.2; funnelVal = 0.2; break; 
        }

        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;
            const applyMorph = (shapeName, targetValue) => {
                if (dict.hasOwnProperty(shapeName)) {
                    const idx = dict[shapeName];
                    influences[idx] = THREE.MathUtils.lerp(influences[idx], targetValue, 0.4);
                }
            };
            applyMorph('jawOpen', jawVal);
            applyMorph('mouthSmile', smileVal);
            applyMorph('mouthSmileLeft', smileVal);
            applyMorph('mouthSmileRight', smileVal);
            applyMorph('mouthPucker', puckerVal);
            applyMorph('mouthFunnel', funnelVal);
            applyMorph('mouthOpen', jawVal);
        });

    } else if (faceMeshes.length > 0) {
        faceMeshes.forEach(mesh => {
            const dict = mesh.morphTargetDictionary;
            const influences = mesh.morphTargetInfluences;
            const closeMorph = (shapeName) => {
                if (dict.hasOwnProperty(shapeName)) {
                    const idx = dict[shapeName];
                    influences[idx] = THREE.MathUtils.lerp(influences[idx], 0, 0.2);
                }
            };
            closeMorph('jawOpen'); closeMorph('mouthOpen'); closeMorph('mouthSmile'); closeMorph('mouthSmileLeft'); closeMorph('mouthSmileRight'); closeMorph('mouthPucker'); closeMorph('mouthFunnel');
        });
    }

    // Renderer resize and render logic
    const canvas = renderer.domElement;
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
         renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
         composer.setSize(canvas.clientWidth, canvas.clientHeight);
         camera.aspect = canvas.clientWidth / canvas.clientHeight;
         camera.updateProjectionMatrix();
    }

    composer.render();
}

animate();