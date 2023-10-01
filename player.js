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

    constructor( playerID, name, color, startTile, STARTING_UNITS, map ) {
        this.playerID = playerID;
        this.name = name;
        this.color = color; 
        this.map = map;  
        this.startTile = startTile;
        this.startPosition = map.hexCenters[startTile];
        map.generateTileName(startTile);

        this.civs = new Uint16Array(map.maxHexID + 1);
        this.soldiers = new Uint16Array(map.maxHexID + 1);
        this.buildings = new Uint8Array(map.maxHexID + 1);

        this.civs[this.startTile] = STARTING_UNITS;
        map.civs[this.startTile] = STARTING_UNITS;
        map.owner[this.startTile] = playerID;
        map.influence[this.startTile] = 100;
        
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

        this.occupiedTiles = new Set();
        this.developedTiles = new Set();
    }

    generatePlayerName() {
        return PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];
    }
}