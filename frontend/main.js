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

// --- Lighting & Environment ---
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(-3, 3, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048; keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
fillLight.position.set(3, 2, 3);
scene.add(fillLight);
const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
rimLight.position.set(0, 2, -5);
scene.add(rimLight);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x444444 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
scene.add(ground);
new RGBELoader().setPath('assets/').load('background.hdr', function(t){t.mapping=THREE.EquirectangularReflectionMapping;scene.background=t;scene.environment=t;});

const composer = new EffectComposer(renderer);
let bokehPass;

// =========================================================
// == NEW: ANIMATION MIXER VARIABLES                      ==
// =========================================================
const clock = new THREE.Clock(); // Needed to track time for animations
let mixer = null;
let idleAction = null;
let talkingAction = null;
let activeAction = null;

// --- Avatar Setup ---
const loader = new GLTFLoader();
let avatar = null;
let faceMeshes =[]; 
let currentLipSync = null;
let isSpeaking = false;
let cameraBoundaryBox = null;

let jawOpenIdx = -1, mouthOpenIdx = -1, mouthSmileIdx = -1, mouthPuckerIdx = -1, mouthFunnelIdx = -1;

loader.load('./assets/rovince-animated-avatar.glb', (gltf) => {
    avatar = gltf.scene;
    avatar.traverse(n => { if (n.isMesh) n.castShadow = true; });
    scene.add(avatar);
    
    // 1. Initialize the Animation Mixer for this avatar
    mixer = new THREE.AnimationMixer(avatar);

    // =========================================================
    // == NEW: HELPER TO FIX MIXAMO BONE NAMES & TELEPORTING  ==
    // =========================================================
    function cleanMixamoAnimation(clip) {
        // 1. Filter out all position and scale tracks. We ONLY want joint rotations!
        const filteredTracks = clip.tracks.filter(track => {
            return track.name.endsWith('.quaternion');
        });

        // 2. Strip the 'mixamorig_' prefix from the remaining rotation tracks
        filteredTracks.forEach(track => {
            track.name = track.name.replace('mixamorig_', '');
        });

        // 3. Apply the clean tracks back to the animation clip
        clip.tracks = filteredTracks;
        return clip;
    }

    // 2. Load the Idle Animation
    loader.load('./assets/idle.glb', (animGltf) => {
        let animationClip = animGltf.animations[0];
        if (animationClip) {
            animationClip = cleanMixamoAnimation(animationClip); // Fix names here!
            idleAction = mixer.clipAction(animationClip);
            idleAction.play(); 
            activeAction = idleAction;
            console.log("SUCCESS: Idle animation loaded and cleaned.");
        }
    });

    // 3. Load the Talking Animation
    loader.load('./assets/talking.glb', (animGltf) => {
        let animationClip = animGltf.animations[0];
        if (animationClip) {
            animationClip = cleanMixamoAnimation(animationClip); // Fix names here!
            talkingAction = mixer.clipAction(animationClip);
            console.log("SUCCESS: Talking animation loaded and cleaned.");
        }
    });

    const box = new THREE.Box3().setFromObject(avatar);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

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
// == NEW: SMOOTH ANIMATION CROSSFADER                    ==
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