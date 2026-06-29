// Reset Countdown Timer
// Configure reset time (daily reset at midnight UTC, adjust as needed)
function getNextResetTime() {
    const now = new Date();
    const resetTime = new Date();
    
    // Set reset time (default: daily at midnight UTC)
    // Change this to your desired reset schedule
    resetTime.setUTCHours(0, 0, 0, 0);
    
    // If reset time has passed today, set for tomorrow
    if (resetTime <= now) {
        resetTime.setUTCDate(resetTime.getUTCDate() + 1);
    }
    
    return resetTime;
}

function updateCountdown() {
    const now = new Date();
    const resetTime = getNextResetTime();
    const diff = resetTime - now;
    
    if (diff <= 0) {
        // Reset time has passed, get next reset
        const nextReset = getNextResetTime();
        updateDisplay(nextReset - now);
        return;
    }
    
    updateDisplay(diff);
}

function updateDisplay(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const display = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const countdownElement = document.getElementById('countdownDisplay');
    if (countdownElement) {
        countdownElement.textContent = display;
    }
}

// Update countdown every second
setInterval(updateCountdown, 1000);
updateCountdown(); // Initial update
