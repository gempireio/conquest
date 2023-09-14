//const SQRT3 = Math.sqrt(3);
const SQRT3 = 1.8; // Rounded up bc it looks squished (too thin) otherwise
const GRID_LAYERS = 120; // Max aprox. 146 for Uint16 hexagons
const FRAME_RATE = 60;
const MAX_SCALE_FACTOR = 200;
const MIN_SCALE_FACTOR = 400 / GRID_LAYERS;
const SHOW_GRID = false;
const SHOW_HEX_IDS = false;
const SHOW_ELEVATION_VALUES = false;
const MINOR_UPDATE_INTERVAL = 300; // milliseconds interval of each minor update
const MAX_HEX_ID = 3 * (GRID_LAYERS + 1) * GRID_LAYERS;
const TURN_TIME = 30;

let hexagons;
let hexagonImg;
let scaleFactor = MIN_SCALE_FACTOR * 1.1;
let hexGrid;
let offsetX = offsetY = 0;
let hexCenters = [];
let colors = new Uint8Array( (MAX_HEX_ID + 1) * 4 );
let activeHexagons = new Set(); // Hexagons that should be colored

let lastMinorUpdate = lastTurnTimerReset = 0;
let elevations = new Uint8Array(MAX_HEX_ID + 1);
let RIGHT;
let DOWN_RIGHT;
let DOWN_LEFT;
let LEFT;
let UP_LEFT;
let UP_RIGHT;
let DIRECTIONS;
let CORNER_DIRECTIONS;
let OFFSET_DIRECTIONS;
let scaledDirections = [];



function setup() {
    frameRate(FRAME_RATE);
    offsetX = windowWidth / 2;
    offsetY = windowHeight / 2;
    RIGHT = createVector(2 * SQRT3, 0);
    UP_RIGHT = createVector(SQRT3,  -3);
    UP_LEFT = createVector(-SQRT3, -3);
    LEFT = createVector(-2 * SQRT3, 0);
    DOWN_LEFT = createVector(-SQRT3, 3);
    DOWN_RIGHT = createVector(SQRT3, 3);
    DIRECTIONS = [ RIGHT, DOWN_RIGHT, DOWN_LEFT, LEFT, UP_LEFT, UP_RIGHT];
    CORNER_DIRECTIONS = [ LEFT, UP_LEFT, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN_LEFT ];
    OFFSET_DIRECTIONS = [ UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN_LEFT, LEFT, UP_LEFT ];
    generateElevations();
    hexGrid = createGraphics(windowWidth, windowHeight);
    createCanvas(windowWidth, windowHeight);
    updateGraphics();
}


/**
 * Set each hexagon corner to random color
 */
function setCornerColors(strength){
    for (let layer = 0; layer <= GRID_LAYERS; layer++) {
        for (let corner = 0; corner <= 5; corner++) {
            let hexId = cornerHex(layer, corner);
            colors[hexId*4] = Math.round( ( strength * randInt(200,250) ) + ( (1 - strength) * colors[hexId*4] ) );
            colors[(hexId*4)+1] = Math.round( ( strength * randInt(200,250) ) + ( (1 - strength) * colors[hexId*4+1] ) );
            colors[(hexId*4)+2] = Math.round( ( strength * randInt(200,250) ) + ( (1 - strength) * colors[hexId*4+2] ) );
            colors[(hexId*4)+3] = Math.round( ( strength * randInt(200,255) ) + ( (1 - strength) * colors[hexId*4+3] ) );
        }
    }
}

/**
 * Clear all hexagon colors
 */
function resetColors(){
    for (let i = 0; i < colors.length; i += 4) {
        colors[i] = 0;
        colors[i+1] = 0;
        colors[i+2] = 0;
        colors[i+3] = 0;
        activeHexagons.delete(i/4);
    }
}

function setRandomNeighborColors(){
    for (let i = 0; i < colors.length; i += 4) {
        
        //if ( !isCornerHex(i/4) ) continue; // skip non corners
        if ( Math.random() < 0.99 ) continue;  // random skip
        //if (![6,96].includes(i/4)) continue;
        colors[i] = 100;
        colors[i+1] = 150;
        colors[i+2] = 255;
        colors[i+3] = 255;
        activeHexagons.add(i/4);
       
        // green
        let neighbor = upLeftNeighbor(i/4);
        colors[neighbor*4] = 150;
        colors[(neighbor*4)+1] = 255;
        colors[(neighbor*4)+2] = 100;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);

        // pink
        neighbor = upRightNeighbor(i/4);
        colors[neighbor*4] = 230;
        colors[(neighbor*4)+1] = 90;
        colors[(neighbor*4)+2] = 150;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);

        // yellow
        neighbor = rightNeighbor(i/4);
        colors[neighbor*4] = 255;
        colors[(neighbor*4)+1] = 200;
        colors[(neighbor*4)+2] = 50;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);

        // purple
        neighbor = downRightNeighbor(i/4);
        colors[neighbor*4] = 180;
        colors[(neighbor*4)+1] = 80;
        colors[(neighbor*4)+2] = 250;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);

        // blue
        neighbor = downLeftNeighbor(i/4);
        colors[neighbor*4] = 80;
        colors[(neighbor*4)+1] = 180;
        colors[(neighbor*4)+2] = 200;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);

        // orange
        neighbor = leftNeighbor(i/4);
        colors[neighbor*4] = 255;
        colors[(neighbor*4)+1] = 120;
        colors[(neighbor*4)+2] = 70;
        colors[(neighbor*4)+3] = 255;
        activeHexagons.add(neighbor);
    }
}

function newRandom8bitInt(previousInt, maxChange){
    let minInt = Math.max(0, previousInt - maxChange);
    let maxInt = Math.min(255, previousInt + maxChange);
    return randInt(minInt, maxInt);
}

function updateGraphics(){
    background(5, 12, 36); 
    updateScaledDirections();
    updateHexagonCenters();    
    coloredHexagons = createGraphics(windowWidth, windowHeight);
    for (let hexId = 0; hexId <= MAX_HEX_ID; hexId++) {
        drawLandHexagon(hexId, hexCenters[hexId].x, hexCenters[hexId].y, scaleFactor, coloredHexagons);     
    }
    image(coloredHexagons, 0, 0);
    drawMovingControls();
    if (SHOW_GRID) drawHexGrid(GRID_LAYERS);
}

function draw() {
    drawMovingControls();
    if (millis() - lastMinorUpdate > MINOR_UPDATE_INTERVAL){
        minorUpdate();
    }
}

/**
 * Functions that should be called regularly, but less often than draw()
 */
function minorUpdate() {
    lastMinorUpdate = millis();
}

function endTurn() {
    lastTurnTimerReset = millis();
}

function resetTurnTimer() {
    lastTurnTimerReset = millis();
}

/**
 * Handles the mouse wheel event to zoom in/out.
 * @param {object} e - The mouse wheel event object.
 */
function mouseWheel(e) {
    let oldScaleFactor = scaleFactor;
	if (e.delta < 0) { // Zoom In
		scaleFactor *= 1.05;
    } else { // Zoom Out     
		scaleFactor *= 0.95;
    }
    forceInView();
    offsetX =  -(( mouseX - offsetX ) / oldScaleFactor) * scaleFactor + mouseX;
    offsetY =  -(( mouseY - offsetY ) / oldScaleFactor) * scaleFactor + mouseY;
    
    updateGraphics();
}

/**
 * Handles the mouse move event.
 * @param {object} e - The move event object.
 */
function mouseMoved(e) {
    
    let xEdgeCutoff = windowWidth / 4.5;
    let yEdgeCutoff = windowHeight / 5.5;
    if (windowWidth - mouseX < xEdgeCutoff) {
        scrollX = -Math.pow(( xEdgeCutoff - ( windowWidth - mouseX ) ) / 500, 5);
    } else if (mouseX < xEdgeCutoff) {
        scrollX = -Math.pow(-( xEdgeCutoff - mouseX ) / 500, 5);  
    } else {
        scrollX = 0;
    }

    if (windowHeight - mouseY < yEdgeCutoff) {
        scrollY = -Math.pow(( yEdgeCutoff - ( windowHeight - mouseY ) ) / 300, 5);
    } else if (mouseY < yEdgeCutoff) {
        scrollY = -Math.pow(-( yEdgeCutoff - mouseY ) / 300, 5);
    } else {
        scrollY = 0;
    }

    if ( Math.abs(scrollX) < 1 ) scrollX = 0;
    if ( Math.abs(scrollY) < 1 ) scrollY = 0;
    forceInView();
    
}

/**
 * Handles the mouse drag event (mouse button pressed and moved).
 * @param {object} e - The mouse wheel event object.
 */
function mouseDragged(e) {

    // TODO: Match mouse movement. Similar to Google Maps.
    // offsetX += Math.pow(Math.max(-2.5, Math.min(2.5, e.movementX)),3);
    // offsetY += Math.pow(Math.max(-2.5, Math.min(2.5, e.movementY)),3); 
    offsetX += e.movementX;
    offsetY += e.movementY; 
    forceInView();
    updateGraphics();
}

function mouseClicked(e) {
    
    let hexId = hexIdAtCoord( createVector(mouseX, mouseY) );
    colors[hexId * 4] = randInt(30,230);
    colors[hexId * 4+1] = randInt(30,230);
    colors[hexId * 4+2] = randInt(30,230);
    colors[hexId * 4+3] = randInt(200,255);
    activeHexagons.add(hexId);

    let oldScaleFactor = scaleFactor;
    scaleFactor *= 1.01;
    offsetX =  -(( mouseX - offsetX ) / oldScaleFactor) * scaleFactor + mouseX;
    offsetY =  -(( mouseY - offsetY ) / oldScaleFactor) * scaleFactor + mouseY;

    forceInView();
    updateGraphics();

    // prevent default
    return false;
}

function doubleClicked(e){

    
    if (scaleFactor > MAX_SCALE_FACTOR/2) return;
    let hexId = hexIdAtCoord( createVector(mouseX, mouseY) );
    let hexPos = hexPosition(hexId);
    // colors[hexId * 4] = randInt(30,230);
    // colors[hexId * 4+1] = randInt(30,230);
    // colors[hexId * 4+2] = randInt(30,230);
    // colors[hexId * 4+3] = randInt(200,255);
    // activeHexagons.add(hexId); 

    let oldScaleFactor = scaleFactor;
    scaleFactor *= 1.2 + (40/scaleFactor);

    // Zoom to mouse location
    // offsetX =  -(( mouseX - offsetX ) / oldScaleFactor) * scaleFactor + mouseX;
    // offsetY =  -(( mouseY - offsetY ) / oldScaleFactor) * scaleFactor + mouseY;

    // Center clicked hexagon
    offsetX = (windowWidth/2) - ( hexPos.x * scaleFactor );
    offsetY = (windowHeight/2) - ( hexPos.y * scaleFactor );

    forceInView();
    updateGraphics();

    // prevent default
    return false;
}
/**
 * @returns {float} the X coordinate in the global hex grid of the given 
 * @param {float} screenX coordinates of users screen
 * Removes offsetX and scaleFactor
 * Inconsistent?
 */
function gridX(screenX){
    return (screenX - offsetX)/scaleFactor;
}

/**
 * @returns {float} the Y coordinate in the global hex grid of the given 
 * @param {float} screenY coordinates of users screen
 * Removes offsetY and scaleFactor
 * Inconsistent?
 */
function gridY(screenY){
    return (screenY - offsetY)/scaleFactor;
}

/**
 * Checks and resets offset values to prevent grid from going out of view or zooming out too far.
 */
function forceInView() {
    // Limit of scaleFactor based on window size
    // if ( scaleFactor < ( windowWidth / 360 ) + ( windowHeight / 180 ) - (GRID_LAYERS/2) ) {
    //     scaleFactor = ( 0.1 * scaleFactor ) + ( 0.9 * ( ( windowWidth / 360 ) + ( windowHeight / 180 ) - (GRID_LAYERS/2) ) );
    // }

    // Prevent from zooming in/out too far
    if ( scaleFactor < MIN_SCALE_FACTOR ) {
        scaleFactor = MIN_SCALE_FACTOR;
    } else if (scaleFactor > MAX_SCALE_FACTOR) {
        scaleFactor = MAX_SCALE_FACTOR;
    }

    // Prevent grid from moving out of view
    if ( offsetX / scaleFactor > GRID_LAYERS * 3.7 ) {
        offsetX = ( 0.7 * offsetX) + ( 0.3 * ( GRID_LAYERS * 3.7 * scaleFactor ) );
    }
    if ( offsetY / scaleFactor > GRID_LAYERS * SQRT3 * 1.8 ) {
        offsetY = ( 0.7 * offsetY) + ( 0.3 * ( GRID_LAYERS * SQRT3 * 1.8 * scaleFactor ) );
    }
    if ( ( (windowWidth - offsetX) / scaleFactor ) > GRID_LAYERS * 3.7 ) {
        offsetX = ( 0.7 * offsetX) + ( 0.3 * (-( ( GRID_LAYERS * 3.7 * scaleFactor ) - windowWidth) ) );
    }
    if ( ( (windowHeight - offsetY) / scaleFactor )  > GRID_LAYERS * SQRT3 * 1.8 ) {
        offsetY = ( 0.7 * offsetY) + ( 0.3 * (-( ( GRID_LAYERS * SQRT3 * 1.8 * scaleFactor ) - windowHeight) ) );
    }
}


/**
 * Function that is called when the window is resized.
 * @param {Event} e - the resize event object
 */
function windowResized(e) {
	resizeCanvas(windowWidth, windowHeight);
    hexGrid = createGraphics(windowWidth, windowHeight);
    coloredHexagons = createGraphics(windowWidth, windowHeight);
    forceInView();
    updateGraphics();
}

// Flat side up
// function drawHexagon(x,y,s) {
//     stroke(180,100,150);
//     strokeWeight(0.05);
//     noFill();
//     translate(x, y);
//     scale(s);
//     beginShape();
//     vertex(-1, -SQRT3);
//     vertex(1, -SQRT3);
//     vertex(2, 0);
//     vertex(1, SQRT3);
//     vertex(-1, SQRT3);
//     vertex(-2, 0);
//     endShape(CLOSE);
// }


/**
 * Draws a filled hexagon (pointy side up) at given x, y coordinates.
 * @param x the center x coordate to draw to
 * @param y the center y coordate to draw to
 * @param s the scale factor (size) of the hexagon
 * @param buffer the image buffer canvas to draw to
 */
function drawLandHexagon(hexId, x, y, s, buffer) {
    let elevation = elevations[hexId];
    buffer.push();
    buffer.translate(x, y);
    buffer.scale(s);
    buffer.noStroke();
    switch (landTypeOf(hexId)) {
        case 0: // Ocean
            buffer.noFill(); 
            break; 
        case 1: // Wetland
            buffer.fill(elevation/1.7,elevation,elevation/1.1);
            break; 
        case 2: // Plain
            buffer.fill(elevation*1.3,elevation*1.5,elevation/3);
            break; 
        case 3: // Desert
            buffer.fill(elevation,elevation/1.1,elevation/2);
            break; 
        case 4: // Plateau
            buffer.fill(elevation/2,elevation/1.9,elevation/2.4);
            break; 
        case 5: // Lake
            buffer.fill(50,100,150);
            break; 
        case 6: // Hill
            buffer.fill(elevation/3.2,elevation/2.1,elevation/5);
            break; 
        case 7: // Mountain
            buffer.fill(elevation/4.7,elevation/4.5,elevation/5);
            break; 
        default:
            buffer.fill(elevations[hexId],elevations[hexId],elevations[hexId]);
    }
    buffer.beginShape();
    buffer.vertex(0, -2);
    buffer.vertex(SQRT3, -1);
    buffer.vertex(SQRT3, 1);
    buffer.vertex(0, 2);
    buffer.vertex(-SQRT3, 1);
    buffer.vertex(-SQRT3, -1);
    buffer.endShape(CLOSE);
    buffer.pop();

    // // Edge 0
    // buffer.fill(color(randInt(colors[hexId*4]-30, colors[hexId*4]-15), randInt(colors[hexId*4+1]-30, colors[hexId*4+1]-15), randInt(colors[hexId*4+2]-30, colors[hexId*4+2]-15), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(0, -1); 
    // buffer.vertex(-SQRT3/2, -0.5 ); 
    // buffer.vertex(-SQRT3, -1);
    // buffer.vertex(0, -2);
    // buffer.endShape(CLOSE);

    // // Edge 1
    // buffer.fill(color(randInt(colors[hexId*4]-25, colors[hexId*4]-10), randInt(colors[hexId*4+1]-25, colors[hexId*4+1]-10), randInt(colors[hexId*4+2]-25, colors[hexId*4+2]-10), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(SQRT3/2, -0.5);
    // buffer.vertex(0, -1);
    // buffer.vertex(0, -2);
    // buffer.vertex(SQRT3, -1);
    // buffer.endShape(CLOSE);

    // // Edge 2  
    // buffer.fill(color(randInt(colors[hexId*4]+5, colors[hexId*4]+20), randInt(colors[hexId*4+1]+5, colors[hexId*4+1]+20), randInt(colors[hexId*4+2]+5, colors[hexId*4+2]+20), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(SQRT3/2, 0.5);
    // buffer.vertex(SQRT3/2, -0.5);
    // buffer.vertex(SQRT3, -1);
    // buffer.vertex(SQRT3, 1);
    // buffer.endShape(CLOSE);

    // // Edge 3
    // buffer.fill(color(randInt(colors[hexId*4]+10, colors[hexId*4]+30), randInt(colors[hexId*4+1]+5, colors[hexId*4+1]+30), randInt(colors[hexId*4+2]+10, colors[hexId*4+2]+30), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(0, 1);
    // buffer.vertex(SQRT3/2, 0.5);
    // buffer.vertex(SQRT3, 1);
    // buffer.vertex(0, 2);
    // buffer.endShape(CLOSE);

    // // Edge 4
    // buffer.fill(color(randInt(colors[hexId*4]+5, colors[hexId*4]+20), randInt(colors[hexId*4+1]+5, colors[hexId*4+1]+20), randInt(colors[hexId*4+2]+5, colors[hexId*4+2]+20), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(-SQRT3/2, 0.5);
    // buffer.vertex(0, 1);
    // buffer.vertex(0, 2);
    // buffer.vertex(-SQRT3, 1);
    // buffer.endShape(CLOSE);

    // // Edge 5
    // buffer.fill(color(randInt(colors[hexId*4]-25, colors[hexId*4]-10), randInt(colors[hexId*4+1]-25, colors[hexId*4+1]-10), randInt(colors[hexId*4+2]-25, colors[hexId*4+2]-10), colors[hexId*4+3]));
    // buffer.strokeWeight(0);
    // buffer.beginShape();
    // buffer.vertex(-SQRT3/2, -0.5);
    // buffer.vertex(-SQRT3/2, 0.5);
    // buffer.vertex(-SQRT3, 1);
    // buffer.vertex(-SQRT3, -1);
    // buffer.endShape(CLOSE);

    
}


/**
 * Draws a hexagon border (pointy side up) at given x, y coordinates.
 * @param x the center x coordate to draw to
 * @param y the center y coordate to draw to
 * @param s the scale factor (size) of the hexagon
 * @param buffer the image buffer canvas to draw to
 */
function drawHexagonBorder(hexId, x, y, s, buffer) {
    if (!SHOW_GRID) return;
    buffer.strokeWeight((0.08/s)+.01);
    buffer.stroke(200, 240, 255, 150);
    buffer.noFill();    
    buffer.push();
    buffer.translate(x, y);
    buffer.scale(s);
    buffer.beginShape();
    buffer.vertex(0, -2);
    buffer.vertex(SQRT3, -1);
    buffer.vertex(SQRT3, 1);
    buffer.vertex(0, 2);
    buffer.vertex(-SQRT3, 1);
    buffer.vertex(-SQRT3, -1);
    buffer.endShape(CLOSE);
    buffer.pop();
}

function drawTimerButton(){
    
    const size = ( windowWidth + windowHeight ) * 0.03;
    const x = size/2;
    const y = size/2;
    const progress = Math.min( 1, ( millis() - lastTurnTimerReset ) / ( TURN_TIME * 1000 ) );
    let buffer = createGraphics(size, size);
    buffer.push();

    // Back Green Circle
    buffer.fill(50,200,100);
    buffer.strokeWeight(3);
    buffer.stroke(25,100,50);
    buffer.circle(x, y, size);

    // Timer Progress
    buffer.fill(240,50,50);
    buffer.strokeWeight(3);
    buffer.stroke(120,25,25);
    buffer.arc(x, y, size, size, 0, progress*2*PI, PIE);

    // Inner Blue Button
    buffer.fill(100,150,200);
    buffer.circle(x, y, size - 40);
    buffer.pop();

    image(buffer, windowWidth - size - 100, windowHeight - size - 70);
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function randInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns the land type of a given elevation
 */
function elevationToLandType(elevation){
    return Math.floor(elevation / 31.88);
}

/**
 * Returns the center elevation of a given land type
 */
function landTypeToElevation(landType){
    return ( landType + 0.5 ) * 31.88;
}

/**
 * Returns the given elevation centered around the average elevation for its land type
 */
function centerElevation(elevation){
    return landTypeToElevation(elevationToLandType(elevation));
}

/**
 * Returns the land type of a given hexagon
 */
function landTypeOf(hexId) {
    return elevationToLandType(elevations[hexId]);
}

function createLandTypeCluster(hexId, landType, iterations, directionVariation) {
    const elevation = landTypeToElevation(landType);
    let direction = randInt(0,5);
    for (let i = 0; i < iterations; i++) {
        // Set all neighbors to given landType
        elevations[hexId] = elevation;
        let neighborIds = neighborsOf(hexId);
        for (let j = 0; j < neighborIds.length; j++) {
            elevations[neighborIds[j]] = ( 0.8 * elevation ) + ( 0.2 * elevations[neighborIds[j]] );
        }

        // Move HexId 2 steps in current direction
        switch (direction) {
            case 0:
                hexId = upLeftNeighbor(hexId);
            case 1:
                hexId = upRightNeighbor(hexId);
            case 2:
                hexId = rightNeighbor(hexId);
            case 3:
                hexId = downRightNeighbor(hexId);
            case 4:
                hexId = downLeftNeighbor(hexId);
            default:
                hexId = leftNeighbor(hexId);
        }

        // Return if moved off grid
        if (hexId >= MAX_HEX_ID) return; 

        // Change Direction Randomly
        if (Math.random() < directionVariation) {
            direction = randInt(0,5);
        }
    }
}

function generateElevations() {

    // First pass: assign every hexagon by incremnting ID(spiral outward) varying land type slightly
    // Tend towards 0 (ocean) at edges and 255 (fresh water, mountains) at center
    let currentValue = randInt(200,255);
    elevations[0] = elevations[1] = currentValue;
    for (let hexId = 2; hexId <= elevations.length; hexId++) {
        let currentLayer = layerOf(hexId);
        let neighborIds = neighborsOf(hexId);
        currentValue = (currentValue + elevations[Math.min(...neighborIds)] + elevations[Math.min(...neighborIds) + 1]) / 3 + randInt(-47,40);
        currentValue = Math.round((0.99 * currentValue) + (0.01 * 255 * (1 - (currentLayer / (GRID_LAYERS))))); // Tend towards 0 at edges.
        for (let neighborId = 0; neighborId < neighborIds.length; neighborId++){
            // if ( neighborId < hexId ) {
            //     elevations[neighborId] = ( 0.01 * elevations[neighborId] ) + ( 0.99 * currentValue );
            //     currentValue = ( 0.1 * elevations[neighborId] ) + ( 0.9 * currentValue );
            // }
        }
        
        elevations[hexId] = Math.min(Math.max(Math.round(currentValue), 0), 255);

        if (layerOf(hexId) >= Math.round(GRID_LAYERS * 0.9)) {
            elevations[hexId] = 0;
        }
    }

    // Plains Clusters
    for (let i = 0; i < MAX_HEX_ID/900; i++) {
        let hexId = randInt(0,MAX_HEX_ID/2);
        createLandTypeCluster(hexId, 2, randInt(8,20), 0.4);
    }

    // Hill Clusters
    for (let i = 0; i < MAX_HEX_ID/1500; i++) {
        let hexId = randInt(0,MAX_HEX_ID/4);
        createLandTypeCluster(hexId, 6, randInt(5,15), 0.3);
    }

    // Desert Clusters
    for (let i = 0; i < MAX_HEX_ID/1800; i++) {
        let hexId = randInt(0,MAX_HEX_ID/5);
        createLandTypeCluster(hexId, 3, randInt(5,8), 0.5);
    }

    // Plateau Clusters
    for (let i = 0; i < MAX_HEX_ID/2000; i++) {
        let hexId = randInt(0,MAX_HEX_ID/4);
        createLandTypeCluster(hexId, 4, randInt(5,8), 0.7);
    }

    // Wetland Clusters
    for (let i = 0; i < MAX_HEX_ID/1500; i++) {
        let hexId = randInt(MAX_HEX_ID/2,MAX_HEX_ID);
        createLandTypeCluster(hexId, 1, randInt(5,15), 0.3);
    }

    // Lake Clusters
    for (let i = 0; i < MAX_HEX_ID/2000; i++) {
        let hexId = randInt(0,MAX_HEX_ID/5);
        createLandTypeCluster(hexId, 5, randInt(8,12), 0.8);
    }

    // Mountain Clusters
    for (let i = 0; i < MAX_HEX_ID/800; i++) {
        let hexId = randInt(0,MAX_HEX_ID/7);
        createLandTypeCluster(hexId, 7, randInt(5,12), 0.1);
    }
 
    // Ocean Clusters
    for (let i = 0; i < MAX_HEX_ID/1000; i++) {
        let hexId = randInt(MAX_HEX_ID/2,MAX_HEX_ID);
        createLandTypeCluster(hexId, 0, randInt(10,20), 0.6);
    }

    // Smooth land by setting elevation of randomly selected hexagon to the average elevation of its neighbors
    for (let i = 0; i < MAX_HEX_ID; i++) {

        let hexId = randInt(0,MAX_HEX_ID);
        let total = elevations[hexId];
        let count = 1;
        let neighborIds = neighborsOf(hexId);
        for (let i = 0; i < neighborIds.length; i++){
            total += elevations[neighborIds[i]];
            count++;
        }
        //landTypeToElevation(landType)
        elevations[hexId] = centerElevation( Math.round(total / count) );
    }

    for (let hexId = 1; hexId < elevations.length; hexId++) {
        // Make Ocean Connect
        if (landTypeOf(hexId) == 0) { 
            let neighborIds = neighborsOf(hexId);
            for (let i = 0; i < neighborIds.length; i++){
                if ( neighborIds[i] > hexId ) {
                    elevations[neighborIds[i]] = ( 0.45 * elevations[neighborIds[i]] ) + ( 0.45 * elevations[hexId] );
                }
            }            
        }
    }
}

/**
 * Updates the scaled directions array.
 */
function updateScaledDirections(){
    for(let i = 0; i < DIRECTIONS.length; i++){ 
        scaledDirections[i] = p5.Vector.mult(DIRECTIONS[i], scaleFactor);
    }
}

function updateHexagonCenters() {
    let currentHexCenter = createVector(offsetX, offsetY);
    let hexId = 0;
    for (let currentLayer = 0; currentLayer <= GRID_LAYERS; currentLayer++) {
        hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y); 
           
        // Move UP_RIGHT until top left corner
        for(let i = 0; i < currentLayer - 1; i++) {  
            currentHexCenter.add(scaledDirections[5]);
            hexId++;   
            hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y);
        }

        // Move other direction
        for(let i = 0; i < scaledDirections.length - 1; i++) {     
            for(let j = 0; j < currentLayer; j++){
                currentHexCenter.add(scaledDirections[i]);
                hexId++;
                hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y);      
            }
        }

        // Move to next layer
        if (currentLayer < GRID_LAYERS) {
            currentHexCenter.add(scaledDirections[4]);
            hexId++;  
        }   
    }
}

function drawMovingControls() {
    if( millis() - lastTurnTimerReset > (TURN_TIME*1000) ){
        endTurn();
    }
    drawTimerButton();    
}

function drawHexGrid(layers) {
    let hexGrid = createGraphics(windowWidth, windowHeight);
    // Set HexGrid center to current view center
    let currentHexCenter = createVector(offsetX, offsetY);
    let minX = offsetX;
    let maxX = windowWidth - offsetX;
    let minY = offsetY;
    let maxY = windowHeight - offsetY;
    //let landTypes = new Uint8Array((layers+1)*3*(layers) + 1);

    let hexId = 0;
    hexGrid.textSize(scaleFactor);
    for (let currentLayer = 0; currentLayer <= layers; currentLayer++) {
        //landTypes[hexId] = getLandType( hexId, landTypes );
        //if (currentHexCenter.y > maxY || currentHexCenter.y < minX) continue;
        drawHexagonBorder(hexId, currentHexCenter.x, currentHexCenter.y, scaleFactor, hexGrid); 
        //hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y); 
        
        if (SHOW_HEX_IDS) {
            hexGrid.fill(color(255, 255, 255));
            hexGrid.textAlign(CENTER, CENTER);
            hexGrid.text(hexId, currentHexCenter.x, currentHexCenter.y);  
        }

        if (SHOW_ELEVATION_VALUES) {
            hexGrid.fill(color(255, 255, 255));
            hexGrid.textAlign(CENTER, CENTER);
            hexGrid.text(elevations[hexId], currentHexCenter.x, currentHexCenter.y);  
        }

          
        // Move UP_RIGHT until top left corner
        for(let i = 0; i < currentLayer - 1; i++) {  
            currentHexCenter.add(scaledDirections[5]);
            hexId++; 
            //if (currentHexCenter.x > maxX || currentHexCenter.y > maxY) continue;      
            //landTypes[hexId] = getLandType( hexId, landTypes );
            drawHexagonBorder(hexId, currentHexCenter.x, currentHexCenter.y, scaleFactor, hexGrid);    
            //hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y);
            
            if (SHOW_HEX_IDS) {
                hexGrid.fill(color(255, 255, 255));
                hexGrid.textAlign(CENTER, CENTER);
                hexGrid.text(hexId, currentHexCenter.x, currentHexCenter.y);   
            }    

            if (SHOW_ELEVATION_VALUES) {
                hexGrid.fill(color(255, 255, 255));
                hexGrid.textAlign(CENTER, CENTER);
                hexGrid.text(elevations[hexId], currentHexCenter.x, currentHexCenter.y);  
            }
        }

        // Move other direction
        for(let i = 0; i < scaledDirections.length - 1; i++) {     
            for(let j = 0; j < currentLayer; j++){
                currentHexCenter.add(scaledDirections[i]);
                hexId++;
                //if (currentHexCenter.x > maxX || currentHexCenter.y > maxY || currentHexCenter.y < minX || currentHexCenter.y < minY) continue;
                //landTypes[hexId] = getLandType( hexId, landTypes );
                drawHexagonBorder(hexId, currentHexCenter.x, currentHexCenter.y, scaleFactor, hexGrid); 
                //hexCenters[hexId] = createVector(currentHexCenter.x, currentHexCenter.y);
                if (SHOW_HEX_IDS) {
                    hexGrid.fill(color(255, 255, 255));
                    hexGrid.textAlign(CENTER, CENTER);
                    hexGrid.text(hexId, currentHexCenter.x, currentHexCenter.y);     
                }

                if (SHOW_ELEVATION_VALUES) {
                    hexGrid.fill(color(255, 255, 255));
                    hexGrid.textAlign(CENTER, CENTER);
                    hexGrid.text(elevations[hexId], currentHexCenter.x, currentHexCenter.y);  
                }
                  
            }
        }

        // Move to next layer
        if (currentLayer < layers) {
            currentHexCenter.add(scaledDirections[4]);
            hexId++;  
        }   
    }

    // Add hexGrid buffer to main canvas
    image(hexGrid, 0, 0);
}

/**
 * @returns {int} the hexId of the hexagon under mouse cursor
 */
function hoverHex(){
    hexGridMouseCoord();
}

/**
 * @returns {vector} of the mouse coordinates relative to the hex Grid
 */
function hexGridMouseCoord(){
    return createVector((mouseX - offsetX) / scaleFactor, (mouseY - offsetY) / scaleFactor);
}

/**
 * @return {vector} The position on the hexGrid of the @param {int} hexId.
 * Coordiantes are independent of screen view (before offset and scaleFactor is applied)
 * Untested
 */
function hexPosition(hexId) {
    if ( hexId == 0 ){
        return createVector( 0, 0 );
    }
    let row = Math.floor( ( positionInLayer(hexId) / hexagonsInLayer(hexId) ) * 6 ); 
    let cornerPosition = p5.Vector.mult(CORNER_DIRECTIONS[row], layerOf(hexId));
    let positionInRow = Math.floor( ( ( positionInLayer(hexId) / hexagonsInLayer(hexId) ) - ( row / 6 ) ) * 6 * ( layerOf(hexId) + 1 ) ) + 1;
    return p5.Vector.add( cornerPosition, p5.Vector.mult( OFFSET_DIRECTIONS[row], positionInRow ) );
}

/**
 * @return {int} the hexId of the hexagon at coordinates @param {vector} position.
 */
function hexIdAtCoord(position) {
    shortestDistance = Infinity;
    closestHexId = 0;
    for (let i = 0; i < hexCenters.length; i++) {
        let distanceToHex = hexCenters[i].dist(createVector(position.x, position.y));
        if (distanceToHex < shortestDistance) {
            shortestDistance = distanceToHex;
            closestHexId = i;
        }
    }
    return closestHexId;
} 

/**
 * @return {int} the hexId of the first hexagon that starts the layer/ring that
 * @param {int} hexId is located in.
 * return value will always be <= hexId, 
 * up left from the last hexagon in the previous layer/ring,
 * and up right from the last hexagon in the same layer/ring
 */
function layerStartHexId(hexId){
    return 3 * ( layerOf(hexId) ) * ( layerOf(hexId) - 1) + 1;
}

/**
 * @return {int} the hexId of the first hexagon in the next layer/ring out from
 * @param {int} hexId. Return value will always be > hexId
 */
function nextLayerStartHexId(hexId){
    return 3 * ( layerOf( hexId ) + 1 ) * layerOf( hexId ) + 1;
}

/**
 * @return {int} the hexId of the first hexagon in the previous layer/ring in from
 * @param {int} hexId. Return value will always be < hexId
 */
function previousLayerStartHexId(hexId){
    return 3 * ( layerOf( hexId ) - 1 ) * ( layerOf( hexId ) - 2 ) + 1;
}

/**
 * @return {int} the position in the current layer/ring of 
 * @param {int} hexId.
 * Starts with position 0 as start position.
 */
function positionInLayer(hexId){
    return hexId - layerStartHexId(hexId);
}

/**
 * @return {int} the hexId of the corner hexagon in the given
 * @param {int} layer and
 * @param {int} corner
 * corners: 0 (Top Left), 1 (Top Right), 2 (Right), 3 (Bottom Right), 4 (Bottom Left), 5 (Left)
 */
function cornerHex(layer, corner){
    return ((3*layer)-(2-corner))*layer;
}

/**
 * @return {bool} wether or not the given @param {int} hexId is a corner
 */
function isCornerHex(hexId){
    return ( hexId == layerOf(hexId)*round(hexId/layerOf(hexId)) );
}
 
/**
 * @return {int} the amount of hexagons in the same layer/ring as 
 * @param {int} hexId.
 */
function hexagonsInLayer(hexId){
    return layerOf(hexId) * 6;
}
    
/**
 * @return {int} The layer number (distance from center) of
 * @param {int} hexId
 * Starts with center hexagon layer of 0
 */
function layerOf(hexId) {
    return Math.round(Math.sqrt(hexId/3));
}

/**
 * @return {int} The section/direction/side that
 * @param {int} hexId is found in.
 * Each section corresponds to a direction/side of each layer/ring
 * 0 (Top Left), 1 (Top), 2 (Top Right), 3 (Bottom Right), 4 (Bottom), 5 (Bottom Left)
 * Section 0 includes both left and top left corners. Section 5 includes no corners.   
 * All other sections only include their last corner.
 */
function sectionOf(hexId){
    if ( hexId == 0 ) return 0;
    return Math.floor(positionInLayer( hexId  ) / ( layerOf( hexId ) * 6 ) * 6);
}

/**
 * @return {int} The hexId of the neighboring hexagon above and to the left of
 * @param {int} hexId
 */
function upLeftNeighbor(hexId) {
    const section = sectionOf(hexId);
    const layer = layerOf(hexId);
    const sqrt6 =  Math.round(Math.sqrt(hexId / 3)) * 6;
  
    switch (section) {
        case 0:
        case 1:
            return hexId + sqrt6 + 1;
        case 2:
            return hexId - 1;
        case 3:
            return 2 - (sqrt6 - hexId);
        case 4:
            if (hexId !== cornerHex(layer, 4)) {
                return hexId - sqrt6 + 2;
            }
        default:
            return hexId + 1;
    }
  }


/**
 * @return {int} The hexId of the neighboring hexagon above and to the right of
 * @param {int} hexId
 */
function upRightNeighbor(hexId) {
    const layer = layerOf(hexId);
    const section = sectionOf(hexId);
    const sqrt6 = Math.round(Math.sqrt(hexId / 3)) * 6;

    switch (section) {
        case 0:
            return hexId !== cornerHex(layer, 0) ? hexId + 1 : hexId + sqrt6 + 2;
        case 3:
            return hexId - 1;
        case 4:
        case 5:
            return hexId - sqrt6 + 1;
        default:
            return hexId + sqrt6 + 2;
    }
}

/**
 * @return {int} The hexId of the neighboring hexagon to the right of
 * @param {int} hexId
 */
function rightNeighbor(hexId) {
    const section = sectionOf(hexId);
    const layer = layerOf(hexId);
    const sqrt6 = Math.round(Math.sqrt(hexId/3)) * 6;

    switch (section) {
        case 0:
            return hexId == cornerHex(layer, 0) ? hexId + 1 : hexId - sqrt6 + 6;
        case 1:
            return hexId == cornerHex(layer, 1) ? hexId + sqrt6 + 3 : hexId + 1;
        case 2:
        case 3:
            return hexId + sqrt6 + 3;
        case 4:
            return hexId - 1;
        case 5:
            return hexId - sqrt6;
    }

}

/**
 * @return {int} The hexId of the neighboring hexagon below and to the right of
 * @param {int} hexId
 */
function downRightNeighbor(hexId) {
    const section = sectionOf(hexId);
    const layer = layerOf(hexId);
    const sqrt6 = Math.round(Math.sqrt(hexId/3)) * 6;
    switch (section) {
        case 0:
            if (positionInLayer(hexId) == 0){
                return hexId - 1;
            }
        case 1:
            return hexId === cornerHex(layer, 1) ? hexId + 1 : hexId - sqrt6 + 5;
        case 2:
            return hexId === cornerHex(layer, 2) ? hexId + sqrt6 + 4 : hexId + 1;
        case 3:
        case 4:
            return hexId + sqrt6 + 4;
        default:
            return hexId - 1;
    }
}

/**
 * @return {int} The hexId of the neighboring hexagon below and to the left of
 * @param {int} hexId
 */
function downLeftNeighbor(hexId) {
    const layer = layerOf(hexId);
    const section = sectionOf(hexId);
    const sqrt6 = Math.round(Math.sqrt(hexId / 3)) * 6;

    switch (section) {
        case 0:
            if(positionInLayer(hexId) == 0){
                return hexId + sqrt6 - 1;
            }  
            return hexId - 1;          
        case 1:
        case 2:
            return hexId === cornerHex(layer, 2) ? hexId + 1 : hexId - sqrt6 + 4;
        case 3:
            return hexId === cornerHex(layer, 3) ? hexId + sqrt6 + 5 : hexId + 1;
        case 4: 
        default:
            return hexId + sqrt6 + 5; 
    }
}

/**
 * @return {int} The hexId of the neighboring hexagon to the left of
 * @param {int} hexId
 */
function leftNeighbor(hexId) {
    const layer = layerOf(hexId);
    const section = sectionOf(hexId);
    const sqrt6 = Math.round(Math.sqrt(hexId / 3)) * 6;

    switch (section) {
        case 0:
            return hexId + sqrt6;
        case 1:
            return hexId - 1;
        case 2:
        case 3:
            return hexId === cornerHex(layer, 3) ? hexId + 1 : hexId - sqrt6 + 3;
        case 4:
            return hexId === cornerHex(layer, 4) ? hexId + sqrt6 + 6 : hexId + 1;
        case 5:
            return hexId + sqrt6 + 6;
        default:
            return hexId;
    }
}

// Returns an array containing the tile IDs of all neighboring tiles
// Inconsistent
function neighborsOf( hexId ){
    if (hexId == 0) return [1,2,3,4,5,6];
    let neighbors = [];
    let upLeftNeighborId = upLeftNeighbor(hexId);
    let upRightNeighborId = upRightNeighbor(hexId);
    let rightNeighborId = rightNeighbor(hexId);
    let downRightNeighborId = downRightNeighbor(hexId);
    let downLeftNeighborId = downLeftNeighbor(hexId);
    let leftNeighborId = leftNeighbor(hexId);
    if (upLeftNeighborId <= MAX_HEX_ID){
        neighbors.push(upLeftNeighborId);
    }
    if (upRightNeighborId <= MAX_HEX_ID){
        neighbors.push(upRightNeighborId);
    }
    if (rightNeighborId <= MAX_HEX_ID){
        neighbors.push(rightNeighborId);
    }
    if (downRightNeighborId <= MAX_HEX_ID){
        neighbors.push(downRightNeighborId);
    }
    if (downLeftNeighborId <= MAX_HEX_ID){
        neighbors.push(downLeftNeighborId);
    }
    if (leftNeighborId <= MAX_HEX_ID){
        neighbors.push(leftNeighborId);
    }
    return neighbors;
}

/**
 * @return {int} The hexId of a random neighboring hexagon of
 * @param {int} hexId
 */
function randomNeighbor(hexId) {
    let neighbors = neighborHexIds(hexId);
    return neighbors[Math.floor(Math.random() * neighbors.length)];
}

function layerOfCoords(x,y) {
    return Math.floor(( dist(0, 0, x, y) ) / SQRT3 );
}

function getLandType(hexId) {
    if (tileId == 0) return 200;
    let outerLayer = layerOf(landTypes.length + 1);
    let currentLayer = layerOf(hexId);
    let currentValue = landTypes[hexId - 1] + ( Math.random() * LAND_TYPE_letIATION ) - ( Math.random() * LAND_TYPE_letIATION );
    currentValue = ( 0.75 * currentValue ) + ( 0.25 * 255 * ( 1 - (currentLayer/outerLayer) ) ); // Tend towards 0 at edges.
    return Math.min(Math.max(currentValue, 0), 255);
}

function generateLandTypes() {
    let currentValue = 255 * Math.random();
    let outerLayer = getLayerFromHexId(GRID_LAYERS);
    let currentLayer = 0;
    for (let i = 0; i < GRID_LAYERS; i++){
        currentLayer = getLayerFromHexId(i);
        console.log(i + "  " + currentLayer);
        currentValue = currentValue + ( Math.random() * letiation ) - ( Math.random() * letiation );
        currentValue = ( 0.75 * currentValue ) + ( 0.25 * 255 * ( 1 - (currentLayer/outerLayer) ) ); // Tend towards 0 at edges.
        currentValue = Math.min(Math.max(currentValue, 0), 255);
        landTypes[i] = currentValue;
        console.log(currentValue);       
    }
}
