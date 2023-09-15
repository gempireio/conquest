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

const GRID_LAYERS = 100;
const SEA_LEVEL = 35;
const MAX_ZOOM = 10;
const MIN_ZOOM = 15 / GRID_LAYERS;
const SHOW_GRID = false;
const SHOW_HEX_IDS = false;
const SHOW_ELEVATION_VALUES = false;
const MINOR_UPDATE_INTERVAL = 300; // milliseconds interval of each minor update
const TURN_TIME = 30;

let map;
let zoom = MIN_ZOOM * 1.2;
let lastMinorUpdate = 0;
let lasTimerReset = 0;


console.log(this);
let graphics;
let screenWidth;
let screenHeight;

function preload() {
    graphics = this.add.graphics();

    map = new Map( GRID_LAYERS, SEA_LEVEL, game_config.backgroundColor, this, graphics );
    if (SHOW_GRID) map.showGrid = true;
    if (SHOW_HEX_IDS) map.showElevationValues = true;
    if (SHOW_ELEVATION_VALUES) map.showElevationValues = true;
     
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
    this.cameras.main.setBounds(map.minX * 1.02, map.minY * 1.01, map.width * 1.04, map.height * 1.04, true);

    //this.add.image(0, 0, 'map').setOrigin(0);

    this.cameras.main.setZoom(zoom);
    this.cameras.main.setRoundPixels(true);
    //this.cameras.main.centerOn(screenWidth/2, screenHeight/2);
    updateGraphics();

    // Scroll Wheel event
    this.input.on('wheel', (e) => {
        if (e.deltaY < 0) { // Zoom In
            zoom *= 1.08;
        } else { // Zoom Out     
            zoom *= 0.92;
        }

        // Prevent from zooming in/out too far
        zoom = Math.max( MIN_ZOOM, Math.min(MAX_ZOOM, zoom) );
        this.cameras.main.setZoom(zoom);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
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
}

function updateGraphics() {
    map.drawMap();
}



