// script.js

document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("startGameModal");
  const enterButton = document.getElementById("enterButton");

  if (modal && enterButton) {
    // Show modal when the page loads
    modal.style.display = "block";

    // Close modal when Start Game button is clicked
    enterButton.addEventListener("click", function () {
      modal.style.display = "none"; // Hide modal
    });
  } else {
    console.error("Modal or Start Button not found.");
  }
});

document.addEventListener("DOMContentLoaded", (event) => {
  const pauseButton = document.getElementById("pauseButton");
  const resumeButton = document.getElementById("resumeButton");
  const pauseGameModal = document.getElementById("pauseGameModal");

  pauseButton.addEventListener("click", () => {
    pauseGameModal.style.display = "flex";
  });

  resumeButton.addEventListener("click", () => {
    pauseGameModal.style.display = "none";
  });
});

// Timer variables
let timerInterval;
let totalSeconds = 0;
let isPaused = false;

// Start Timer
function startTimer() {
  totalSeconds = 0;
  timerInterval = setInterval(updateTimer, 1000);
}

// Update Timer
function updateTimer() {
  if (!isPaused) {
    totalSeconds++;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    document.getElementById("timer").innerHTML = `Time: ${
      minutes < 10 ? "0" : ""
    }${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
}

// Pause Timer
function pauseTimer() {
  isPaused = true;
}

// Resume Timer
function resumeTimer() {
  isPaused = false;
}

// Enter Game Modal
document.getElementById("enterButton").addEventListener("click", function () {
  document.getElementById("startGameModal").style.display = "none";

  // Start the game logic here
});

// Pause Button
document.getElementById("pauseButton").addEventListener("click", function () {
  isPaused = !isPaused;
  if (isPaused) {
    pauseTimer();
  } else {
    resumeTimer();
  }
  // Show the pause modal if needed
});
