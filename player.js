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
    static humanPlayerID = 0;
    static players = [0];

    constructor(map, startingUnits, startTiles) {
        Player.maxTileID = map.maxHexID;
        Player.players.push(this);
        Player.map = map;
        this.playerID = Player.players.length - 1;
        this.playerLevel = "Clan"; 
        this.color = Phaser.Display.Color.RandomRGB(30,200);   
        this.ownedTiles = new Set();
        this.createDataArrays();
        this.initializeResources(startingUnits*3);
        this.initializeMetrics();
        this.chooseStartTiles(startingUnits, startTiles);
        this.setPlayerName();
        
    }

    calculateTileInfluence( units, buildings ){
        let influence = 30 * buildings + units + 200;
        // if (owned) influence += 100;
        if ( influence > 255 ) influence = 255;
        return influence
    }

    setInfluence( middleTileID, middleValue ){
        this.influence[middleTileID] = middleValue;
        let neighbors = Player.map.neighborsOf( middleTileID );
        neighbors.forEach((tileID) => {
            if( this.influence[tileID] < middleValue / 15) {
                this.influence[tileID] = middleValue / 15;
            }         
        });
    }

    chooseStartTiles(units, startTiles) {
        // Pick first tile
        let firstTileID;
        do {
            firstTileID = Math.round(Player.map.randtileID() / 3);      
        } while (Player.map.elevations[firstTileID] <= Player.map.seaLevel || Player.allOwnedTiles.has(firstTileID));
        this.captureTile(firstTileID);

        // Pick other tile around first tile
        for (let i = 1; i < startTiles; i++) {
            let randomTileID;
            do {
                randomTileID = Player.map.randomHexID( Player.map.hexIDAtPosition( this.avgPosition() ), Player.map.layers/30 + 8 );       
            } while (Player.map.elevations[randomTileID] <= Player.map.seaLevel || Player.allOwnedTiles.has(randomTileID));
            this.captureTile(randomTileID);
        }
    
        // Add units to tiles
        for (const tileID of this.ownedTiles) {
            let civs = Math.round(Math.random() * (units / startTiles)) + 1;
            let soldiers = Math.round(Math.random() * (units / startTiles / 3)) + 1;
            units -= civs + soldiers;
            startTiles--;
            this.addCivs(tileID, civs);
            this.addSoldiers(tileID, soldiers);
        }
    }

    avgPosition() {
        let totalX = 0;
        let totalY = 0;
        let count = 0;
        for (const tileID of this.ownedTiles) {
            let tilePosition = Player.map.hexCenters[tileID];
            totalX += tilePosition.x;
            totalY += tilePosition.y;
            count++;
        } 
        if (count == 0) return { x: 0, y: 0 };
        return { x: totalX / count, y: totalY / count };
    }

    addCivs(tileID, civs) {
        this.civs[tileID] += civs;
        this.updateOwnershipStatus(tileID);
    }

    removeCivs(tileID, civs) {
        this.civs[tileID] -= civs;
        this.updateOwnershipStatus(tileID);
    }

    addSoldiers(tileID, soldiers) {
        this.soldiers[tileID] += soldiers;
        this.updateOwnershipStatus(tileID);
    }

    removeSoldiers(tileID, soldiers) {
        this.soldiers[tileID] -= soldiers;
        this.updateOwnershipStatus(tileID);
    }

    moveAllUnits(from, to) {
        // TODO: Check for conflicts/collisions
        this.civs[to] += this.civs[from];
        this.soldiers[to] += this.soldiers[from];
        this.civs[from] = 0;
        this.soldiers[from] = 0;
        this.ownedTiles.add(to);
        this.ownedTiles.delete(from);
        this.updateOwnershipStatus(from);
        this.updateOwnershipStatus(to);
        Player.map.updateOverLays();
    }

    updateOwnershipStatus(tileID) {
        if(this.civs[tileID] + this.soldiers[tileID] + this.buildings[tileID]) {
            this.ownedTiles.add(tileID);
        } else {
            this.ownedTiles.delete(tileID);
        }
    }

    /**
     * Set the player name. Prevent Duplicates
     * @param {string} name - The name to set for the player. Defaults to an empty string so that a new random name is generated.
     */
    setPlayerName(name = "") {
        while ( Player.playerNames.has(name) || name.length < 3 ) {
            name = PRE[Math.floor(Math.random()*PRE.length)] + MID[Math.floor(Math.random()*MID.length)] + SUFF[Math.floor(Math.random()*SUFF.length)];
        }
        Player.playerNames.add(name);
        this.name = name;
    }

    createDataArrays() {
        this.civs = new Uint16Array(Player.maxTileID + 1);
        this.soldiers = new Uint16Array(Player.maxTileID + 1);
        this.buildings = new Uint8Array(Player.maxTileID + 1);
        this.influence = new Uint8Array(Player.maxTileID + 1);   
    }

    /**
    * Resources:
    * 0: Gems
    * 1: Food
    * 2: Metal
    * 3: Stone
    * 4: Wood
     */
    initializeResources( maxAmount ) {
        this.resoucres = new Uint16Array(5);
        for (let i in this.resoucres) {
            this.resoucres[i] = Math.ceil(Math.random() * maxAmount);
        }
    }

    /**
    * Metrics:
    * 0: Morale
    * 1: Health
    */
    initializeMetrics() {
        this.metrics = new Uint16Array(2);
        for (let i in this.metrics) {
            this.metrics[i] = 204; // 80%
        }
    }

    captureTile(tileID) {
        Player.allOwnedTiles.add(tileID);
        this.ownedTiles.add(tileID); 
        this.setInfluence( tileID, this.calculateTileInfluence( this.civs[tileID] + this.soldiers[tileID], 0) );   
        Player.map.mapOverlays['allInfluence'].setLayer(this.playerID, this.color, this.influence);
        if (Player.getOwnerID(tileID) === Player.humanPlayerID) {
            Player.map.mapOverlays['playerInfluence'].setLayer(0, this.color, this.influence);
        }  
    }

    randomOwnedTile() {
        let owndedTilesArray = Array.from(this.ownedTiles);    
        let tileID = owndedTilesArray[Math.floor(Math.random() * items.length)];
        let tilePosition = Player.map.hexCenters[tileID];
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
        }
        let tilePosition = Player.map.hexCenters[highestUnitsTileID];
        return {tileID: highestUnitsTileID, x: tilePosition.x, y: tilePosition.y}
    }

    static allCivs() {
        let allCivs = new Uint16Array(Player.maxTileID + 1);
        for (let playerID = 1; playerID < Player.players.length; playerID++) {
            for (let tileID = 0; tileID <= Player.maxTileID; tileID++) {
                allCivs[tileID] += Player.players[playerID].civs[tileID];
            }
        }     
        return allCivs;
    }

    static allSoldiers() {
        let allSoldiers = new Uint16Array(Player.maxTileID + 1);
        for (let playerID = 1; playerID < Player.players.length; playerID++) {
            for (let tileID = 0; tileID <= Player.maxTileID; tileID++) {
                allSoldiers[tileID] += Player.players[playerID].soldiers[tileID];
            }
        }     
        return allSoldiers;
    }

    static allUnits() {
        let allUnits = new Uint16Array(Player.maxTileID + 1);
        for (let playerID = 1; playerID < Player.players.length; playerID++) {
            for (let tileID = 0; tileID <= Player.maxTileID; tileID++) {
                allUnits[tileID] += Player.players[playerID].civs[tileID] + Player.players[playerID].soldiers[tileID];
            }
        }     
        return allUnits;
    }

    static getOwnerID(tileID) {
        for (let playerID = 1; playerID < Player.players.length; playerID++) {
            if (Player.players[playerID].ownedTiles.has(tileID)) {
                return playerID;
            }
        }
        return 0;
    }

    static getOwner(tileID) {
        for (let playerID = 1; playerID < Player.players.length; playerID++) {
            if (Player.players[playerID].ownedTiles.has(tileID)) {
                return Player.players[playerID];
            }
        }
        return 0;
    }

    static chooseHumanPlayer() {
        Player.humanPlayerID = Math.ceil(Math.random() * (Player.players.length - 1));
        Player.humanPlayer = Player.players[Player.humanPlayerID];
        Player.map.mapOverlays['playerInfluence'].setLayer(0, Player.humanPlayer.color, Player.humanPlayer.influence);
    }
}