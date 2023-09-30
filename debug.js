const UPDATE_INTERVAL = 200;

const html = `<style>
.debug {
    margin: 15px;
    text-shadow: 2px 2px #000000;
    position: absolute;
    z-index: 120;
    opacity: 0.9;
    color: rgb(255, 255, 255);
    font-size: clamp( 15px + 1vw, 2.5vw, 40px );
  }
</style>

<div class='debug' id='debug'>
    <table>
      <tr id='fps-row'>
        <td>FPS</td>
        <td id='fps'>#</td>        
      </tr>
      <tr id='zoom-row'>
        <td>Zoom</td>
        <td id='zoom'>#</td>  
      </tr>
      <tr id='mouse-screen-row' style='display: none;'>
        <td>Mouse Screen</td>
        <td id='mouse-screen'>#</td> 
      </tr>
      <tr id='mouse-world-row' style='display: none;'>
        <td>Mouse World</td>
        <td id='mouse-world'>#</td> 
      </tr>
      <tr id='touch1-screen-row' style='display: none;'>
        <td>Touch1 Screen</td>
        <td id='touch1-screen'>#</td>     
      </tr>
      <tr id='touch1-world-row' style='display: none;'>
        <td>Touch1 World</td>
        <td id='touch1-world'>#</td>     
      </tr>
      <tr id='touch2-screen-row' style='display: none;'>
        <td>Touch2 Screen</td>
        <td id='touch2-screen'>#</td> 
      </tr>
      <tr id='touch2-world-row' style='display: none;'>
        <td>Touch2 World</td>
        <td id='touch2-world'>#</td> 
      </tr>
    </table>
</div>`;

export class Debug {
    constructor() {
        document.body.insertAdjacentHTML('afterbegin', html);
        this.fpsText = document.getElementById("fps");
        this.zoomText = document.getElementById("zoom");
        this.mouseScreenRow = document.getElementById("mouse-screen-row");
        this.mouseScreenText = document.getElementById("mouse-screen");
        this.mouseWorldRow = document.getElementById("mouse-world-row");
        this.mouseWorldText = document.getElementById("mouse-world");
        this.touch1ScreenRow = document.getElementById("touch1-screen-row");
        this.touch1ScreenText = document.getElementById("touch1-screen");
        this.touch1WorldRow = document.getElementById("touch1-world-row");
        this.touch1WorldText = document.getElementById("touch1-world");
        this.touch2ScreenRow = document.getElementById("touch2-screen-row");
        this.touch2ScreenText = document.getElementById("touch2-screen");
        this.touch2WorldRow = document.getElementById("touch1-world-row");
        this.touch2WorldText = document.getElementById("touch1-world");     
        this.lastUpdate =  Date.now();  
    }
    
    updateDebugText(scene) {
        if (Date.now() - this.lastUpdate < UPDATE_INTERVAL) return;
        this.fpsText.innerHTML = scene.game.loop.actualFps;
        this.zoomText.innerHTML = scene.cameras.main.zoom;
        
        if (scene.mouse.active) {
            this.mouseScreenRow.style.display = "block";
            this.mouseWorldRow.style.display = "block";
            this.mouseScreenText.innerHTML = '(' + Math.trunc(scene.mouse.x) + ', ' + Math.trunc(scene.mouse.y) + ')';
            this.mouseWorldText.innerHTML = '(' + Math.trunc(scene.mouse.worldX) + ', ' + Math.trunc(scene.mouse.worldY) + ')'; 
        } else {
            this.mouseScreenRow.style.display = "none";
            this.mouseWorldRow.style.display = "none";
        }
        if (scene.touch1.active) {
            this.touch1ScreenRow.style.display = "block";
            this.touch1WorldRow.style.display = "block";
            this.touch1ScreenText.innerHTML = '(' + Math.trunc(scene.touch1.x) + ', ' + Math.trunc(scene.touch1.y) + ')';
            this.touch1WorldText.innerHTML = '(' + Math.trunc(scene.touch1.worldX) + ', ' + Math.trunc(scene.touch1.worldY) + ')';
        } else {
            this.touch1ScreenRow.style.display = "none";
            this.touch1WorldRow.style.display = "none";
        }
        if (scene.touch2.active) {
            this.touch2ScreenRow.style.display = "block";
            this.touch2WorldRow.style.display = "block";
            this.touch2ScreenText.innerHTML = '(' + Math.trunc(scene.touch2.x) + ', ' + Math.trunc(scene.touch2.y) + ')';
            this.touch2WorldText.innerHTML = '(' + Math.trunc(scene.touch2.worldX) + ', ' + Math.trunc(scene.touch2.worldY) + ')';
        } else {
            this.touch2ScreenRow.style.display = "none";
            this.touch2WorldRow.style.display = "none";
        }
        this.lastUpdate =  Date.now();
    }  
}