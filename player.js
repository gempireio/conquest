import {UnitGroup} from './unit_group.js';

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
    static currentPlayer;

    constructor(map, startingUnits, startTiles) {
        Player.maxTileID = map.maxHexID;
        Player.players.push(this);
        Player.map = map;
        this.playerID = Player.players.length - 1;
        this.playerLevel = "Clan"; 
        this.color = Phaser.Display.Color.RandomRGB(30,200);   
        this.ownedTiles = new Set();
        this.unitGroups = new Set();
        this.createDataArrays();
        this.initializeResources(startingUnits*3);
        this.initializeMetrics();
        this.chooseStartTiles(startingUnits, startTiles);
        this.setPlayerName();  
    }

    // calculateTileInfluence( units, buildings ){
    //     let influence = 30 * buildings + units + 200;
    //     // if (owned) influence += 100;
    //     if ( influence > 255 ) influence = 255;
    //     return influence
    // }

    updateInfluence( middleTileID ){
        let middleValue = Math.min(255, this.buildings[middleTileID] + ( this.civs[middleTileID] * 2 ) + ( this.soldiers[middleTileID] * 3 ));
        this.influence[middleTileID] = middleValue;
        let neighbors = Player.map.neighborsOf( middleTileID );

        // TODO: Fix trail of previously occupied tiles. Erase bordering influence when leaving.
        // neighbors.forEach((tileID) => {
        //     if( this.influence[tileID] < middleValue / 12 ) {
        //         this.influence[tileID] = middleValue / 12;
        //     }         
        // });
    }

    // setInfluence( middleTileID, middleValue ) {
    //     this.influence[middleTileID] = middleValue;
    //     let neighbors = Player.map.neighborsOf( middleTileID );
    //     neighbors.forEach((tileID) => {
    //         if( this.influence[tileID] < middleValue / 15) {
    //             this.influence[tileID] = middleValue / 15;
    //         }         
    //     });
    // }

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
            
            // Lift Fog of War at average Position
            this.revealTile(Player.map.hexIDAtPosition( this.avgPosition() ));
        }
    
        // Add units to tiles
        for (const tileID of this.ownedTiles) {
            let civs = Math.round(Math.random() * (units / startTiles)) + 1;
            let soldiers = Math.round(Math.random() * (units / startTiles / 3)) + 1;
            units -= civs + soldiers;
            startTiles--;
            this.addUnits(tileID, civs, soldiers);
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

    revealTile(tileID) {
        this.darkenFogOfWarEveryWhere(3);
        this.fogOfWar[tileID] = 0;
        for (let i = 0; i < 30; i++){
            let randomTileID = Player.map.randomHexID(tileID, Math.random() * 3);
            this.fogOfWar[randomTileID] *= 0.6;
        }     
        for (let i = 0; i < 50; i++){
            let randomTileID = Player.map.randomHexID(tileID, Math.random() * 4);
            this.fogOfWar[randomTileID] *= 0.8;
        } 
        for (let i = 0; i < 100; i++){
            let randomTileID = Player.map.randomHexID(tileID, Math.random() * 6);
            this.fogOfWar[randomTileID] *= 0.9;
        } 
        if (Player.humanPlayerID === this.playerID) {
            this.updateFogOfWar();
        }
    }

    moveUnits(from, to, civs, soldiers) {
        this.unitGroups.add(new UnitGroup(this, Math.min(civs, this.civs[from]), Math.min(soldiers, this.soldiers[from]), from, to, 1));
        Player.map.updateGraphics(); 
    }

    oldMoveUnits(from, to, civs, soldiers) {
         
        // Only move what is available
        civs = Math.min(civs, this.civs[from]);
        soldiers = Math.min(soldiers, this.soldiers[from]);
        
        // Update unit counts
        this.civs[from] -= civs;
        this.soldiers[from] -= soldiers;
        this.civs[to] += civs;
        this.soldiers[to] += soldiers;

        // Update ownership
        this.updateOwnershipStatus(from);
        this.updateOwnershipStatus(to);
        this.revealTile(to);
        Player.map.updateGraphics(); 
    }

    addUnits(tileID, civs, soldiers) {
        this.civs[tileID] += civs;
        this.soldiers[tileID] += soldiers;
        this.updateOwnershipStatus(tileID);  
    }

    destroyUnits(tileID, civs, soldiers) {
        this.civs[tileID] -= Math.min(civs, this.civs[tileID]);
        this.soldiers[tileID] -= Math.min(soldiers, this.soldiers[tileID]);
        this.updateOwnershipStatus(tileID);
    }

    attack(from, to, civs, soldiers) {
        civs = Math.min(civs, this.civs[from]);
        soldiers = Math.min(soldiers, this.soldiers[from]);
        let defender = Player.getOwner(to);
        console.log("Attacking c" + civs + " s" + soldiers);
        console.log("Defending c" + defender.civs[to] + " s" + defender.soldiers[to]);
        let attackerPower = (civs/10 + soldiers/1.1);
        let defenderPower = (defender.civs[to]/7 + defender.soldiers[to]);
        let attackerMultiplier = Math.pow(Math.random(), 0.3) + (Math.pow(Math.random(), 10)  * 10);
        let defenderMultipler = Math.pow(Math.random(), 0.3) + (Math.pow(Math.random(), 10)  * 10);
        let attackerLosses = Math.round(defenderPower * defenderMultipler);
        let defenderLosses = Math.round(attackerPower * attackerMultiplier);
        let attackerWin = false;
        let attackerLostCivs, attackerLostSoldiers, defenderLostCivs, defenderLostSoldiers;
        attackerLostCivs = attackerLostSoldiers = defenderLostCivs = defenderLostSoldiers = 0;
        console.log("Total Losses: A" + attackerLosses + " D" + defenderLosses);
        // Attacker lost all soldiers
        if (attackerLosses >= soldiers) {
            attackerLostSoldiers = soldiers;
            attackerLostCivs = Math.min(attackerLosses - soldiers, civs);
        } else {
            attackerLostSoldiers = attackerLosses;
        }

        // Defender lost all soldiers
        if (defenderLosses >= defender.soldiers[to]) {
            defenderLostSoldiers = defender.soldiers[to];
            defenderLostCivs = Math.min( defender.civs[to], defenderLosses - defenderLostSoldiers);

            // Defender given second chance if surviving civs outnumber attacking units strength.
            if (defender.civs[to] - defenderLostCivs > civs + (soldiers*5) - attackerLosses) {
                console.log("Defender Wins (All Soldiers Killed)");
            } else {
                console.log("Attacker Wins (or Draw)");
                attackerWin = true;

                // Convert surviving civs
                let convertedCivs = defender.civs[to] - defenderLostCivs;
                this.civs[to] = convertedCivs;
                defender.civs[to] = 0;
                console.log("Converted Civs: " + convertedCivs);

                // Move Attacking Units   
                this.moveUnits(from, to, civs - attackerLostCivs, soldiers - attackerLostSoldiers);
                this.revealTile(to)
            }
        } else {
            // Defender Wins
            console.log("Defender Wins");
            defenderLostSoldiers = defenderLosses;   
        }

        // Attacker lost all units
        if (attackerLostCivs + attackerLostSoldiers >= civs + soldiers) {
            this.darkenFogOfWarAroundTile(from);      
            attackerWin = false;

            // Draw. All units from both sides died.
            if (defenderLostCivs + defenderLostSoldiers >= defender.civs[to] + defender.soldiers[to]) {
                console.log("Draw. All units died.");  
            }         
        }

        // Remove destroyed units
        this.destroyUnits(from, attackerLostCivs, attackerLostSoldiers);
        defender.destroyUnits(to, defenderLostCivs, defenderLostSoldiers);
        Player.map.updateGraphics();
        console.log("Attacker Losses: c" + attackerLostCivs + " s" + attackerLostSoldiers);
        console.log("Defender Losses: c" + defenderLostCivs + " s" + defenderLostSoldiers);
        return attackerWin;
    }

    updateOwnershipStatus(tileID) {
        if(this.civs[tileID] + this.soldiers[tileID] + this.buildings[tileID]) {
            this.ownedTiles.add(tileID);
            Player.allOwnedTiles.add(tileID);
            this.updateInfluence(tileID);  
        } else {
            if (this.ownedTiles.has(tileID)) {
                this.ownedTiles.delete(tileID);
                Player.allOwnedTiles.delete(tileID);
                this.updateInfluence(tileID);  
            }
        }
    }

    updateInfluenceOverlay(tileID){
        Player.allOwnedTiles.add(tileID);
        this.ownedTiles.add(tileID); 
        this.updateInfluence(tileID);  
        Player.map.mapOverlays['allInfluence'].setLayer(this.playerID, this.color.color, this.influence);
        if (Player.getOwnerID(tileID) === Player.humanPlayerID) {
            Player.map.mapOverlays['humanPlayerInfluence'].setLayer(0, this.color.color, this.influence);
        }  
    }

    darkenFogOfWarEveryWhere(intensity) {
        for (let tileID = 0; tileID <= Player.maxTileID; tileID++) {
            if (this.influence[tileID] == 0) {
                this.fogOfWar[tileID] = Math.min(255, ( this.fogOfWar[tileID] * (1 + (intensity/100)) ) + intensity);
            } else {
                for (let i = 0; i < 30; i++){
                    let randomTileID = Player.map.randomHexID(tileID, Math.random() * 4);
                    this.fogOfWar[randomTileID] *= 0.7;
                }  
            } 
        }
    }

    darkenFogOfWarAroundTile(tileID) {
        for (let i = 0; i < 100; i++){
            let randomTileID = Player.map.randomHexID(tileID, Math.random() * 7);
            if (this.influence[randomTileID] == 0) {
                this.fogOfWar[randomTileID] = Math.min(255, this.fogOfWar[randomTileID] * 1.1 + 5);
            } 
        }
    }

    updateFogOfWar() {
        Player.map.mapOverlays['fogOfWar'].setLayer(0, 0x030609, this.fogOfWar);
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
        this.fogOfWar = new Uint8Array(Player.maxTileID + 1).fill(255);
    }

    /**
    * Player Resources:
    * 0: Gems
    * 1: Food
    * 2: Metal
    * 3: Stone
    * 4: Wood
     */
    initializeResources( maxAmount ) {
        this.resources = new Uint16Array(5);
        for (let i in this.resources) {
            this.resources[i] = Math.ceil(Math.random() * maxAmount);
        }
    }

    /**
    * Player Metrics:
    * 0: Morale
    * 1: Health
    */
    initializeMetrics() {
        this.metrics = new Uint16Array(2);
        for (let i in this.metrics) {
            this.metrics[i] = 204; // 80%
        }
    }

    /**
     * Capture a tile and update the player's influence without moving units
     * @param {int} tileID - the ID of the tile to capture
     */
    captureTile(tileID) {
        Player.allOwnedTiles.add(tileID);
        this.ownedTiles.add(tileID); 
        this.updateInfluence(tileID);   
        this.revealTile(tileID);
        Player.map.mapOverlays['allInfluence'].setLayer(this.playerID, this.color.color, this.influence);
        if (Player.getOwnerID(tileID) === Player.humanPlayerID) {
            Player.map.mapOverlays['humanPlayerInfluence'].setLayer(0, this.color.color, this.influence);
        }        
    }

    randomOwnedTile() {
        let owndedTilesArray = Array.from(this.ownedTiles);    
        let tileID = owndedTilesArray[Math.floor(Math.random() * owndedTilesArray.length)];
        let tilePosition = Player.map.hexCenters[tileID];
        return {tileID: tileID, x: tilePosition.x, y: tilePosition.y}
    }

    highestUnitsTile() {
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
        return {tileID: highestUnitsTileID, units: highestUnits, x: tilePosition.x, y: tilePosition.y}
    }

    revealedBounds(){
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity; 
        let maxY = -Infinity;
        for (let tileID = 0; tileID <= Player.maxTileID; tileID++) {
            if (this.fogOfWar[tileID] < 250) {
                minX = Player.map.hexCenters[tileID].x < minX ? Player.map.hexCenters[tileID].x : minX; 
                minY = Player.map.hexCenters[tileID].y < minY ? Player.map.hexCenters[tileID].y : minY;
                maxX = Player.map.hexCenters[tileID].x > maxX ? Player.map.hexCenters[tileID].x : maxX;
                maxY = Player.map.hexCenters[tileID].y > maxY ? Player.map.hexCenters[tileID].y : maxY;
            }
        }
        return {minX: minX, minY: minY, maxX: maxX, maxY: maxY};
    }

    startTurn() {
        console.log("Start Of Player " + this.name + "(" + this.playerID + ") Turn");
        this.reproduce();
        for (const unitGroup of this.unitGroups) {
            unitGroup.startTurn();
            if (unitGroup.progress() >= 1) this.unitGroups.delete(unitGroup);
        }
        Player.map.updateGraphics(); 
    }

    endTurn() {
        console.log("End Of Player " + this.name + "(" + this.playerID + ") Turn");
        for (const unitGroup of this.unitGroups) {
            unitGroup.endTurn();
        }
        Player.map.updateGraphics(); 
    }

    reproduce() {
        let newCivs = Math.ceil((this.totalCivs() * 0.01) + (this.totalSoldiers() * 0.005));
        
        // Add to highest unit tile first
        let highestUnitsTile = this.highestUnitsTile();
        let highestUnits = highestUnitsTile.units;
        let tileID = highestUnitsTile.tileID;
        let civs = Math.floor( newCivs * Math.random() / 2 );

        // Randomly add to other tiles until all new Civs placed
        while (newCivs > 0) {
            // TODO: Limit to developed land once buildings are implemented
            
            // Add Civs
            this.addUnits(tileID, civs, 0);
            newCivs -= civs;

            // Choose new Tile
            tileID = this.randomOwnedTile().tileID;
            let tileUnits = this.civs[tileID] + this.soldiers[tileID];
            civs = Math.ceil( newCivs * Math.random() * ( tileUnits / highestUnits ) );
        }   
    }

    totalCivs() {
        let totalCivs = 0;
        for (const tileID of this.ownedTiles) {
            totalCivs += this.civs[tileID];
        }
        return totalCivs;
    }

    totalSoldiers() {
        let totalSoldiers = 0;
        for (const tileID of this.ownedTiles) {
            totalSoldiers += this.soldiers[tileID];
        }
        return totalSoldiers;
    }

    turnsAway() {
        let totalPlayers = Player.players.length - 1;
        return (this.playerID - Player.currentPlayer.playerID + totalPlayers) % totalPlayers;
    }

    progressToNextTurn() {
        const totalTurns = Player.players.length - 2;
        const turn = Player.currentPlayer.playerID - this.playerID -((+(Player.currentPlayer.playerID > this.playerID)) * (1 + totalTurns) - totalTurns);
        return turn / totalTurns;

        // let turn = this.playerID - Player.currentPlayer.playerID;
        // if (turnsAway < 0) {
        //     turnsAway = totalPlayers + turnsAway;         
        // }
        // return turn / totalPlayers;
    }

    isHumanPlayer() {
        return this.playerID === Player.humanPlayerID;
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
        Player.map.mapOverlays['playerInfluence'].setLayer(0, Player.humanPlayer.color.color, Player.humanPlayer.influence);
        Player.map.mapOverlays['fogOfWar'].setLayer(0, 0x050810, Player.humanPlayer.fogOfWar);
    }
}