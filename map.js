import {HexGrid} from './hex_grid.js';
import {MapOverlay} from './map_overlay.js';
import {Player} from './player.js';
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

    constructor( layers, seaLevel, oceanColor, scene ) {
        super(layers, 100);
        this.seaLevel = seaLevel;
        this.oceanColor = oceanColor;
        this.scene = scene;

        this.showGrid = false;

        this.elevations = new Uint8Array(this.maxHexID + 1);
        this.landCover = new Uint8Array(this.maxHexID + 1);

        // Tile level data
        this.owner = new Uint8Array(this.maxHexID + 1); 
        this.influence = new Uint8Array(this.maxHexID + 1); 
        this.civs = new Uint16Array(this.maxHexID + 1);
        this.soldiers = new Uint16Array(this.maxHexID + 1);
        this.buildings = new Uint8Array(this.maxHexID + 1);
        this.influenceRGB = new Uint8Array((this.maxHexID + 1) * 4); 

        // Data shown to user per tile. Varies based on selected map overlay.
        this.tileDisplay = new Uint16Array(this.maxHexID + 1); 

        this.mapOverlays = {
            influence: new MapOverlay( this, "influence", 100, 0.6 )
        }

        this.generateElevations();
        this.createSelectGraphic();
        this.generateTileNames();
        this.updateTileDisplay('civs');
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
     * Generate a random tileID.
     * @return {number} A random hexadecimal ID.
     */
    randtileID() {
        return this.randInt(0, this.maxHexID);
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

    getTileOwnerAndStatus(tileID) {
        return this.splitUint8(this.tileOwners[tileID], 6);
    }

    getTileColor( tileID, type ) {
        return Player.players[this.owner[tileID]].color
    }

    getOwnerColor( tileID ) {
        let player = Player.players[this.owner[tileID]];
        if (player) {
            return player.color
        }
        return {r: 0, g: 0, b: 0, a: 0};
    }

    updateInfluenceMap() {
        this.influenceRGB.fill(0);
        for (let tileID = 0; tileID <= this.maxHexID; tileID++){
            if (this.owner[tileID]) {
                let baseColor = Player.players[this.owner[tileID]].color;
                this.influenceRGB[tileID * 4] = baseColor.red;
                this.influenceRGB[tileID * 4 + 1] = baseColor.green;
                this.influenceRGB[tileID * 4 + 2] = baseColor.blue;
                this.influenceRGB[tileID * 4 + 3] = this.influence[tileID];
            }
        }
    }

    createSelectGraphic() {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        const color = 0xc1d1ff;
        this.selectedtileID = -1;
        this.selectGraphic = this.scene.add.graphics();   
        this.selectGraphic.fillStyle(color, 0.1);
        this.selectGraphic.fillPoints(hexagon.points, true);  
        this.selectGraphic.lineStyle(3, color, 0.7);    
        this.selectGraphic.strokePoints(hexagon.points, true);
        this.selectGraphic.visible = false;
    }

    generateTileNames() {
        let length = this.maxHexID + 1;
        this.tileNames = new Array(length);
        for (let tileID = 0; tileID < length; tileID++){
            if ( this.elevations[tileID] <= this.seaLevel ) {
                this.tileNames[tileID] = "Ocean";
            } else if (this.elevations[tileID] < 100) {
                this.tileNames[tileID] = "Plain";
            } else if (this.elevations[tileID] < 150) {
                this.tileNames[tileID] = "Hill";
            } else {
                this.tileNames[tileID] = "Mountain";
            }
        }       
    }

    generateTileName(tileID) {
        this.tileNames[tileID] = PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];   
    }

    /**
     * Smooth land by setting elevation of randomly selected hexagon to the average elevation of its neighbors
     */
    smoothElevations(iterations) {
        for (let i = 0; i <= iterations; i++) {
            let tileID = this.randInt(0, this.maxHexID);
            let total = this.elevations[tileID];
            let count = 1;
            let neighborIds = this.neighborsOf(tileID);
            for (let j = 0; j < neighborIds.length; j++){
                total += this.elevations[neighborIds[j]];
                count++;
            }
            this.elevations[tileID] = Math.round(total/count);
        }        
    }

    createMapOverlays() {
        this.mapOverlays = [];
        this.mapOverlays.push(new MapOverlay( scene, name, lowColor, highColor, opacity, data ));
        // Create graphics objects
        this.influenceMap = this.scene.add.graphics(); 
        this.foodMap = this.scene.add.graphics(); 
        this.civsMap = this.scene.add.graphics(); 
        this.soldiersMap = this.scene.add.graphics();
        
        // Map Overlay Colors
        this.influenceRGB = new Uint8Array((this.maxHexID + 1) * 4); 


        drawHexagonFill(this.influenceMap, x, y, color = 0xc1d1d9, alpha = 1);
    }

    generateElevations() {
        this.elevationGraphics = this.scene.add.graphics(); 

        // First pass: assign every hexagon by incrementing ID (spiral outward) varying land type slightly
        // Tend towards 0 (ocean) at edges and 255 (fresh water, mountains) at center
        let currentValue = this.randInt(200,255);
        this.elevations[0] = this.elevations[1] = currentValue;
        for (let tileID = 2; tileID <= this.maxHexID; tileID++) {
            let currentLayer = this.layerOf(tileID);  
            let neighborIds = this.neighborsOf(tileID);
            currentValue = (currentValue + this.elevations[Math.min(...neighborIds)] + this.elevations[Math.min(...neighborIds) + 1]) / 3 + this.randInt(-47,40);
            currentValue = Math.round((0.99 * currentValue) + (0.01 * 255 * (1 - (currentLayer / (this.layers))))); // Tend towards 0 at edges.
            // for (let neighborId = 0; neighborId < neighborIds.length; neighborId++){
            //     // if ( neighborId < tileID ) {
            //     //     this.elevations[neighborId] = ( 0.01 * this.elevations[neighborId] ) + ( 0.99 * currentValue );
            //     //     currentValue = ( 0.1 * this.elevations[neighborId] ) + ( 0.9 * currentValue );
            //     // }
            // }
            
            // Force between 0 and 255
            currentValue = Math.min(Math.max(Math.round(currentValue), 0), 255);
            this.elevations[tileID] = currentValue;
    
            // Make outer edges lowest elevation.
            if (this.layerOf(tileID) >= Math.round(this.layers * 0.9)) {
                this.elevations[tileID] = Math.min(currentValue, this.seaLevel / 2);
            }
        }
    
        // // Plains Clusters
        // for (let i = 0; i < this.maxHexID/900; i++) {
        //     let tileID = this.randInt(0,this.maxHexID/2);

        // }
    
        this.smoothElevations(this.maxHexID);
    
        for (let tileID = 1; tileID <= this.maxHexID; tileID++) {
            let neighborIds = this.neighborsOf(tileID);
            
            // Eliminate solo ocean tiles
            if (this.elevations[tileID] <= this.seaLevel) { 
                let lowestNeighborElevation = 255;
                
                for (let j = 0; j < neighborIds.length; j++){
                    if (this.elevations[neighborIds[j]] < lowestNeighborElevation){
                        lowestNeighborElevation = this.elevations[neighborIds[j]];
                    }
                }
                if (lowestNeighborElevation > this.seaLevel){
                    this.elevations[tileID] = lowestNeighborElevation;
                }
            }

            // Make inner ocean tiles connect to outside ocean
            if (this.elevations[tileID] <= this.seaLevel) { 
                for (let i = 0; i < neighborIds.length; i++){
                    if ( neighborIds[i] > tileID ) {
                        this.elevations[neighborIds[i]] = ( 0.45 * this.elevations[neighborIds[i]] ) + ( 0.45 * this.elevations[tileID] );
                    }
                }            
            }
        }

        this.smoothElevations(this.maxHexID*10);
    }

    /**
     * Sets the selectedtileID to the hexagon that contains the given coordiantes
     *
     * @param {number} x - The x-coordinate of the position.
     * @param {number} y - The y-coordinate of the position.
     * @param {boolean} toggle - Whether to toggle off the selection if already selected
     * @return {undefined} - The tileID selected.
     */
    selectAt(x, y, toggle = false) {
        this.selectGraphic.visible = true;
        let tileID = this.hexIDAtPosition({x: x, y: y});
        let neighbors = this.neighborsOf(tileID);
        // console.log(tileID, neighbors);
        if ( neighbors.includes(tileID) ) {
            console.log("neighbor");
        }
        if ( toggle && tileID == this.selectedtileID ) {
            this.deselect();
            return -1;
        }
        this.selectedtileID = tileID;
        this.selectGraphic.setPosition(this.hexCenters[tileID].x, this.hexCenters[tileID].y);
        updateTileDlg( this, Player.players[this.owner[tileID]], tileID )
        fadeIn(tileDlg);
        console.log(tileID);
        return tileID;
    }

    deselect() {
        this.selectGraphic.visible = false;
        this.selectedtileID = -1;   
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
     * @tileID the tileID of the hexagon to draw
     * @elevation the elevation of the hexagon to draw
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     */
    drawLandHexagon(tileID, elevation, x, y) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);

        // Set color: background for ocean, gradient based on elevation for land
        let color;
        if (elevation <= this.seaLevel) { // Ocean
            //color = Phaser.Display.Color.HexStringToColor(this.oceanColor).color;
            let oceanAlphaHex = 0.9 - (this.layerOf(tileID) / this.layerOf(this.maxHexID) * 1.3 ) // Based on layers
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

    updateTileDisplay(updateData = 'elevation') {
        switch(updateData) {
            case 'civs':
                this.tileDisplay = new Uint16Array(this.civs.buffer);
                break;
            case 'soldiers':
            // code block
                break;
            case 'units':
                // code block
                break;
            case 'elevation':
                for (let tileID = 0; tileID <= this.maxHexID; tileID++) {
                    if ( this.elevations[tileID] > this.seaLevel) {
                        this.tileDisplay[tileID] = this.elevations[tileID];
                    } else {
                        this.tileDisplay[tileID] = 0;
                    }
                }
                break;
            default:
                // code block
        }
        this.draw();
    }

    draw() {
        for (let tileID = 0; tileID <= this.maxHexID; tileID++) {
            this.drawLandHexagon(tileID, this.elevations[tileID] ,this.hexCenters[tileID].x, this.hexCenters[tileID].y);   
            if (this.showGrid) this.drawHexagonBorder(this.elevationGraphics, this.hexCenters[tileID].x, this.hexCenters[tileID].y);
            if ( this.tileDisplay[tileID] ) {
                let text = this.tileDisplay[tileID].toString();
                let textGraphic = this.scene.add.text(this.hexCenters[tileID].x - (text.length * 10), this.hexCenters[tileID].y - 20, text, { font: '35px monospace', fill: '#b1e1f6' });
                console.log(textGraphic);
                // textGraphic.setDepth(100);
            }
        }
    }
}