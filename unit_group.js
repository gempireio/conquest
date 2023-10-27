export class UnitGroup {
    constructor(player, civs, soldiers, startTileID, endTileID, totalTurns) {
        this.player = player;
        this.civs = civs;
        this.soldiers = soldiers;
        this.startTileID = startTileID;
        this.endTileID = endTileID;
        this.totalTurns = totalTurns
        this.currentTurn = 0;

        // Update unit counts
        player.civs[startTileID] -= civs;
        player.soldiers[startTileID] -= soldiers;
        this.player.updateOwnershipStatus(startTileID);
    }

    startTurn() {
        if (this.progress() >= 1) {
            // Add units to endTile
            this.player.civs[this.endTileID] += this.civs;
            this.player.soldiers[this.endTileID] += this.soldiers;

            // Update ownership
            this.player.updateOwnershipStatus(this.endTileID);
            this.player.revealTile(this.endTileID);
        }
    }

    endTurn() {
        this.currentTurn++;
    }

    currentTileID() {
        // TODO Calculate the current tile for more than 1 tile movement
        if (this.progress() > 0.5) {
            return this.endTileID;
        } else {
            return this.startTileID;
        }      
    }

    progress() {
        return ( this.currentTurn - 1 + this.player.progressToNextTurn() ) / this.totalTurns;
    }
}