window.addEventListener("load", function () {
    var x = document.getElementById("gyroX");   
    var y = document.getElementById("gyroY");
    var z = document.getElementById("gyroZ");

    window.addEventListener('deviceorientation', handleOrientation);

    function handleOrientation(event) {
        const x_val = event.alpha;
        const y_val = event.beta;
        const z_val = event.gamma;
        x.innerText = "X: " + Math.round(x_val);
        y.innerText = "Y: " + Math.round(y_val);
        z.innerText = "Z: " + Math.round(z_val);
    }

});