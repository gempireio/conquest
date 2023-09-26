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

    constructor( layers, seaLevel, oceanColor, scene, showDebugText ) {
        super(layers, 100);
        this.seaLevel = seaLevel;
        this.oceanColor = oceanColor;
        this.scene = scene;
        this.showDebugText = showDebugText;

        this.showGrid = false;

        this.elevations = new Uint8Array(this.maxHexId + 1);
        this.landCover = new Uint8Array(this.maxHexId + 1);
        
        if ( showDebugText ){
            this.debugTexts = [];
            for (let hexId = 0; hexId <= this.maxHexId; hexId++){
                this.debugTexts[hexId] = this.scene.add.text(this.hexCenters[hexId].x-46, this.hexCenters[hexId].y-34, "1", { font: '14px monospace', fill: '#b1e1f6' });
            }
        }

        this.generateElevations();
        this.createSelectGraphic();
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     */
    randInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    createSelectGraphic() {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        const color = 0xc1d1ff;
        //Phaser.Geom.Polygon.Translate(hexagon, 0, 0);
        this.selectedHexId = -1;
        this.selectGraphic = this.scene.add.graphics();   
        this.selectGraphic.fillStyle(color, 0.1);
        this.selectGraphic.fillPoints(hexagon.points, true);  
        this.selectGraphic.lineStyle(3, color, 0.7);    
        this.selectGraphic.strokePoints(hexagon.points, true);
        this.selectGraphic.visible = false;
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
        this.elevationGraphics = this.scene.add.graphics(); 

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
                this.elevations[hexId] = Math.min(currentValue, this.seaLevel / 2);
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

        this.smoothElevations(this.maxHexId*10);
    }

    /**
     * Sets the selectedHexId to the hexagon that contains the given coordiantes
     *
     * @param {number} x - The x-coordinate of the position.
     * @param {number} y - The y-coordinate of the position.
     * @return {undefined} - The HexId selected.
     */
    selectAt(x, y) {
        this.selectGraphic.visible = true;
        let hexID = this.hexIdAtPosition({x: x, y: y});
        if ( hexID == this.selectedHexId ) {
            this.selectGraphic.visible = false;
            this.selectedHexId = -1;
            return -1;
        }
        this.selectedHexId = hexID;
        this.selectGraphic.setPosition(this.hexCenters[hexID].x, this.hexCenters[hexID].y);
        return hexID;
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
     * @hexId the hexID of the hexagon to draw
     * @elevation the elevation of the hexagon to draw
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     */
    drawLandHexagon(hexId, elevation, x, y) {
        const hexagon = new Phaser.Geom.Polygon(this.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);

        // Set color: background for ocean, gradient based on elevation for land
        let color;
        if (elevation <= this.seaLevel) { // Ocean
            //color = Phaser.Display.Color.HexStringToColor(this.oceanColor).color;
            let oceanAlphaHex = 0.9 - (this.layerOf(hexId) / this.layerOf(this.maxHexId) * 1.3 ) // Based on layers
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

    drawMap() {
        for (let hexId = 0; hexId <= this.maxHexId; hexId++) {
            this.drawLandHexagon(hexId, this.elevations[hexId] ,this.hexCenters[hexId].x, this.hexCenters[hexId].y);   
            if (this.showGrid) this.drawHexagonBorder(this.elevationGraphics, this.hexCenters[hexId].x, this.hexCenters[hexId].y);
            if (this.showDebugText) this.debugTexts[hexId].setText("ID:   " + hexId + "\nElev: " + this.elevations[hexId]);
        }
    }
}