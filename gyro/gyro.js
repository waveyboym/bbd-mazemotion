async function initGyroscope() {
    try {
        if ('Gyroscope' in window) {
            const permissionStatus = await navigator.permissions.query({ name: 'gyroscope' });
            
            if (permissionStatus.state === 'granted') {
                startGyroscope();
            } else if (permissionStatus.state === 'prompt') {
                console.log('Requesting gyroscope permission...');
                startGyroscope();
            } else {
                console.log('Gyroscope permission is denied.');
                updateUIForNoGyroscope();
            }
        } else {
            console.log('Gyroscope API is not supported in this browser.');
            updateUIForNoGyroscope();
        }
    } catch (error) {
        console.error('Error initializing gyroscope:', error);
        updateUIForNoGyroscope();
    }
}

function startGyroscope() {
    let gyro = new Gyroscope({frequency: 60});
    gyro.addEventListener('reading', () => {
        document.getElementById('gyroX').textContent = `X-axis: ${gyro.x.toFixed(2)}`;
        document.getElementById('gyroY').textContent = `Y-axis: ${gyro.y.toFixed(2)}`;
        document.getElementById('gyroZ').textContent = `Z-axis: ${gyro.z.toFixed(2)}`;
    });
    gyro.start();
}

function updateUIForNoGyroscope() {
    document.getElementById('gyroX').textContent = 'Gyroscope API is not supported or permission denied.';
    document.getElementById('gyroY').textContent = '';
    document.getElementById('gyroZ').textContent = '';
}

initGyroscope();