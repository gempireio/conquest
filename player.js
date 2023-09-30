/**
 * Stores all the data relevant to a player
 */
export class Player {
    static players = new Set();
    static startTiles = new Set();

    constructor( playerID, name, color, startTile, STARTING_UNITS, map ) {
        Player.players.add(name);
        this.playerID = playerID;
        this.name = name;
        this.color = color; 
        this.map = map;  
        this.startTile = startTile;
        this.startPosition = map.hexCenters[startTile];

        this.civs = new Uint16Array(map.maxHexID + 1);
        this.soldiers = new Uint16Array(map.maxHexID + 1);
        this.buildings = new Uint8Array(map.maxHexID + 1);

        this.civs[this.startTile] = STARTING_UNITS;
        map.civs[this.startTile] = STARTING_UNITS;
        
        // Resources
        this.food = 0;
        this.gems = 0;
        this.metal = 0;
        this.stone = 0; 
        this.wood = 0;

        // Player Metrics
        this.morale = 0;
        this.health = 0;

        this.occupiedTiles = new Set();
        this.developedTiles = new Set();
    }
}