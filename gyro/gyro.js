if ('Gyroscope' in window) {
    let gyro = new Gyroscope({frequency: 60});
    gyro.addEventListener('reading', () => {
        document.getElementById('gyroX').textContent = `X-axis: ${gyro.x.toFixed(2)}`;
        document.getElementById('gyroY').textContent = `Y-axis: ${gyro.y.toFixed(2)}`;
        document.getElementById('gyroZ').textContent = `Z-axis: ${gyro.z.toFixed(2)}`;
    });
    gyro.start();
} else {
    console.log('Gyroscope API is not supported in this browser.');
    document.getElementById('gyroX').textContent = 'Gyroscope API is not supported in this browser.';
    document.getElementById('gyroY').textContent = '';
    document.getElementById('gyroZ').textContent = '';
}