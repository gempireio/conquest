export class UnitGroup {
    constructor(civs, soldiers, startTileID, endTileID, totalTurns) {
        this.civs = civs;
        this.soldiers = soldiers;
        this.startTileID = startTileID;
        this.endTileID = endTileID;
        this.totalTurns = totalTurns
        this.currentTurn = 1;
    }

    startTurn() {

    }

    endTurn() {
        this.currentTurn++;
    }

    currentTileID() {
        return 
    }
}