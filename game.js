// Potential names
// Gempire: Expanse Sim
// Gempire: Strategy Board
// Gempire: Strategic Expanse

import {Map} from './map.js';
import {Player} from './player.js';

const URL_PARAMS = new URLSearchParams(window.location.search);
const GRID_LAYERS = URL_PARAMS.get('l') ? parseInt(URL_PARAMS.get('l')) : 60;
const SEA_LEVEL = URL_PARAMS.get('sl') ? parseInt(URL_PARAMS.get('sl')) : 35;
const MAX_ZOOM = 5;
const MIN_ZOOM = 15 / GRID_LAYERS;
const SHOW_GRID = URL_PARAMS.get('grid') ? URL_PARAMS.get('grid') : false;
const SHOW_DEBUG_TEXT = URL_PARAMS.get('debug') ? URL_PARAMS.get('debug') : false;
const TURN_TIME = 30;

let map;
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
        this.players = [];
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
            let zoomDelta;
            if (wheel.deltaY < 0) {
                zoomDelta = 0.1 + Math.random() * 0.15;
            } else {    
                zoomDelta = -0.1 - Math.random() * 0.15;
            }
            this.zoomUpdate(zoomDelta);
        });
    
        // Click event
        this.input.on('pointerdown', (pointer) => {
            // Zoom in on double click
            if( this.time.now - pointer.lastClick < 400 ){   
                let zoom = Math.min(( cam.zoom * 3 + MAX_ZOOM / 3 ) / 2, MAX_ZOOM);
                cam.pan( pointer.worldX, pointer.worldY, 500, Phaser.Math.Easing.Bounce.Out, true );  
                cam.zoomTo( zoom, 1000, Phaser.Math.Easing.Bounce.Out, true);        
            }
            
            pointer.lastClick = this.time.now;
            pointer.lastDownX = pointer.worldX;
            pointer.lastDownY = pointer.worldY;

            let hexID = map.selectAt(pointer.worldX, pointer.worldY);
        });
    
        // Mouse move event
        this.input.on('pointermove', (pointer) => {
            // Change cursor if mouse is down
            if (pointer.isDown) {
                this.input.manager.canvas.style.cursor = 'url("images/gem_scroll_32.png"), move';
            } else {            
                this.input.manager.canvas.style.cursor = 'auto';
            }
        });

        // Looped Timer Events
        // 20 second Loop
        this.time.addEvent({ delay: 20000, loop: true, callback: () => {
            console.log('FPS: ' + this.game.loop.actualFps);
        }});
    
        map = new Map( GRID_LAYERS, SEA_LEVEL, game_config.backgroundColor, this, SHOW_DEBUG_TEXT );
        if (SHOW_DEBUG_TEXT) nonUIComponents.push(...map.debugTexts);
        if (SHOW_GRID) map.showGrid = true;
        
        // Load Plugins
        this.load.plugin('rexpinchplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexpinchplugin.min.js', true);
    }
    
    create() {
        console.log("create");
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys('W,A,S,D,Q,E,Z,X,NUMPAD_ADD,NUMPAD_SUBTRACT');
        this.mouse = this.input.mousePointer;
        this.touch1 = this.input.pointer1;
        this.input.addPointer(1);
        this.touch2 = this.input.pointer2;

        if (SHOW_DEBUG_TEXT) {
            let fontSize = 10 + screenWidth / 35;
            this.degugText = this.add.text(0, 0, '(x, y)', { font: fontSize + 'px monospace'});
            UIComponents.push(this.degugText);
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
        UICam.ignore(map.elevationGraphics);
        UICam.ignore(map.selectGraphic);
    
        console.log("draw graphics");
        this.updateGraphics();

        console.log("Create Players and game objects");
        this.createPlayers(5);

        // Key down event
        let keyC = this.input.keyboard.addKey('C');
        keyC.on('down', (key) => {
            if (map.selectedHexId < 0) return;
            let hexVec = map.hexCenters[map.selectedHexId];
            cam.pan(hexVec.x, hexVec.y, 1000, Phaser.Math.Easing.Back.Out, true)
        });

        // Mouse pinch event
        let dragScale = this.plugins.get('rexpinchplugin').add(this);
        dragScale.on('drag1', function (dragScale) {
                let drag1Vector = dragScale.drag1Vector;
                cam.scrollX -= drag1Vector.x / cam.zoom;
                cam.scrollY -= drag1Vector.y / cam.zoom;
            }).on('pinch', function (dragScale) {
                let scaleFactor = dragScale.scaleFactor;
                cam.zoom *= scaleFactor;
            }, this);
    
        // Zoom into start location
        const tweenConfig = {
            targets: cam,
            zoom: ( MIN_ZOOM + MAX_ZOOM ) / 3,
            duration: 3000,
            ease: 'Bounce.Out'
        }
        
        this.tweens.add(tweenConfig);
        cam.shake(1500, 0.004);

        this.lastZoomUpdate = this.time.now;
    }
    
    update(timestamp, elapsed) {
    
        // Pan on Arrow/WASD keys down
        if (this.keys.A.isDown || this.cursors.left.isDown) {
            cam.scrollX -= 20/cam.zoom + 0.3;
        } 
        if (this.keys.D.isDown || this.cursors.right.isDown) {
            cam.scrollX += 20/cam.zoom + 0.3;
        }
        if (this.keys.W.isDown || this.cursors.up.isDown) {
            cam.scrollY -= 20/cam.zoom + 0.3;
        } 
        if (this.keys.S.isDown || this.cursors.down.isDown) {
            cam.scrollY += 20/cam.zoom + 0.3;
        }

        // Zoom in
        if (this.keys.Q.isDown || this.keys.Z.isDown || this.keys.NUMPAD_ADD.isDown) {
            if ( this.time.now - this.lastZoomUpdate > 35 ) {
                this.zoomUpdate(0.05);
            }           
        } 
        // Zoom out
        if (this.keys.E.isDown || this.keys.X.isDown || this.keys.NUMPAD_SUBTRACT.isDown) {
            if ( this.time.now - this.lastZoomUpdate > 35 ) {
                this.zoomUpdate(-0.05);
            }
        } 

        // Update Debug Output
        if (SHOW_DEBUG_TEXT) {
            let degugText = 'FPS: ' + this.game.loop.actualFps + '\nZoom: ' + cam.zoom;
            if (this.mouse.active) {
                degugText += '\nMouseScreen: (' + Math.trunc(this.mouse.x) + ', ' + Math.trunc(this.mouse.y) + ')' +
                '\nMouseWorld: (' + Math.trunc(this.mouse.worldX) + ', ' + Math.trunc(this.mouse.worldY) + ')'; 
            }
            if (this.touch1.active) {
                degugText += '\nTouch1Screen: (' + Math.trunc(this.touch1.x) + ', ' + Math.trunc(this.touch1.y) + ')' +
                '\nTouch1World: (' + Math.trunc(this.touch1.worldX) + ', ' + Math.trunc(this.touch1.worldY) + ')';
            }
            if (this.touch2.active) {
                degugText +='\nTouch2Screen: (' + Math.trunc(this.touch2.x) + ', ' + Math.trunc(this.touch2.y) + ')' +
                '\nTouch2WorldX: (' + Math.trunc(this.touch2.worldX) + ', ' + Math.trunc(this.touch2.worldY) + ')';
            }
            this.degugText.setText(degugText);
        } 
    }
    
    updateGraphics() {
        map.drawMap();
    }

    zoomUpdate(zoomDelta) {
        if (zoomDelta == 0) return;

        // Prevent from zooming in/out too far
        let oldZoom = cam.zoom;
        let newZoom = Math.max( MIN_ZOOM, Math.min(MAX_ZOOM, cam.zoom * (1 + zoomDelta) ) );
 
        // Zoom to mouse pointer            
        cam.pan(this.mouse.worldX - (this.mouse.worldX - cam.midPoint.x) * ((oldZoom/newZoom)), this.mouse.worldY - ( this.mouse.worldY - cam.midPoint.y) * ((oldZoom/newZoom)), 150, Phaser.Math.Easing.Elastic.Out, true);
        cam.zoomTo( newZoom, 200, Phaser.Math.Easing.Back.Out, true );    

        this.lastZoomUpdate = this.time.now;
    }

    createPlayers( playerCount ) {
        for ( let i = 0; i <= playerCount; i++){
            this.players.push( new Player(i, 'Player' + i, Phaser.Display.Color.RandomRGB(30,200), map.randHexID(),  map) );
        }
    }
}

const game_config = {
    backgroundColor: '#051231',
    input: { smoothFactor: 0.3 },
    scene: [Game],
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    }
};

let game = new Phaser.Game(game_config);
