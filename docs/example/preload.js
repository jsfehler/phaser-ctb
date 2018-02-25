var preload = function (game) {
    "use strict";
};

preload.prototype = {
    preload: function () {
        "use strict";
        var loadingBar = this.add.sprite(160, 240, "loading");
        loadingBar.anchor.setTo(0.5, 0.5);
        this.load.setPreloadSprite(loadingBar);

        // UI
        this.game.load.image("p1_icon", "assets/p1_icon.png");
        this.game.load.image("p2_icon", "assets/p2_icon.png");
        this.game.load.image("m1_icon", "assets/m1_icon.png");

        this.game.load.image("waitButton", "assets/wait_button.png");

    },
    create: function () {
        "use strict";
        this.game.state.start("Battle");
    }
};
