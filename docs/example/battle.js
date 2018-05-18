// Data for the Units

var fastFelixData = {
    "name": "Fast Felix",
    "defaultMaxHp": 100, // Maximum Health Points at battle start.
    "hp": 100, // Current Healh Points.
    "defaultSpeed": 10, // Speed at battle start.
    "speed": 10, // Current speed.
    "ct": 0, // Current Clock Time. Unit with CT over 100 gets a turn.
    "testCT": 0, // Current Test Clock Time (For turn order estimation).
    "icon": "p1_icon", // Icon for the turn order HUD.
    "amountOfTicksTo100": 0, // Used during testCT calculations.
};

var smoothSammyData = {
    "name": "Smooth Sammy",
    "defaultMaxHp": 110,
    "hp": 100,
    "defaultSpeed": 7,
    "speed": 7,
    "ct": 0,
    "testCT": 0,
    "icon": "p2_icon",
    "amountOfTicksTo100": 0,
};

var monsterData = {
    "name": "Big Dumb Monster",
    "defaultMaxHp": 100,
    "hp": 100,
    "defaultSpeed": 5,
    "speed": 5,
    "ct": 0,
    "testCT": 0,
    "icon": "m1_icon",
    "amountOfTicksTo100": 0,
};

// Text style
var fontStyle = {font: "14px Arial", fill: "#FFF"};

/** An object for displaying a player unit's GUI. */
var UnitGUI = function (game, data, x, y) {
    "use strict";

    var x = x || 0;
    var y = y || 0;

    this.name = game.add.text(0, 0, data.name, fontStyle);
    this.hp = game.add.text(0, 0, "HP: " + data.hp, fontStyle);
    this.ct = game.add.text(0, 0, "CT: " + data.ct, fontStyle)

    this.column = new uiWidgets.Column(game, x, y);
    this.column.addNode(this.name);
    this.column.addNode(this.hp);
    this.column.addNode(this.ct, 0, 0, Phaser.BOTTOM_LEFT);
};


// Phaser State: Battle
var battle = function (game) {
    "use strict";
    this.game = game;
};

battle.prototype = {
	create: function () {
        "use strict";

        // Flag for determining which phase of battle we're in.
        this.inTickPhase = true;

        // List of all units Data participating in the battle.
        this.units = [fastFelixData, smoothSammyData, monsterData];

        // Display every player unit's data in a row of columns
        this.p1Display = new UnitGUI(this.game, fastFelixData);
        this.p2Display = new UnitGUI(this.game, smoothSammyData);

        this.playerDisplayRow = new uiWidgets.Row(this.game, 16, 200);
        this.playerDisplayRow.addNode(this.p1Display.column, 16);
        this.playerDisplayRow.addNode(this.p2Display.column, 16);

        this.m1Display = new UnitGUI(this.game, monsterData, 16, 16);

        // Turn Order Estimator
        // Can only ever be an estimate, since unit stats could change, moves could use different amounts of CT, etc.
        // Must be refreshed immediately after each unit's turn to remain accurate.
        this.estimatedTurnsAmount = 16;
        this.estimatedTurnOrder = [];
        for (var idx = 0; idx < this.estimatedTurnsAmount; idx++) {
            this.estimateTurnOrder(idx);
        }

        // Turn Order Estimation Display
        this.turnOrderDisplayIconHeight = 32;
        this.turnOrderDisplay0 = this.game.add.sprite(
            this.game.world.width - 100,
            16,
            this.estimatedTurnOrder[0].icon
        );
        for (var i = 1; i < this.estimatedTurnsAmount; i++) {
            var xPos = 0;
            this.game.add.sprite(
                0,
                0,
                this.estimatedTurnOrder[i].icon
            ).alignTo(this.turnOrderDisplay0, Phaser.BOTTOM_CENTER, xPos, (this.turnOrderDisplayIconHeight) * (i - 1) );
        }

        // Button that ends a unit's turn
        // TODO: Actual menu of things you can do (Act, Defend, etc)
        this.waitButton = this.game.add.button(-100, -100, "waitButton", this.doTurn);
    },

    update: function () {
        "use strict";
        // Update all units CT display ASAP
        this.p1Display.ct.setText("CT: " + this.units[0].ct, fontStyle);
        this.p2Display.ct.setText("CT: " + this.units[1].ct, fontStyle);
        this.m1Display.ct.setText("CT: " + this.units[2].ct, fontStyle);

        // If no units can act, go to tickPhase.
        if (this.units.filter(function(o) { return o.ct >= 100; }).length === 0){
            this.inTickPhase = true;
        } else {
            this.inTickPhase = false;
        }

        if (this.inTickPhase) {
            this.tickPhase(this.units);
        }

        // If not in tickPhase, a unit gets a turn, so show the menu.
        // TODO: Only show if friendly unit, else AI should act automatically
        if (this.inTickPhase === false) {
            this.waitButton.revive();
            this.waitButton.x = 200;
            this.waitButton.y = 100;

            // Get unit who's turn it is.
            this.activeUnit = this.units.filter(function(o) { return o.ct >= 100; })[0];
            // console.log(this.activeUnit.name + "'s turn.")
            this.waitButton.context = this;
        }
    },

    tickPhase: function () {
        // Increase every unit in battle's CT by their Speed.
        "use strict";
        for (var i = 0; i < this.units.length; i++){
            this.units[i].ct += this.units[i].speed;
        }
    },

    estimateTurnOrder: function (index) {
        // A sort of fake tickPhase.
        // Calculates who should get turn number [index].
        "use strict";
        var i;
        var unit;

        // First, figure out how many clock ticks it would take for every unit to reach 100 CT, based on their current testCT.
        for (i = 0; i < this.units.length; i++) {
            unit = this.units[i];
            // If unit was the previous unit to go, assume CT would start at 0, and lose all the built up CT from before.
            if (this.estimatedTurnOrder[index - 1] === unit || this.estimatedTurnOrder[index] === unit) {
                unit.testCT = 0;
            } else if (index === 0) { // If estimating slot zero, testCT would equal current CT.
                unit.testCT = unit.ct;
            }

            unit.amountOfTicksTo100 = Math.ceil(100 / unit.speed) - (unit.testCT / unit.speed);

        }

        // Figure out who gets to 100 CT first, based on whoever needed the lowest amount of clock ticks.
        var minNumberOfTicks = Math.min.apply(null, this.units.map(function(o) { return o.amountOfTicksTo100; }));
        var fastestUnit = this.units.filter(function(o) { return o.amountOfTicksTo100 === minNumberOfTicks; });
        this.estimatedTurnOrder[index] = fastestUnit[0];

        // Pretend those ticks happened by increasing testCT for the next round of calculations.
        for (i = 0; i < this.units.length; i++) {
            unit = this.units[i];
            unit.testCT += unit.speed * minNumberOfTicks;
        }

    },

    doTurn: function (button) {
        "use strict";
        // TODO: Split this function into something like doAction and afterTurn, once there's things besides just "wait"
        var context;
        context = button.context;
        //console.log(this.activeUnit.name + "'s Turn Occured");

        // Remove HUD while turn occurs
        context.waitButton.kill();

         // Turn Order Estimator Calculate (At end of turn, before next turn waiting phase)
        context.activeUnit.testCT = 0;

        for (var idx = 0; idx < context.estimatedTurnsAmount; idx++) {
            context.estimateTurnOrder(idx);
        }

        // TODO: Clear old order list, doing it like this is probably not correct
        // Turn Order Display
        context.turnOrderDisplay0 = context.game.add.sprite(
            context.game.world.width - 100,
            16,
            context.estimatedTurnOrder[0].icon
        );
        for (var i = 0; i < context.estimatedTurnsAmount; i++) {
           context.game.add.sprite(
               0,
               0,
               context.estimatedTurnOrder[i].icon
           ).alignTo(context.turnOrderDisplay0, Phaser.BOTTOM_CENTER, 0, (context.turnOrderDisplayIconHeight) * (i - 1) );
        }

        // Reset unit's CT (At end of turn, after estimation)
        context.activeUnit.ct = 0;
    }
};
