import {HexGrid} from './hex_grid.js';
const tileDlg = document.getElementById("tile-dlg");

// District Names
const PRE = ["Alt", "Am", "Bor", "Cal", "Cam", "Den", "El", "Ex", "Fin", "Gat", "Hin", "Ig", "Jil", "Kit", "Lin", "Min", "Nor", "Or", "Ox", "Pit", "Rich", "Zer", "Zin", "Al"];
const MID = ["", "ham",  "an", "for", "ork", "ist", "ead", "ma", "bor", "ter"];
const SUFF = ["", "a", "y", "id", "or", "il", "ex"];

export class Map extends HexGrid {

    // Land Cover
    // wetland
    // grassland
    // savanna
    // forest
    // jungle
    // desert
    // fresh water
    // farmland
    // urban
    // rocky
    // ocean

    constructor( layers, seaLevel, oceanColor, scene, showDebugText ) {
        super(layers, 100);
        this.seaLevel = seaLevel;
        this.oceanColor = oceanColor;
        this.scene = scene;
        this.showDebugText = showDebugText;

        this.showGrid = false;

        this.elevations = new Uint8Array(this.maxhexID + 1);
        this.landCover = new Uint8Array(this.maxhexID + 1);

        // Each Bit represents whether a given building is built on a tile
        // 0: Farm
        // 1: Mine
        // 2: Barracks
        // 3: Lumbermill
        // 4: Factory
        // 5: Palace
        this.buildings = new Uint8Array(this.maxhexID + 1);

        // Heatmaps
        this.influenceMap = new Uint8Array((this.maxhexID + 1) * 4); 

        // Specifies which player controls a given tile and to what extent
        // playerID: first 6 bits, status: last 2 bits (occupied, influenced, owned, developed)
        // occupied: has units stationed there, but not owned or influenced
        // influenced: owned land extends influence there
        // owned: owns tile, but not developed
        // developed: owned and developed tile
        this.tileOwners = new Uint8Array(this.maxhexID + 1); 
        
        // Data shown to user per tile. Varies based on selected map overlay.
        this.tileDisplay = new Uint16Array(this.maxhexID + 1).fill(0); 

        if ( showDebugText ){
            this.debugTexts = [];
            for (let hexID = 0; hexID <= this.maxhexID; hexID++){
                this.debugTexts[hexID] = this.scene.add.text(this.hexCenters[hexID].x-46, this.hexCenters[hexID].y-34, "1", { font: '14px monospace', fill: '#b1e1f6' });
            }
        }
    
        this.generateElevations();
        this.createSelectGraphic();
        this.generateNames();
        this.updateTileDisplay();
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     * @return {number} the random integer generated
     */
    randInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate a random hexID.
     * @return {number} A random hexadecimal ID.
     */
    randhexID() {
        return this.randInt(0, this.maxhexID);
    }

    /**
     * Splits a uint8 value into two parts based on a given split bit.
     * @param {number} uint8 - The uint8 value to be split.
     * @param {number} split - The bit position at which to split the uint8 value.
     * @return {Array} An array containing the first and last parts of the split uint8 value.
     */
    splitUint8(uint8, split) {
        // Calculate the number of last bits
        let lastBits = 8 - split;
        // Shift right by lastBits to get the firstBits
        let first = uint8 >> lastBits;
        // Use bitwise AND with a mask to get the last bits
        let last = uint8 & ((1 << lastBits) - 1);
        return [first, last];
    }

    createSelectGraphic() {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        const color = 0xc1d1ff;
        this.selectedhexID = -1;
        this.selectGraphic = this.scene.add.graphics();   
        this.selectGraphic.fillStyle(color, 0.1);
        this.selectGraphic.fillPoints(hexagon.points, true);  
        this.selectGraphic.lineStyle(3, color, 0.7);    
        this.selectGraphic.strokePoints(hexagon.points, true);
        this.selectGraphic.visible = false;
    }

    generateNames() {
        let length = this.maxhexID + 1;
        this.tileNames = new Array(length);
        for (let hexID = 0; hexID < length; hexID++){
            if (this.elevations[hexID] > this.seaLevel) {
                this.tileNames[hexID] = PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];
            } else {
                this.tileNames[hexID] = "Ocean";
            }
        }       
    }

    /**
     * Smooth land by setting elevation of randomly selected hexagon to the average elevation of its neighbors
     */
    smoothElevations(iterations) {
        for (let i = 0; i <= iterations; i++) {
            let hexID = this.randInt(0, this.maxhexID);
            let total = this.elevations[hexID];
            let count = 1;
            let neighborIds = this.neighborsOf(hexID);
            for (let j = 0; j < neighborIds.length; j++){
                total += this.elevations[neighborIds[j]];
                count++;
            }
            this.elevations[hexID] = Math.round(total/count);
        }        
    }

    generateElevations() {
        this.elevationGraphics = this.scene.add.graphics(); 

        // First pass: assign every hexagon by incrementing ID (spiral outward) varying land type slightly
        // Tend towards 0 (ocean) at edges and 255 (fresh water, mountains) at center
        let currentValue = this.randInt(200,255);
        this.elevations[0] = this.elevations[1] = currentValue;
        for (let hexID = 2; hexID <= this.maxhexID; hexID++) {
            let currentLayer = this.layerOf(hexID);  
            let neighborIds = this.neighborsOf(hexID);
            currentValue = (currentValue + this.elevations[Math.min(...neighborIds)] + this.elevations[Math.min(...neighborIds) + 1]) / 3 + this.randInt(-47,40);
            currentValue = Math.round((0.99 * currentValue) + (0.01 * 255 * (1 - (currentLayer / (this.layers))))); // Tend towards 0 at edges.
            // for (let neighborId = 0; neighborId < neighborIds.length; neighborId++){
            //     // if ( neighborId < hexID ) {
            //     //     this.elevations[neighborId] = ( 0.01 * this.elevations[neighborId] ) + ( 0.99 * currentValue );
            //     //     currentValue = ( 0.1 * this.elevations[neighborId] ) + ( 0.9 * currentValue );
            //     // }
            // }
            
            // Force between 0 and 255
            currentValue = Math.min(Math.max(Math.round(currentValue), 0), 255);
            this.elevations[hexID] = currentValue;
    
            // Make outer edges lowest elevation.
            if (this.layerOf(hexID) >= Math.round(this.layers * 0.9)) {
                this.elevations[hexID] = Math.min(currentValue, this.seaLevel / 2);
            }
        }
    
        // // Plains Clusters
        // for (let i = 0; i < this.maxhexID/900; i++) {
        //     let hexID = this.randInt(0,this.maxhexID/2);

        // }
    
        this.smoothElevations(this.maxhexID);
    
        for (let hexID = 1; hexID <= this.maxhexID; hexID++) {
            let neighborIds = this.neighborsOf(hexID);
            
            // Eliminate solo ocean tiles
            if (this.elevations[hexID] <= this.seaLevel) { 
                let lowestNeighborElevation = 255;
                
                for (let j = 0; j < neighborIds.length; j++){
                    if (this.elevations[neighborIds[j]] < lowestNeighborElevation){
                        lowestNeighborElevation = this.elevations[neighborIds[j]];
                    }
                }
                if (lowestNeighborElevation > this.seaLevel){
                    this.elevations[hexID] = lowestNeighborElevation;
                }
            }

            // Make inner ocean tiles connect to outside ocean
            if (this.elevations[hexID] <= this.seaLevel) { 
                for (let i = 0; i < neighborIds.length; i++){
                    if ( neighborIds[i] > hexID ) {
                        this.elevations[neighborIds[i]] = ( 0.45 * this.elevations[neighborIds[i]] ) + ( 0.45 * this.elevations[hexID] );
                    }
                }            
            }
        }

        this.smoothElevations(this.maxhexID*10);
    }

    /**
     * Sets the selectedhexID to the hexagon that contains the given coordiantes
     *
     * @param {number} x - The x-coordinate of the position.
     * @param {number} y - The y-coordinate of the position.
     * @param {boolean} toggle - Whether to toggle off the selection if already selected
     * @return {undefined} - The hexID selected.
     */
    selectAt(x, y, toggle = false) {
        this.selectGraphic.visible = true;
        let hexID = this.hexIDAtPosition({x: x, y: y});
        if ( toggle && hexID == this.selectedhexID ) {
            this.deselect();
            return -1;
        }
        this.selectedhexID = hexID;
        this.selectGraphic.setPosition(this.hexCenters[hexID].x, this.hexCenters[hexID].y);
        setTileDlgLabels( this.tileNames[hexID], hexID, this.elevations[hexID], 1, 2 )
        fadeIn(tileDlg);
        return hexID;
    }

    deselect() {
        this.selectGraphic.visible = false;
        this.selectedhexID = -1;   
        fadeOut(tileDlg);
    }

    /**
     * Draws a hexagon border (pointy side up) at given coordinates.
     * @param graphic the graphics object to draw to
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     * @param color the color of the line stroke
     * @param strokeWidth the width of the line stroke
     * @param alpha the alpha of the line stroke
     */
    drawHexagonBorder(graphic, x, y, color = 0xc1d1d9, strokeWidth = 0.7, alpha = 1) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);
        graphic.lineStyle(strokeWidth, color, alpha);    
        graphic.strokePoints(hexagon.points, true);
    }

    /**
     * Draws a filled hexagon (pointy side up) at given coordinates.
     * @param graphic the graphics object to draw to
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     * @param color the fill color
     * @param alpha the color alpha
     */
    drawHexagonFill(graphic, x, y, color = 0xc1d1d9, alpha = 1) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);
        graphic.fillStyle(color, alpha);
        graphic.fillPoints(hexagon.points, true);
    }

    /**
     * Draws a filled land hexagon (pointy side up) at given coordinates.
     * @hexID the hexID of the hexagon to draw
     * @elevation the elevation of the hexagon to draw
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     */
    drawLandHexagon(hexID, elevation, x, y) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);

        // Set color: background for ocean, gradient based on elevation for land
        let color;
        if (elevation <= this.seaLevel) { // Ocean
            //color = Phaser.Display.Color.HexStringToColor(this.oceanColor).color;
            let oceanAlphaHex = 0.9 - (this.layerOf(hexID) / this.layerOf(this.maxhexID) * 1.3 ) // Based on layers
            let oceanAlphaCircle = 0.9 - (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / Math.sqrt(Math.pow(this.maxX, 2) + Math.pow(this.maxY, 2)) * 1.5); // Based on distance from center/edges x, y coordinates
            let oceanAlphaElevation = Math.pow(elevation/this.seaLevel, 3); // Based on Elevation
            let oceanAlpha = Math.max( 0, ( oceanAlphaHex * 0.1 ) + ( oceanAlphaCircle * 0.15 ) + ( oceanAlphaElevation * 0.75 ) );
            color = Phaser.Display.Color.GetColor32(0, 120, 120);
            this.elevationGraphics.fillStyle(color, oceanAlpha);
        } else { // Land
            color = Phaser.Display.Color.GetColor(Math.pow(1.018,elevation)+(elevation/3), 178-(elevation/1.45), Math.round(180*Math.pow(0.98,elevation)));
            this.elevationGraphics.fillStyle(color);
        }
        this.elevationGraphics.fillPoints(hexagon.points, true);
    }

    updateTileDisplay() {
        for (let hexID = 0; hexID <= this.maxhexID; hexID++) {
            if ( this.elevationGraphics[hexID] > this.seaLevel) {
                this.tileDisplay[hexID] = this.elevationGraphics[hexID];
            } else {
                this.tileDisplay[hexID] = 0;
            }
        }
        this.drawMap();
    }

    drawMap() {
        for (let hexID = 0; hexID <= this.maxhexID; hexID++) {
            this.drawLandHexagon(hexID, this.elevations[hexID] ,this.hexCenters[hexID].x, this.hexCenters[hexID].y);   
            if (this.showGrid) this.drawHexagonBorder(this.elevationGraphics, this.hexCenters[hexID].x, this.hexCenters[hexID].y);
            if (this.showDebugText) this.debugTexts[hexID].setText("ID:   " + hexID + "\nElev: " + this.elevations[hexID]);

            if ( this.tileDisplay[hexID] ) {
                this.scene.add.text(this.hexCenters[hexID].x-46, this.hexCenters[hexID].y-34, this.tileDisplay[hexID], { font: '14px monospace', fill: '#b1e1f6' });
            }
        }
    }
}