// Empire Names
const PRE = ["Ger", "Brit", "Am", "Cal", "Den", "Est", "Fin", "Gin", "Hin", "Ig", "Jar", "Kan", "Lon", "Mer", "Nan", "Orph", "Pol", "Qar", "Rash", "Saf", "", "Zor"];
const MID = ["", "ham",  "an", "for", "ork", "ish", "ead", "ma", "bor", "ter"];
const SUFF = ["", "a", "y", "id", "or", "il", "ex"];

/**
 * Player Levels:
 * Clan: < 500 Population
 * Tribe: > 500 Population
 * Kingdom: > 10000 Population
 * Empire: > 2 Kingdoms
 * 
 * Resources:
 * 0: Gems
 * 1: Food
 * 2: Metal
 * 3: Stone
 * 4: Wood
 * 
 * Metrics:
 * 0: Morale
 * 1: Health
 * 2: totalCivs
 * 3: totalSoldiers
 * 4: totalBuildings
 * 5: totalUnits
 * 
 * Buildings:
 * 0: Barracks
 * 1: Farm
 * 2: Mine
 * 3: Sawmill
 * 5: Harbor
 * 6: Park
 * 7: Palace
 */

/**
 * Stores all the data relevant to a player
 */
export class Player {
    static playerNames = new Set();
    static allOwnedTiles = new Set();
    static players = [];
    static humanPlayerID = 0;

    constructor(map, startingUnits, startTiles) {
        Player.players.push(this);
        this.playerID = Player.players.length - 1;
        this.map = map; 
        this.ownedTiles = new Set();
        this.createDataArrays();
        this.chooseStartTiles(startingUnits, startTiles);
        this.setPlayerName();
        this.playerLevel = "Clan";
        this.color = Phaser.Display.Color.RandomRGB(30,200);     
        map.mapOverlays['influence'].setLayer(this.playerID, this.color, this.influence);
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
            if( this.influence[tileID] < middleValue / 2) {
                this.influence[tileID] = middleValue / 2;
            }         
        });
    }

    chooseStartTiles(startTiles, units) {
        this.civs[this.startTile] =
        this.captureTile(this.startTile);

        // Pick tile not already taken
        for (let i = 0; i < startTiles; i++){
            let startTile;
            do {
                startTile = Math.round(this.map.randHexID() / 3);           
            } while (this.map.elevations[startTile] <= this.map.seaLevel || Player.allOwnedTiles.has(startTile));
            Player.allOwnedTiles.add(startTile);
            this.ownedTiles.add(startTile);
            this.map.generateTileName(startTile);
            this.captureTile(startTiles);
        }

        // Add civs to tile
        for (const tileID of this.ownedTiles) {
            this.civs[tileID] = Math.ceil(Math.random() * units/startTiles*2) + 1;
        }
    }
    
    setPlayerName() {
        let name = "";
        // Set Player Name. Prevent Duplicates.
        do {
            if (!name || Player.playerNames.has(name)) name = PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];
        } while ( Player.playerNames.has(name) || name.length < 3 );
        Player.playerNames.add(name);
        this.name = name;
    }

    createDataArrays() {
        this.civs = new Uint16Array(this.map.maxHexID + 1);
        this.soldiers = new Uint16Array(this.map.maxHexID + 1);
        this.buildings = new Uint8Array(this.map.maxHexID + 1);
        this.influence = new Uint8Array(this.map.maxHexID + 1); 
        this.resoucres = new Uint16Array(5);
        this.metrics = new Uint16Array(5);
    }

    captureTile(tileID) {
        this.map.owner[tileID] = this.playerID;    
        this.setInfluence( tileID, this.calculateTileInfluence( this.civs[tileID], 0) ); 
        this.map.mapOverlays['influence'].setLayer(this.playerID, this.color, this.influence);
    }

    randomOwnedTile() {
        let owndedTilesArray = Array.from(this.ownedTiles);    
        let tileID = owndedTilesArray[Math.floor(Math.random() * items.length)];
        let tilePosition = this.map.hexCenters[tileID];
        return {tileID: tileID, x: tilePosition.x, y: tilePosition.y}
    }

    highestUnitTile() {
        let highestUnits = 0;
        let highestUnitsTileID = 0;
        for (const tileID of this.ownedTiles) {
            let units = this.civs[tileID] + this.soldiers[tileID];
            if (units > highestUnits) {
                highestUnits = units;
                highestUnitsTileID = tileID;
            }
            this.civs[tileID] = Math.ceil(Math.random() * units/this.ownedTiles.size*2) + 1;
        }
        let tilePosition = this.map.hexCenters[highestUnitsTileID];
        return {tileID: highestUnitsTileID, x: tilePosition.x, y: tilePosition.y}
    }

    static chooseHumanPlayer() {
        Player.humanPlayerID = Math.floor(Math.random() * (Player.players.length));
        return Player.players[Player.humanPlayerID];
    }
}