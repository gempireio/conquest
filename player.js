/**
 * Stores all the data relevant to a player
 */
export class Player {
    static players = new Set();

    constructor( playerID, name, map ) {
        Player.players.add(name);
        this.playerID = playerID;
        this.name = name;
        this.map = map;  
        this.civs = new Uint16Array(map.maxHexId + 1).fill(0);
        this.soldiers = new Uint16Array(map.maxHexId + 1).fill(0);
        this.buildings = new Uint8Array(map.maxHexId + 1).fill(0);
        this.food = 0;
        this.gems = 0;
        this.metal = 0;
        this.stone = 0; 
        this.wood = 0;
        this.occupiedTiles = new Set();
        this.developedTiles = new Set();
    }
}