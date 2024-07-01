
window.addEventListener('deviceorientation', function(event) {
    document.getElementById('gyroX').textContent = `X-axis: ${event.alpha.toFixed(2)}`;
    document.getElementById('gyroY').textContent = `Y-axis: ${event.beta.toFixed(2)}`;
    document.getElementById('gyroZ').textContent = `Z-axis: ${event.gamma.toFixed(2)}`;
});


