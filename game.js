import {Map} from './map.js';
import {Player} from './player.js';
import {Debug} from './debug.js';

const URL_PARAMS = new URLSearchParams(window.location.search);
const GRID_LAYERS = URL_PARAMS.get('l') ? parseInt(URL_PARAMS.get('l')) : 60;
const SEA_LEVEL = URL_PARAMS.get('sl') ? parseInt(URL_PARAMS.get('sl')) : 35;
const MAX_ZOOM = 4;
const MIN_ZOOM = 6 / GRID_LAYERS;
const SHOW_GRID = URL_PARAMS.get('grid') ? URL_PARAMS.get('grid') : false;
const SHOW_DEBUG_TEXT = URL_PARAMS.get('debug') ? URL_PARAMS.get('debug') : false;
const TURN_TIME = 30;

let debugObj;
let map;
let lasTimerReset = 0;

let mapGraphics;
let cam;
let screenWidth;
let screenHeight;

class Game extends Phaser.Scene {

    constructor () { 
        super({ key: 'game', active: true });
        this.players = [];
    }

    preload() { 

        if (SHOW_DEBUG_TEXT) {
            debugObj = new Debug();
        }

        console.log("preload");   
        screenWidth = this.sys.game.canvas.width;
        screenHeight = this.sys.game.canvas.height;

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
                let hexID = map.selectAt(pointer.worldX, pointer.worldY);
                pointer.lastClick = this.time.now;
                pointer.lastDownX = pointer.worldX;
                pointer.lastDownY = pointer.worldY;
                return;
            }

            pointer.lastClick = this.time.now;
            pointer.lastDownX = pointer.worldX;
            pointer.lastDownY = pointer.worldY;
            
            let hexID = map.selectAt(pointer.worldX, pointer.worldY, true);
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
    
        map = new Map( GRID_LAYERS, SEA_LEVEL, game_config.oceanColor, this );
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
    
        console.log("add cameras");
        // Main Camera
        cam = this.cameras.main;
        cam.setBounds(map.minX * 1.025, map.minY * 1.025, map.width * 1.05, map.height * 1.05, true);
        cam.setZoom(MIN_ZOOM);
        cam.setRoundPixels(true);
    
        console.log("draw graphics");
        this.updateGraphics();

        console.log("Create Players and game objects");
        this.createPlayers(5);

        // Key down event
        let keyC = this.input.keyboard.addKey('C');
        keyC.on('down', (key) => {
            if (map.selectedhexID < 0) return;
            let hexVec = map.hexCenters[map.selectedhexID];
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
            
        // Zoom and Fade In Intro
        //cam.fadeIn(3000);
        const tweenConfig = {
            targets: cam,
            zoom: ( MIN_ZOOM + MAX_ZOOM ) / 3,
            duration: 3000,
            ease: 'Bounce.Out'
        } 
        this.tweens.add(tweenConfig);
        cam.shake(1500, 0.004);

        this.lastZoomUpdate = this.time.now;    
        fadeOutLoadingScreen();    
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
        if (SHOW_DEBUG_TEXT) debugObj.updateDebugText(this);
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
    transparent: true, 
    oceanColor: '#051231',
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
