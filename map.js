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

        this.mapOverlays = {
            allInfluence: new MapOverlay( this, "allInfluence", 10, 0.4 ),
            playerInfluence: new MapOverlay( this, "playerInfluence", 20, 0.7 )
        }

        this.generateElevations();
        this.createSelectGraphic();
        this.generateTileNames();
        this.createTextGraphic();
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

    getOwnerColor( tileID ) {
        let player = Player.getOwner(tileID);
        if (player) {
            return player.color;
        }
        return {r: 0, g: 0, b: 0, a: 0};
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

    createTextGraphic() {
        this.textGraphic = this.scene.add.graphics(); 
        this.textGraphic.setDepth(120);
        this.tileText = Array(this.maxHexID + 1);
    }

    updateTextGraphic() {
        let civs = Player.allCivs();
        let soldiers = Player.allSoldiers();
        for (let tileID = 0; tileID <= this.maxHexID; tileID++) {
            if (civs[tileID] + soldiers[tileID]) {
                let text = "C: " + civs[tileID] + "\nS: " + soldiers[tileID];
                if(this.tileText[tileID]) {
                    this.tileText[tileID].setText(text);
                } else {
                    this.tileText[tileID] = this.scene.add.text(this.hexCenters[tileID].x - 26, this.hexCenters[tileID].y - 22, text, { font: '18px monospace', fill: '#b1e1f6' });
                }        
            } else { 
                // Destroy text graphic object if no civs or soldiers
                if(this.tileText[tileID]) this.tileText[tileID].destroy();
            }
        } 
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

    generateElevations() {
        this.baseMapGraphic = this.scene.add.graphics(); 

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
     * @param {number} x - The x-coordinate of the position.
     * @param {number} y - The y-coordinate of the position.
     * @param {boolean} toggle - Whether to toggle off the selection if already selected
     * @return {int} - The tileID selected.
     */
    selectAt(x, y, toggle = false) {
        this.selectGraphic.visible = true;
        let tileID = this.hexIDAtPosition({x: x, y: y});        
        
        // Deselect if already selected
        if ( toggle && tileID == this.selectedtileID ) {
            this.deselect();
            return -1;
        }
         
        // If tile owned by human player
        let oldTilePlayer = Player.getOwner(this.selectedtileID);   
        if(oldTilePlayer === Player.humanPlayer) {
            let neighbors = this.neighborsOf(tileID);
            if ( neighbors.includes(this.selectedtileID) ) {       
                oldTilePlayer.moveAllUnits(this.selectedtileID, tileID);
            }
        }

        this.selectedtileID = tileID;
        this.selectGraphic.setPosition(this.hexCenters[tileID].x, this.hexCenters[tileID].y);
        updateTileDlg( this, Player.getOwner(tileID), tileID );
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
        if (elevation <= this.seaLevel) { // Ocean
            //color = Phaser.Display.Color.HexStringToColor(this.oceanColor).color;
            let oceanAlphaHex = 0.9 - (this.layerOf(tileID) / this.layerOf(this.maxHexID) * 1.3 ) // Based on layers
            let oceanAlphaCircle = 0.9 - (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / Math.sqrt(Math.pow(this.maxX, 2) + Math.pow(this.maxY, 2)) * 1.5); // Based on distance from center/edges x, y coordinates
            let oceanAlphaElevation = Math.pow(elevation/this.seaLevel, 3); // Based on Elevation
            let oceanAlpha = Math.max( 0, ( oceanAlphaHex * 0.1 ) + ( oceanAlphaCircle * 0.15 ) + ( oceanAlphaElevation * 0.75 ) );
            let color = Phaser.Display.Color.GetColor32(5, 90, 100);
            this.baseMapGraphic.fillStyle(color, oceanAlpha);
        } else { // Land
            let r = Math.max(0, elevation * ( 1.5 - (0.01 * elevation)));
            let g = Math.max(10, elevation * ( 1.9 - (0.007 * elevation) ) + 20);
            let b = 155 - ( elevation * (1.9 - ( 0.006 * elevation ) ) );
            
            // Sand and Dirt Color near coast
            if (elevation < this.seaLevel + 60) { 
                let weight = (elevation - this.seaLevel) / 60;
                r = (r * (weight)) + (150 * (1 - weight));
                g = (g * (weight)) + (140 * (1 - weight)); 
                b = (b * (weight)) + (90 * (1 - weight)  );
            } 

            // Brownish Gray Towards Peaks
            let weight = elevation / 255;
            r = (65 * weight) + (r * (1 - weight));
            g = (55 * weight) + (g * (1 - weight));
            b = (35 * weight) + (b * (1 - weight));

            let color = Phaser.Display.Color.GetColor(r, g, b);
            this.baseMapGraphic.fillStyle(color);
        }
        this.baseMapGraphic.fillPoints(hexagon.points, true);
    }

    /**
     * Backup For Old Elevation HeightMap
     * Draws a filled land hexagon (pointy side up) at given coordinates.
     * @tileID the tileID of the hexagon to draw
     * @elevation the elevation of the hexagon to draw
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     */
    drawElevationLandHexagon(tileID, elevation, x, y) {      
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);

        // Set color: background for ocean, gradient based on elevation for land
        let color;
        if (elevation <= this.seaLevel) { // Ocean
            let oceanAlphaHex = 0.9 - (this.layerOf(tileID) / this.layerOf(this.maxHexID) * 1.3 ) // Based on layers
            let oceanAlphaCircle = 0.9 - (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / Math.sqrt(Math.pow(this.maxX, 2) + Math.pow(this.maxY, 2)) * 1.5); // Based on distance from center/edges x, y coordinates
            let oceanAlphaElevation = Math.pow(elevation/this.seaLevel, 3); // Based on Elevation
            let oceanAlpha = Math.max( 0, ( oceanAlphaHex * 0.1 ) + ( oceanAlphaCircle * 0.15 ) + ( oceanAlphaElevation * 0.75 ) );
            color = Phaser.Display.Color.GetColor32(0, 120, 120);
            this.baseMapGraphic.fillStyle(color, oceanAlpha);
        } else { // Land
            let r = Math.pow(1.018,elevation)+(elevation/3);
            let g = 178 - (elevation/1.45);
            let b = Math.round(180*Math.pow(0.98,elevation));
            let color = Phaser.Display.Color.GetColor(r,g,b);
            // color.gray(255);
            this.baseMapGraphic.fillStyle(color);
        }
        this.baseMapGraphic.fillPoints(hexagon.points, true);
    }

    draw() {
        this.baseMapGraphic.clear();
        for (let tileID = 0; tileID <= this.maxHexID; tileID++) {
            this.drawLandHexagon(tileID, this.elevations[tileID] ,this.hexCenters[tileID].x, this.hexCenters[tileID].y);   
            if (this.showGrid) this.drawHexagonBorder(this.baseMapGraphic, this.hexCenters[tileID].x, this.hexCenters[tileID].y);
        }
        this.updateTextGraphic();
    }

    updateGraphics() {
        this.draw();
        let mapOverlays = Object.values(this.mapOverlays);
        mapOverlays.forEach((mapOverlay) => {
            mapOverlay.draw();
        });
        this.updateTextGraphic();
    }

    updateOverLays() {
        let mapOverlays = Object.values(this.mapOverlays);
        mapOverlays.forEach((mapOverlay) => {
            mapOverlay.draw();
        });
    }
}