var boot = function (game) {
    "use strict";
};

boot.prototype = {
    preload: function () {
        "use strict";
        this.game.load.image("loading", "assets/loading.png");
	},
    create: function () {
	"use strict";
        this.game.stage.backgroundColor = "#252525";
	this.game.state.start("Preload");
	}
};
