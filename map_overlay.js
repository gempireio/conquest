/**
 * Represents a map overlay graphic
 */
export class MapOverlay {
    
    /**
     * Constructs a new instance of MapOverlay.
     * @param {object} map - The game map object.
     * @param {string} name - The name of the map overlay.
     */ 
    constructor( map, name, depth, alpha = 0.1, active = true ) {
        this.map = map;
        this.name = name;
        this.colors = [];
        this.values = [];    
        this.alpha = alpha;
        this.active = active;   
        this.graphic = map.scene.add.graphics(); 
        this.graphic.setDepth(depth);
        this.graphic.setAlpha(alpha);
    }

    /**
     * Draws a filled hexagon (pointy side up) at given coordinates.
     * @param x the center x coordinate to draw to
     * @param y the center y coordinate to draw to
     * @param color the fill color
     * @param alpha the color alpha
    */
    drawHexagonFill(x, y, color, alpha) {
        const hexagon = new Phaser.Geom.Polygon(this.map.hexagonPoints);
        Phaser.Geom.Polygon.Translate(hexagon, x, y);
        this.graphic.fillStyle(color, alpha);
        this.graphic.fillPoints(hexagon.points, true);
    }

    setLayer(id, color, values) {
        this.colors[id] = color;
        this.values[id] = values;
    }

    setTileColor(tileID, value) {
        this.data[tileID] = value;
    }

    setAlpha(alpha) {
        this.alpha = alpha;
        this.graphic.setAlpha(alpha);
    }

    draw() {      
        if (!this.active) {
            this.graphic.visible = false;
            return;
        }
        this.graphic.clear();
        for (let i = 0; i < this.colors.length; i++) {
            if(this.values[i]) {
                for (let hexID = 0; hexID <= this.map.maxHexID; hexID++) {
                    if (this.values[i][hexID]) {
                        let color = this.colors[i];
                        let alpha = Math.sqrt( this.values[i][hexID] / 255 );
                        this.drawHexagonFill(this.map.hexCenters[hexID].x, this.map.hexCenters[hexID].y, color.color, alpha); 
                    }           
                }       
            }
        }
        this.graphic.visible = true;
    }

    show() {
        this.active = true;
        this.graphic.visible = true;
    }

    hide() {
        this.active = false;
        this.graphic.visible = false;
    }


}