// === DOM Elements ===
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

// === App State ===
let selectedExercise = "squat";
let repCount = 0;
let isSquatting = false;
let isPushUp = false;
let repCountedThisCycle = false;
let lastRepTime = 0;
let selectedVoice = null;
const repCooldown = 1000;

// === Canvas Size ===
canvas.width = 640;
canvas.height = 480;

// === Utility Functions ===
function getAngle(A, B, C) {
  const AB = { x: B.x - A.x, y: B.y - A.y };
  const CB = { x: B.x - C.x, y: B.y - C.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.hypot(AB.x, AB.y);
  const magCB = Math.hypot(CB.x, CB.y);
  return (Math.acos(dot / (magAB * magCB)) * 180) / Math.PI;
}

function getTorsoAngle(shoulder, hip) {
  const dx = shoulder.x - hip.x;
  const dy = shoulder.y - hip.y;
  return Math.abs(Math.atan2(dx, dy) * (180 / Math.PI));
}

function resetReps() {
  repCount = 0;
  speak("Reps reset. Let's go again!");
}

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.2;
  utterance.rate = 1;
  if (selectedVoice) utterance.voice = selectedVoice;
  speechSynthesis.speak(utterance);
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  selectedVoice = voices.find(v =>
    v.name.includes("Female") ||
    v.name.includes("Google UK English Female") ||
    (v.lang === 'en-US' && v.name.toLowerCase().includes("female"))
  ) || voices.find(v => v.lang.startsWith("en"));
  console.log("Selected voice:", selectedVoice?.name);
}

speechSynthesis.onvoiceschanged = loadVoices;

// === Exercise Handlers ===
function checkSquat(landmarks) {
  const hip = landmarks[24];
  const knee = landmarks[26];
  const ankle = landmarks[28];
  const shoulder = landmarks[12];

  const kneeAngle = getAngle(hip, knee, ankle);
  const backAngle = getTorsoAngle(shoulder, hip);

  const isProperKnee = kneeAngle >= 80 && kneeAngle <= 120;
  const isBackStraight = backAngle >= 150;

  // Display angles
  ctx.font = '20px Arial';
  ctx.fillStyle = 'yellow';
  ctx.fillText(`Knee: ${Math.round(kneeAngle)}°`, 10, 30);
  ctx.fillText(`Back: ${Math.round(backAngle)}°`, 10, 60);

  if (isProperKnee && isBackStraight) {
    ctx.fillStyle = 'green';
    ctx.fillText("✅ Proper Squat!", 10, 90);
    if (!isSquatting) isSquatting = true;
  } else {
    ctx.fillStyle = 'red';
    ctx.fillText("❌ Fix Form!", 10, 90);

    if (isSquatting && !repCountedThisCycle) {
      repCount++;
      speak(`${repCount}`);
      repCountedThisCycle = true;
    }
    isSquatting = false;
  }

  if (kneeAngle > 150) repCountedThisCycle = false;

  ctx.fillStyle = 'blue';
  ctx.fillText(`Reps: ${repCount}`, 10, 120);
}

function checkPushUp(landmarks) {
  const now = Date.now();
  const shoulder = landmarks[12];
  const elbow = landmarks[14];
  const wrist = landmarks[16];
  const hip = landmarks[24];

  const elbowAngle = getAngle(shoulder, elbow, wrist);
  const isDown = elbowAngle < 90 && (shoulder.y - hip.y) > 0.1;

  ctx.font = '20px Arial';
  ctx.fillStyle = isDown ? 'green' : 'red';
  ctx.fillText(`Elbow Angle: ${Math.round(elbowAngle)}°`, 10, 30);
  ctx.fillText(isDown ? "✅ Down!" : "⬆️ Push up!", 10, 60);

  if (isDown) {
    if (!isPushUp) isPushUp = true;
  } else if (isPushUp && (now - lastRepTime > repCooldown)) {
    repCount++;
    isPushUp = false;
    lastRepTime = now;
    speak(`${repCount}`);
  }

  ctx.fillStyle = 'blue';
  ctx.fillText(`Reps: ${repCount}`, 10, 90);
}

function checkPlank(landmarks) {
  const shoulder = landmarks[12];
  const hip = landmarks[24];
  const ankle = landmarks[28];

  const angle = getAngle(shoulder, hip, ankle);

  ctx.font = '20px Arial';
  ctx.fillStyle = 'red';
  ctx.fillText(`Body Angle: ${Math.round(angle)}°`, 10, 30);

  const isGoodAngle = angle > 160 && angle < 190;
  const yDiffsOkay = Math.abs(shoulder.y - hip.y) < 0.1 && Math.abs(hip.y - ankle.y) < 0.1;
  const notStanding = shoulder.y >= hip.y;

  if (isGoodAngle && yDiffsOkay && notStanding) {
    ctx.fillStyle = 'green';
    ctx.fillText("✅ Nice plank!", 10, 60);
  } else {
    ctx.fillStyle = 'red';
    ctx.fillText("❌ Adjust posture!", 10, 60);
  }
}

// === Pose Setup ===
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

pose.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

  if (!results.poseLandmarks) return;

  drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
    color: '#00FF00',
    lineWidth: 4
  });
  drawLandmarks(ctx, results.poseLandmarks, {
    color: '#FF0000',
    lineWidth: 2
  });

  const handlers = {
    squat: checkSquat,
    pushup: checkPushUp,
    plank: checkPlank
  };

  handlers[selectedExercise]?.(results.poseLandmarks);
});

// === Camera Setup ===
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    const camera = new Camera(video, {
      onFrame: async () => await pose.send({ image: video }),
      width: 640,
      height: 480
    });

    camera.start();
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access webcam. Please check permissions.");
  }
}

// === Exercise Dropdown ===
function changeExercise() {
  selectedExercise = document.getElementById('exerciseSelect').value;
  resetReps();
}

// === Init ===
startCamera();
