// Empire Names
const PRE = ["Ger", "Brit", "Am", "Cal", "Den", "Est", "Fin", "Gin", "Hin", "Ig", "Jar", "Kan", "Lon", "Mer", "Nan", "Orph", "Pol", "Qar", "Rash", "Saf", "", "Zor"];
const MID = ["", "ham",  "an", "for", "ork", "ish", "ead", "ma", "bor", "ter"];
const SUFF = ["", "a", "y", "id", "or", "il", "ex"];

/**
 * Player Levels
 * Clan: < 500 Population
 * Tribe: > 500 Population
 * Kingdom: > 10000 Population
 * Empire: > 2 Kingdoms
 */

/**
 * Stores all the data relevant to a player
 */
export class Player {
    static playerNames = new Set();
    static startTiles = new Set();

    constructor( playerID, name, color, startTile, civs, map ) {
        this.playerID = playerID;
        this.name = name;
        this.playerLevel = "Clan";
        this.color = color; 
        this.map = map;  
        this.startTile = startTile;
        this.startPosition = map.hexCenters[startTile];
        map.generateTileName(startTile);

        this.civs = new Uint16Array(map.maxHexID + 1);
        this.soldiers = new Uint16Array(map.maxHexID + 1);
        this.buildings = new Uint8Array(map.maxHexID + 1);

        this.civs[this.startTile] = civs;
        map.civs[this.startTile] = civs;
        map.owner[this.startTile] = playerID;
        this.influence = new Uint8Array(map.maxHexID + 1); 
        
        this.setInfluence( this.startTile, this.calculateTileInfluence( civs, 0) );

        // Resources
        this.food = 0;
        this.gems = 0;
        this.metal = 0;
        this.stone = 0; 
        this.wood = 0;

        // Player Metrics
        this.morale = 0;
        this.health = 0;

        // Set/generate Player Name     
        if (!name) name = this.generatePlayerName();
        this.name = name;
        Player.playerNames.add(name);

        map.mapOverlays['influence'].addLayer(playerID, color, this.influence);

        this.occupiedTiles = new Set();
        this.developedTiles = new Set();
    }

    calculateTileInfluence( units, buildings ){
        let influence = 30 * buildings + units + 200;
        // if (owned) influence += 100;
        if ( influence > 255 ) influence = 255;
        return influence
    }

    setInfluence( middleTileID, middleValue ){
        this.influence[middleTileID] = middleValue;
        let neighbors = this.map.neighborsOf( middleTileID );

        neighbors.forEach((tileID) => {
            this.influence[tileID] = middleValue / 2;
        });
    }
    
    generatePlayerName() {
        return PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];
    }
}