window.addEventListener("load", function () {

    var y = document.getElementById("gyroY");
    var z = document.getElementById("gyroZ");

    window.addEventListener('deviceorientation', handleOrientation);

    function handleOrientation(event) {
        const y_val = event.beta;
        const z_val = event.gamma;
        y.innerText = "Y: " + Math.round(y_val);
        z.innerText = "Z: " + Math.round(z_val);
}

});