// Potential names
// Gempire: Expanse Sim
// Gempire: Strategy Board
// Gempire: Strategic Expanse

import {Map} from './map.js';
const URL_PARAMS = new URLSearchParams(window.location.search);

const GRID_LAYERS = URL_PARAMS.get('l') ? parseInt(URL_PARAMS.get('l')) : 60;
const SEA_LEVEL = URL_PARAMS.get('sl') ? parseInt(URL_PARAMS.get('sl')) : 35;
const MAX_ZOOM = 10;
const MIN_ZOOM = 10 / GRID_LAYERS;
const SHOW_GRID = URL_PARAMS.get('grid') ? URL_PARAMS.get('grid') : false;
const SHOW_DEBUG_TEXT = URL_PARAMS.get('debug') ? URL_PARAMS.get('debug') : false;
const TURN_TIME = 30;

let map;
let zoom = 2.5;
let lasTimerReset = 0;

let mapGraphics;
let cam;
let screenWidth;
let screenHeight;
let UIComponents = [];
let nonUIComponents = [];

class Game extends Phaser.Scene {

    constructor () { 
        super({ key: 'game', active: true });
    }

    preload() { 
        console.log("preload");   
        screenWidth = this.sys.game.canvas.width;
        screenHeight = this.sys.game.canvas.height;
    
        // Create progress bar
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x212527, 0.8);
        progressBox.fillRect(screenWidth/3, screenHeight/1.7 - 100, screenWidth/3, 150);
    
        // Loading text
        let loadingText = this.make.text({
            x: screenWidth / 2,
            y: screenHeight/1.7 - 150,
            text: 'Loading...',
            style: {
                font: '45px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);     
        let percentText = this.make.text({
            x: screenWidth / 2,
            y: screenHeight / 1.7 - 25,
            text: '0%',
            style: {
                font: '40px monospace',
                fill: '#ffffff'
            }
        });
        percentText.setOrigin(0.5, 0.5);
    
        this.load.on('progress', function(progressPercent) {
            percentText.setText(parseInt(progressPercent * 100) + '%');
            progressBar.clear();
            progressBar.fillStyle(0x112233, 1);
            progressBar.fillRect(screenWidth/3+5, screenHeight/1.7 - 95, (screenWidth/3 - 10) * progressPercent, 140);
        });
    
        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy(); 
        });
    
        // Scroll Wheel event
        this.input.on('wheel', (wheel) => {
            this.zoomUpdate(wheel.deltaY);
        });
    
        // Click event
        this.input.on('pointerdown', (pointer) => {
            // Zoom in on double click
            if( this.time.now - this.lastClick < 400 ){   
                zoom = Math.min(( zoom * 3 + MAX_ZOOM / 3 ) / 2, MAX_ZOOM);
                cam.pan( this.pointer.worldX, this.pointer.worldY, 500, Phaser.Math.Easing.Bounce.Out, true );  
                cam.zoomTo( zoom, 1000, Phaser.Math.Easing.Bounce.Out, true);        
            }
            
            this.lastClick = this.time.now;
            this.lastDownX = this.pointer.worldX;
            this.lastDownY = this.pointer.worldY;
    
            // TODO: Smoother mouse drag scrolling
            // this.downX = this.pointer.worldX;
            // this.downY = this.pointer.worldY;
            // this.downScrollX = cam.scrollX;
            // this.downScrollY = cam.scrollY;
            // this.lastDragUpdate = this.time.now;
        });
    
        // Mouse move event
        this.input.on('pointermove', (pointer) => {
            
            // Drag map on mouse pointer down
            if(pointer.isDown){
                cam.scrollX += this.lastDownX - this.pointer.worldX;
                cam.scrollY += this.lastDownY - this.pointer.worldY;
    
                // TODO: Smoother mouse drag scrolling
                // cam.scrollX = this.downScrollX + (this.downX - ((this.pointer.x / zoom ) + cam.worldView.x));
                // cam.scrollY = this.downScrollY + (this.downY - ((this.pointer.y / zoom ) + cam.worldView.y));
                // this.lastDragUpdate = this.time.now;
                this.lastDownX = this.pointer.worldX;
                this.lastDownY = this.pointer.worldY;
            }  
        });
    
        // Looped Timer Events
        // 20 second Loop
        this.time.addEvent({ delay: 20000, loop: true, callback: () => {
            console.log('FPS: ' + this.game.loop.actualFps);
        }});
    
        mapGraphics = this.add.graphics();
        nonUIComponents.push(mapGraphics);
    
        map = new Map( GRID_LAYERS, SEA_LEVEL, game_config.backgroundColor, this, mapGraphics, SHOW_DEBUG_TEXT );
        if (SHOW_DEBUG_TEXT) nonUIComponents.push(...map.debugTexts);
        if (SHOW_GRID) map.showGrid = true;
    }
    
    create() {
        console.log("create");
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D');
        this.pointer = this.input.activePointer;
        
        if (SHOW_DEBUG_TEXT) {
            this.coordLabel = this.add.text(0, 0, '(x, y)', { font: '70px monospace'});
            UIComponents.push(this.coordLabel);
        }
    
        console.log("add cameras");
        // Main Camera
        cam = this.cameras.main;
        cam.setBounds(map.minX * 1.025, map.minY * 1.025, map.width * 1.05, map.height * 1.05, true);
        cam.setZoom(MIN_ZOOM);
        cam.setRoundPixels(true);
        cam.ignore(UIComponents);
        
        // UI Camera (Ignore Zoom)
        const UICam = this.cameras.add(10, 10, screenWidth, screenHeight);
        UICam.ignore(nonUIComponents);
    
        console.log("draw graphics");
        this.updateGraphics();
    
        // Zoom into start location
        const tweenConfig = {
            targets: cam,
            zoom: zoom,
            duration: 3500,
            ease: 'Bounce.Out'
        }
        
        this.tweens.add(tweenConfig);
        cam.shake(1700, 0.004);
    }
    
    update(timestamp, elapsed) {
    
        // Pan on Arrow/WASD keys down
        if (this.keys.A.isDown || this.cursors.left.isDown) {
            cam.scrollX -= 20/zoom + 0.3;
        } 
        if (this.keys.D.isDown || this.cursors.right.isDown) {
            cam.scrollX += 20/zoom + 0.3;
        }
        if (this.keys.W.isDown || this.cursors.up.isDown) {
            cam.scrollY -= 20/zoom + 0.3;
        } 
        if (this.keys.S.isDown || this.cursors.down.isDown) {
            cam.scrollY += 20/zoom + 0.3;
        }
    
        // Update Debug Output
        if (SHOW_DEBUG_TEXT) this.coordLabel.setText(
            'FPS: ' + Math.trunc(this.game.loop.actualFps) +
            '\nZoom: ' + zoom +
            '\nScreen: (' + Math.trunc(this.pointer.x) + ', ' + Math.trunc(this.pointer.y) + ')' +
            '\nWorld: (' + Math.trunc(this.pointer.worldX) + ', ' + Math.trunc(this.pointer.worldY) + ')'
        );
    }
    
    updateGraphics() {
        map.drawMap();
    }

    zoomUpdate(zoomDelta) {
        if (zoomDelta == 0) return;
        if (zoomDelta < 0) { // Zoom In
            zoomDelta = 0.1 + Math.random() * 0.15;
        } else { // Zoom Out     
            zoomDelta = -0.1 - Math.random() * 0.15;
        }

        // Prevent from zooming in/out too far
        let oldZoom = zoom;
        zoom = Math.max( MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 + zoomDelta) ) );
 
        // Zoom to mouse pointer            
        cam.pan(this.pointer.worldX - (this.pointer.worldX - cam.midPoint.x) * ((oldZoom/zoom)), this.pointer.worldY - ( this.pointer.worldY - cam.midPoint.y) * ((oldZoom/zoom)), 150, Phaser.Math.Easing.Elastic.Out, true);
        cam.zoomTo( zoom, 200, Phaser.Math.Easing.Back.Out, true );    
    }
}

const game_config = {
    type: Phaser.WEBGL,
    backgroundColor: '#051231',
    scene: [Game],
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    }
};

let game = new Phaser.Game(game_config);
