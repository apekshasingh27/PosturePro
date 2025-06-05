// Get HTML elements
const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 640;
canvas.height = 480;

let selectedExercise = "squat";
let repCount = 0;
let isSquatting = false;
let isPushUp = false;
let selectedVoice = null;
let lastRepTime = 0;
const repCooldown = 1000; 

function changeExercise() {
  selectedExercise = document.getElementById('exerciseSelect').value;
  resetReps();
}

// Load Pose Detection
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

  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, Pose.POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 4
    });
    drawLandmarks(ctx, results.poseLandmarks, {
      color: '#FF0000',
      lineWidth: 2
    });

    switch (selectedExercise) {
      case "squat":
        checkSquat(results.poseLandmarks);
        break;
      case "pushup":
        checkPushUp(results.poseLandmarks);
        break;
      case "plank":
        checkPlank(results.poseLandmarks);
        break;
    }
  }
});

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    const camera = new Camera(video, {
      onFrame: async () => {
        await pose.send({ image: video });
      },
      width: 640,
      height: 480
    });

    camera.start();
  } catch (error) {
    console.error('Camera error:', error);
    alert("Could not access the webcam. Please check permissions.");
  }
}

startCamera();

// Utility to calculate angle
function getAngle(A, B, C) {
  const AB = { x: B.x - A.x, y: B.y - A.y };
  const CB = { x: B.x - C.x, y: B.y - C.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
  const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);
  return (Math.acos(dot / (magAB * magCB)) * 180) / Math.PI;
}

// Squat logic
function checkSquat(landmarks) {
  const hip = landmarks[24];
  const knee = landmarks[26];
  const ankle = landmarks[28];
  const angle = getAngle(hip, knee, ankle);

  ctx.font = '20px Arial';
  ctx.fillStyle = angle < 90 ? 'green' : 'red';
  ctx.fillText(`Knee Angle: ${Math.round(angle)}°`, 10, 30);

  if (angle < 90) {
    ctx.fillText("✅ Good squat!", 10, 60);
    if (!isSquatting) isSquatting = true;
  } else {
    ctx.fillText("❌ Go lower!", 10, 60);
    if (isSquatting) {
      repCount++;
      isSquatting = false;
      speak(`${repCount}`);
    }
  }

  ctx.fillStyle = 'blue';
  ctx.fillText(`Reps: ${repCount}`, 10, 90);
}

// Push-up logic
// Updated push-up logic
function checkPushUp(landmarks) {
  const now = Date.now();

  const shoulder = landmarks[12];
  const elbow = landmarks[14];
  const wrist = landmarks[16];
  const hip = landmarks[24];

  // Calculate elbow angle
  const angle = getAngle(shoulder, elbow, wrist);

  // Check if shoulder is lowered relative to hip (y increases downward in normalized coords)
  const isDownPosition = angle < 90 && (shoulder.y - hip.y) > 0.1;

  ctx.font = '20px Arial';
  ctx.fillStyle = isDownPosition ? 'green' : 'red';
  ctx.fillText(`Elbow Angle: ${Math.round(angle)}°`, 10, 30);

  if (isDownPosition) {
    ctx.fillText("✅ Down!", 10, 60);
    if (!isPushUp) isPushUp = true;
  } else {
    ctx.fillText("⬆️ Push up!", 10, 60);
    // Only count a rep if previously down AND cooldown passed
    if (isPushUp && now - lastRepTime > repCooldown) {
      repCount++;
      isPushUp = false;
      lastRepTime = now;
      speak(`${repCount}`);
    }
  }
  ctx.fillStyle = 'blue';
  ctx.fillText(`Reps: ${repCount}`, 10, 90);
}

// Plank logic
function checkPlank(landmarks) {
  const shoulder = landmarks[12];
  const hip = landmarks[24];
  const ankle = landmarks[28];
  const angle = getAngle(shoulder, hip, ankle);

  ctx.font = '20px Arial';
  ctx.fillStyle = (angle > 160 && angle < 190) ? 'green' : 'red';
  ctx.fillText(`Body Angle: ${Math.round(angle)}°`, 10, 30);

  if (angle > 160 && angle < 190) {
    ctx.fillText("✅ Nice plank!", 10, 60);
  } else {
    ctx.fillText("❌ Adjust posture!", 10, 60);
  }
}

function resetReps() {
  repCount = 0;
  speak("Reps reset. Let's go again!");
}

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  selectedVoice = voices.find(voice =>
    voice.name.includes("Female") ||
    voice.name.includes("Google UK English Female") ||
    (voice.lang === 'en-US' && voice.name.toLowerCase().includes("female"))
  ) || voices.find(voice => voice.lang.startsWith("en"));
  console.log("Selected voice:", selectedVoice?.name);
}
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1.2;
  utterance.rate = 1;
  if (selectedVoice) utterance.voice = selectedVoice;
  speechSynthesis.speak(utterance);
}
