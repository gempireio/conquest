// Potential names
// Gempire: Expanse Sim
// Gempire: Strategy Board
// Gempire: Strategic Expanse

import {Map} from './map.js';

const game_config = {
    type: Phaser.WEBGL,
    backgroundColor: '#051231',
    scene: {
        preload: preload,
        create: create, 
        update: update
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game',
        width: '100%',
        height: '100%'
    }
};

let game = new Phaser.Game(game_config);

const GRID_LAYERS = 150;
const SEA_LEVEL = 35;
const MAX_ZOOM = 10;
const MIN_ZOOM = 12 / GRID_LAYERS;
const SHOW_GRID = false;
const SHOW_DEBUG_TEXT = false;
const TURN_TIME = 30;

let map;
let zoom = 2.5;
let lasTimerReset = 0;

let graphics;
let screenWidth;
let screenHeight;
let UIComponents = [];
let nonUIComponents = [];

function preload() {
    graphics = this.add.graphics();
    nonUIComponents.push(graphics);

    map = new Map( GRID_LAYERS, SEA_LEVEL, game_config.backgroundColor, this, graphics, SHOW_DEBUG_TEXT );
    if (SHOW_DEBUG_TEXT) nonUIComponents.push(...map.debugTexts);
    if (SHOW_GRID) map.showGrid = true;
     
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

    this.load.on('progress', function (progressPercent) {
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
}

function create() {
    
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    if (SHOW_DEBUG_TEXT) {
        this.coordLabel = this.add.text(0, 0, '(x, y)', { font: '70px monospace'});
        this.pointer = this.input.activePointer;
        UIComponents.push(this.coordLabel);
    }

    // Main Camera
    this.cameras.main.setBounds(map.minX * 1.025, map.minY * 1.025, map.width * 1.05, map.height * 1.05, true);
    this.cameras.main.setZoom(MIN_ZOOM);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.ignore(UIComponents);
    

    // UI Camera (Ignore Zoom)
    const UICam = this.cameras.add(10, 10, screenWidth, screenHeight);
    UICam.ignore(nonUIComponents);

    updateGraphics();

    // Zoom into start location
    const tweenConfig = {
        targets: this.cameras.main,
        zoom: zoom,
        duration: 3500,
        ease: 'Bounce.Out'
    }
    
    this.tweens.add(tweenConfig);
    this.cameras.main.shake(1500, 0.005);

    // Scroll Wheel event
    this.input.on('wheel', (e) => {
        let zoomDelta;
        if (e.deltaY < 0) { // Zoom In
            zoomDelta = 0.05 + Math.random() * 0.2;
        } else { // Zoom Out     
            zoomDelta = -0.05 - Math.random() * 0.2;
        }
        
        // Prevent from zooming in/out too far
        zoom = Math.max( MIN_ZOOM, Math.min(MAX_ZOOM, zoom * (1 + zoomDelta) ) );

        const tweenConfig = {
            targets: this.cameras.main,
            zoom: zoom,
            duration: 300,
            ease: 'Back.Out'
        }
        const tween = this.tweens.add(tweenConfig);
    });

    // Looped Timer Events
    // 20 second Loop
    this.time.addEvent({ delay: 20000, loop: true, callback: () => {
        console.log('FPS: ' + this.game.loop.actualFps);
    }});
}

function update(timestamp, elapsed) {
    const cam = this.cameras.main;

    if (this.keys.A.isDown || this.cursors.left.isDown) {
        cam.scrollX -= 10/zoom + 0.2;
    }
    else if (this.keys.D.isDown || this.cursors.right.isDown) {
        cam.scrollX += 10/zoom + 0.2;
    }

    if (this.keys.W.isDown || this.cursors.up.isDown) {
        cam.scrollY -= 10/zoom + 0.2;
    }
    else if (this.keys.S.isDown || this.cursors.down.isDown) {
        cam.scrollY += 10/zoom + 0.2;
    }

    if (SHOW_DEBUG_TEXT) this.coordLabel.setText(
        'FPS: ' + Math.trunc(this.game.loop.actualFps) +
        '\n(' + Math.trunc(this.pointer.x) + ', ' + Math.trunc(this.pointer.y) + ')'
    );
}

function updateGraphics() {
    map.drawMap();
}



