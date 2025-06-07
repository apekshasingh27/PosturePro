# Posture Detection Web App

A real-time posture tracking web app that uses your webcam and **MediaPipe** to help you correct your form while doing **squats**, **push-ups**, and **planks**. No gym trainer? No problem. This one lives in your browser.

## Features

- Real-time pose detection using **MediaPipe**
- Squat detection with 90° knee angle check and back alignment
- Push-up counter that only counts reps with correct form
- Plank timer (30–45 seconds) with stability feedback
- Optional voice feedback using the Web Speech API
- 100% client-side — your data stays on your device

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Pose Detection:** [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose)
- **Voice Feedback:** Web Speech API
- **Visualization:** Canvas API
- **Deployment:** GitHub Pages

## Installation

Clone the repo and open `index.html` in your browser. Yep, that’s it. Zero dependencies, zero pain.

```bash
git clone https://github.com/yourusername/posture-webapp.git
cd posture-webapp
open index.html
