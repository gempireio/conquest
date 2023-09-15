import {HexGrid} from './hex_grid.js';

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

    constructor( layers, seaLevel, oceanColor, scene, graphics ) {
        super(layers, 100);
        this.seaLevel = seaLevel;
        this.oceanColor = oceanColor;
        this.scene = scene;
        this.graphics = graphics;

        this.showGrid = false;
        this.showHexIds = false;
        this.showElevationValues = false;

        this.elevations = new Uint8Array(this.maxHexId + 1);
        this.landCover = new Uint8Array(this.maxHexId + 1);
        this.generateElevations();
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     */
    randInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Smooth land by setting elevation of randomly selected hexagon to the average elevation of its neighbors
     */
    smoothElevations(iterations) {
        for (let i = 0; i <= iterations; i++) {
            let hexId = this.randInt(0, this.maxHexId);
            let total = this.elevations[hexId];
            let count = 1;
            let neighborIds = this.neighborsOf(hexId);
            for (let j = 0; j < neighborIds.length; j++){
                total += this.elevations[neighborIds[j]];
                count++;
            }
            this.elevations[hexId] = Math.round(total/count);
        }        
    }

    generateElevations() {
        // First pass: assign every hexagon by incrementing ID (spiral outward) varying land type slightly
        // Tend towards 0 (ocean) at edges and 255 (fresh water, mountains) at center
        let currentValue = this.randInt(200,255);
        this.elevations[0] = this.elevations[1] = currentValue;
        for (let hexId = 2; hexId <= this.maxHexId; hexId++) {
            let currentLayer = this.layerOf(hexId);  
            let neighborIds = this.neighborsOf(hexId);
            currentValue = (currentValue + this.elevations[Math.min(...neighborIds)] + this.elevations[Math.min(...neighborIds) + 1]) / 3 + this.randInt(-47,40);
            currentValue = Math.round((0.99 * currentValue) + (0.01 * 255 * (1 - (currentLayer / (this.layers))))); // Tend towards 0 at edges.
            // for (let neighborId = 0; neighborId < neighborIds.length; neighborId++){
            //     // if ( neighborId < hexId ) {
            //     //     this.elevations[neighborId] = ( 0.01 * this.elevations[neighborId] ) + ( 0.99 * currentValue );
            //     //     currentValue = ( 0.1 * this.elevations[neighborId] ) + ( 0.9 * currentValue );
            //     // }
            // }
            
            // Force between 0 and 255
            currentValue = Math.min(Math.max(Math.round(currentValue), 0), 255);
            this.elevations[hexId] = currentValue;
    
            // Make outer edges lowest elevation.
            if (this.layerOf(hexId) >= Math.round(this.layers * 0.9)) {
                this.elevations[hexId] = Math.min(currentValue, this.seaLevel - 1);
            }
        }
    
        // // Plains Clusters
        // for (let i = 0; i < this.maxHexId/900; i++) {
        //     let hexId = this.randInt(0,this.maxHexId/2);

        // }
    
        this.smoothElevations(this.maxHexId);
    
        for (let hexId = 1; hexId <= this.maxHexId; hexId++) {
            let neighborIds = this.neighborsOf(hexId);
            
            // Eliminate solo ocean tiles
            if (this.elevations[hexId] <= this.seaLevel) { 
                let lowestNeighborElevation = 255;
                
                for (let j = 0; j < neighborIds.length; j++){
                    if (this.elevations[neighborIds[j]] < lowestNeighborElevation){
                        lowestNeighborElevation = this.elevations[neighborIds[j]];
                    }
                }
                if (lowestNeighborElevation > this.seaLevel){
                    this.elevations[hexId] = lowestNeighborElevation;
                }
            }

            // Make inner ocean tiles connect to outside ocean
            if (this.elevations[hexId] <= this.seaLevel) { 
                for (let i = 0; i < neighborIds.length; i++){
                    if ( neighborIds[i] > hexId ) {
                        this.elevations[neighborIds[i]] = ( 0.45 * this.elevations[neighborIds[i]] ) + ( 0.45 * this.elevations[hexId] );
                    }
                }            
            }
        }
    }

    /**
     * Draws a hexagon border (pointy side up) at given x, y coordinates.
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     * @param s the scale factor (size) of the hexagon
     * @param buffer the image buffer canvas to draw to
     */
    drawHexagonBorder(x, y, color = 0xc1d1d9) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);
        this.graphics.lineStyle(0.7, color);    
        this.graphics.strokePoints(hexagon.points, true);
    }

    /**
     * Draws a filled hexagon (pointy side up) at given x, y coordinates.
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     * @param s the scale factor (size) of the hexagon
     * @param buffer the image buffer canvas to draw to
     */
    drawLandHexagon(hexId, elevation, x, y) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);

        // Set color: background for ocean, gradient based on elevation for land
        let color;
        if (elevation <= this.seaLevel) { // Ocean
            //color = Phaser.Display.Color.HexStringToColor(this.oceanColor).color;
            let oceanAlphaHex = 0.8 - (this.layerOf(hexId) / this.layerOf(this.maxHexId) ) // Based on layers
            let oceanAlphaCircle = 0.5 - (Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)) / Math.sqrt(Math.pow(this.maxX, 2) + Math.pow(this.maxY, 2))); // Based on distance from center/edges x, y coordinates
            let oceanAlphaElevation = 0.35 - elevation/this.seaLevel/2; // Based on Elevation
            let oceanAlpha = Math.max( 0, ( oceanAlphaHex + oceanAlphaCircle + oceanAlphaElevation ) / 3 );
            color = Phaser.Display.Color.GetColor32(0, 180, 220);
            this.graphics.fillStyle(color, oceanAlpha);
        } else { // Land
            color = Phaser.Display.Color.GetColor(elevation/3.5, 150-(elevation/2), 86-(elevation/3));
            this.graphics.fillStyle(color);
        }
        //color = Phaser.Display.Color.GetColor(elevation/4, 150-(elevation/2), 86-(elevation/3));
        this.graphics.fillPoints(hexagon.points, true);
    }

    drawMap() {
        for (let hexId = 0; hexId <= this.maxHexId; hexId++) {
            this.drawLandHexagon(hexId, this.elevations[hexId] ,this.hexCenters[hexId].x, this.hexCenters[hexId].y);   
            if (this.showGrid) this.drawHexagonBorder(this.hexCenters[hexId].x, this.hexCenters[hexId].y);
            if (this.showHexIds) this.debugText(hexId, this.hexCenters[hexId].x, this.hexCenters[hexId].y);
            if (this.showElevationValues) this.debugText(this.elevations[hexId], this.hexCenters[hexId].x, this.hexCenters[hexId].y);
        }
    }

    debugText(txt, x, y) {
        txt = txt.toString();
        x = x-(txt.length*8);
        y = y-16;
        let hexIdText = this.scene.add.text(x, y, txt, { font: '30px monospace', fill: '#b1e1f6' });
        //hexIdText.setResolution(25);
    }
}