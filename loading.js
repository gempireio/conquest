loadingScreen = document.getElementById("loading");

function fadeOutLoadingScreen() {
    var opacity = 1;
    var timer = setInterval(function () {
        if (opacity > 0.05) {    
            opacity *= 0.9;
        } else {
            loadingScreen.remove();
            clearInterval(timer);   
        }
        loadingScreen.style.opacity = opacity;
       
    }, 100);
    
}