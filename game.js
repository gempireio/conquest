import {Map} from './map.js';
import {Player} from './player.js';
import {Debug} from './debug.js';

const URL_PARAMS = new URLSearchParams(window.location.search);
const GRID_LAYERS = Math.max( 6, URL_PARAMS.get('l') ? parseInt(URL_PARAMS.get('l')) : 30 );
const SEA_LEVEL = URL_PARAMS.get('sl') ? parseInt(URL_PARAMS.get('sl')) : 35;
const MAX_ZOOM = 2;
const MIN_ZOOM = 6 / GRID_LAYERS;
const SHOW_GRID = URL_PARAMS.get('grid') ? URL_PARAMS.get('grid') : false;
const SHOW_DEBUG_TEXT = URL_PARAMS.get('debug') ? URL_PARAMS.get('debug') : false;
const STARTING_UNITS = 30;
const TURN_TIME = 30000;
const SLOW_UPDATE_INTERVAL = 150;

let debugObj;
let map;
let cam;

class Game extends Phaser.Scene {

    constructor () { 
        super({ key: 'game', active: true });
    }

    preload() { 

        if (SHOW_DEBUG_TEXT) {
            debugObj = new Debug();
        }

        console.log("preload");   

        // Scroll Wheel event
        this.input.on('wheel', (wheel) => {
            let scaleFactor;
            if (wheel.deltaY < 0) {
                scaleFactor = 1 + 0.1 + Math.random() * 0.1;
            } else {    
                scaleFactor = 1 - 0.1 - Math.random() * 0.1;
            }
            this.zoomUpdate(scaleFactor);
        });
    
        // Mouse down event
        this.input.on('pointerdown', (pointer) => {
            // Zoom in on double click
            if( this.time.now - pointer.lastClick < 300 ){   
                let zoom = Math.min(( cam.zoom * 3 + MAX_ZOOM / 3 ) / 2, MAX_ZOOM);
                cam.pan( pointer.worldX, pointer.worldY, 500, Phaser.Math.Easing.Bounce.Out, true );  
                cam.zoomTo( zoom, 1000, Phaser.Math.Easing.Bounce.Out, true);   
                let tileID = map.selectAt(pointer.worldX, pointer.worldY);
                pointer.lastClick = this.time.now;
                pointer.lastDownX = pointer.worldX;
                pointer.lastDownY = pointer.worldY;

                // Treat as dragging to maintain tile selection
                this.isDragging = true; 
                return;
            }

            pointer.lastClick = this.time.now;
            pointer.lastDownX = pointer.worldX;
            pointer.lastDownY = pointer.worldY;   
            this.dragIntensity = 0;  
        });

        // Mouse up event
        this.input.on('pointerup', (pointer) => {
            this.input.manager.canvas.style.cursor = 'auto';
            if (!this.isDragging) {
                let width = this.sys.game.canvas.width;
                let height = this.sys.game.canvas.height;
                let newScrollX = cam.scrollX;
                let newScrollY = cam.scrollY;
                if (width - pointer.x < width/13*cam.zoom + 25) {
                    newScrollX += cam.zoom * 2.5 + 90;
                }
                if (pointer.x < width/13*cam.zoom + 25) {
                    newScrollX -= cam.zoom * 2.5 + 90;
                }
                if (height - pointer.y < height/15*cam.zoom + 20) {
                    newScrollY += cam.zoom * 2 + 70;
                }
                if (pointer.y < height/15*cam.zoom + 20) {
                    newScrollY -= cam.zoom * 2 + 70;
                }
                this.add.tween({
                    targets: this.cameras.main,
                    scrollX: newScrollX,
                    scrollY: newScrollY,
                    duration: 250,
                    ease: 'Back.Out'
                });
                let tileID = map.selectAt(pointer.worldX, pointer.worldY, true);
            }     
            this.isDragging = false; 
            this.dragIntensity = 0;         
        });
    
        // Mouse move event
        this.input.on('pointermove', (pointer) => {
            // this.isDragging = false;

            // // Change cursor if mouse is down
            // if (pointer.isDown) {
            //     this.dragIntensity++;
            //     this.input.manager.canvas.style.cursor = 'url("images/gem_scroll_32.png"), move';

            //     // Prevent small drag movements
            //     if (this.dragIntensity > 10) {      
            //         this.isDragging = true; 
            //     }
            // } 
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
        this.keys = this.input.keyboard.addKeys('W,A,S,D,Q,E,Z,X,NUMPAD_ADD,NUMPAD_SUBTRACT,SPACE');
        this.mouse = this.input.mousePointer;
        this.touch1 = this.input.pointer1;
        this.input.addPointer(1);
        this.touch2 = this.input.pointer2;
    
        console.log("add cameras");
        // Main Camera
        cam = this.cameras.main;
        // cam.setBounds(map.minX * 1.05, map.minY * 1.05, map.width * 1.1, map.height * 1.1);
        cam.setZoom(MIN_ZOOM);
        cam.minZoom = MIN_ZOOM;
        cam.setRoundPixels(true);
        this.createPlayers(Math.max(2, Math.round(GRID_LAYERS/10) + 1), Math.max(3, Math.round(Math.pow(1.01, GRID_LAYERS) * 2) + 1));

        // Key down event
        let keyC = this.input.keyboard.addKey('C');
        keyC.on('down', (key) => {
            if (map.selectedtileID < 0) return;
            let hexVec = map.hexCenters[map.selectedtileID];
            cam.pan(hexVec.x, hexVec.y, 1000, Phaser.Math.Easing.Back.Out, true)
        });

        // Mouse pinch event
        let dragScale = this.plugins.get('rexpinchplugin').add(this);
        let scene = this;
        dragScale.on('drag1', function (dragScale) {
                scene.dragIntensity++;
                // Prevent small drag movements
                if (scene.dragIntensity > 10) {
                    scene.input.manager.canvas.style.cursor = 'url("images/gem_scroll_32.png"), move';
                    let drag1Vector = dragScale.drag1Vector;
                    cam.scrollX -= drag1Vector.x / cam.zoom;
                    cam.scrollY -= drag1Vector.y / cam.zoom;
                    scene.isDragging = true; 
                }
            }).on('pinch', function (dragScale) {
                scene.zoomUpdate(dragScale.scaleFactor);
            }, this);

        // Zoom and Fade In Intro
        cam.fadeIn(3000);
        const tweenConfig = {
            targets: cam,
            zoom: ( MIN_ZOOM + MAX_ZOOM ) / 2,
            duration: 3000,
            ease: 'Bounce.Out'
        } 
        this.tweens.add(tweenConfig);
        let startTile = Player.humanPlayer.highestUnitsTile();
        cam.pan( startTile.x, startTile.y, 1500, Phaser.Math.Easing.Back.Out, true );  
        cam.shake(2000, 0.004);
          
        fadeOutLoadingScreen();  
            
        console.log("draw graphics");
        map.drawBaseMap(); 
        map.updateGraphics();
        this.setStartVariables();

        // Code executed only after intro animations
        this.time.addEvent({ delay: 3000, loop: false, callback: () => {
            map.setCameraBoundsToFogOfWar();
        }});
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
                this.zoomUpdate(1.05);
            }           
        } 
        // Zoom out
        if (this.keys.E.isDown || this.keys.X.isDown || this.keys.NUMPAD_SUBTRACT.isDown) {
            if ( this.time.now - this.lastZoomUpdate > 35 ) {
                this.zoomUpdate(0.95);
            }
        } 

        if (this.keys.SPACE.isDown && Player.currentPlayer.isHumanPlayer()){
            this.nextTurn();
        }

        if ( this.time.now - this.turnStartTime > this.currentTurnTime ) {
            this.nextTurn();
        }

        if(this.time.now - this.lastSlowUpdate > SLOW_UPDATE_INTERVAL) {
            this.slowUpdate();
        }

        // Update Debug Output
        if (SHOW_DEBUG_TEXT) debugObj.updateDebugText(this);
    }

    slowUpdate() {
        if (Player.currentPlayer.isHumanPlayer()){
            setProgressColor(true);
            setProgress( (((this.time.now - this.turnStartTime) / this.currentTurnTime) * 100) );
        } else {
            setProgressColor(false);
            let playerTurnPercent = 1 / (Player.players.length - 1);
            let currentTurnProgress = (this.time.now - this.turnStartTime) / this.currentTurnTime;
            setProgress( ( (currentTurnProgress * playerTurnPercent) + Player.humanPlayer.progressToNextTurn() ) * 100 );
        }
        this.lastSlowUpdate = this.time.now;  
    }

    setStartVariables() {
        this.lastZoomUpdate = this.time.now;      
        this.turnStartTime = this.time.now;
        this.currentTurnTime = TURN_TIME * Math.random() / 8;
        this.lastSlowUpdate = this.time.now;
        this.round = 0;
        this.turnPlayer = 1;
    }

    nextTurn() {
        Player.currentPlayer.endTurn();

        // Increment Player and Round
        let nextPlayerID = Player.currentPlayer.playerID + 1;
        if (nextPlayerID >= Player.players.length) {
            nextPlayerID = 1;
            console.log("End Of Round " + this.round);
            this.round++;         
        }
        Player.currentPlayer = Player.players[nextPlayerID];

        // Retstart Turn Timer
        this.turnStartTime = this.time.now;
        if (Player.currentPlayer.isHumanPlayer()) {
            this.currentTurnTime = TURN_TIME;
        } else {
            this.currentTurnTime = TURN_TIME * Math.random() / 8;
        }

        Player.currentPlayer.startTurn();
    }

    zoomUpdate(scaleFactor) {
        if (scaleFactor == 1) return;

        // Prevent from zooming in/out too far
        let oldZoom = cam.zoom;
        let newZoom = Math.max( cam.minZoom, Math.min(MAX_ZOOM, cam.zoom * (scaleFactor) ) );
 
        // Zoom to mouse pointer            
        cam.pan(this.mouse.worldX - (this.mouse.worldX - cam.midPoint.x) * ((oldZoom/newZoom)), this.mouse.worldY - ( this.mouse.worldY - cam.midPoint.y) * ((oldZoom/newZoom)), 250, Phaser.Math.Easing.Back.Out, true);
        cam.zoomTo( newZoom, 350, Phaser.Math.Easing.Back.Out, true );    

        this.dragIntensity = 0;
        this.lastZoomUpdate = this.time.now;

        map.updateLOD(newZoom);

        // TODO: Adjust skew
        // let targetSkew = Math.max(0.4, Math.min(1, 0.15/cam.zoom ) );
        // map.setSkew( (map.skew * 0.6 ) + (targetSkew * 0.4) );
        // map.drawBaseMap(); 
        // map.updateGraphics();
    }

    createPlayers( playerCount, startTiles ) {
        console.log("creating " + playerCount + " players with " + startTiles + " start tiles each");
        for ( let i = 0; i < playerCount; i++){
            new Player(map, STARTING_UNITS, startTiles);
        }
        Player.chooseHumanPlayer();
        Player.currentPlayer = Player.players[1];
    }
}

const game_config = {
    transparent: true, 
    oceanColor: '#051231',
    input: { smoothFactor: 0.5 },
    scene: [Game],
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    }
};

let game = new Phaser.Game(game_config);
