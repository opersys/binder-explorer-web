define(function (require) {
    var $ = require("jquery/jquery");
    var MainView = require("views/main");
    var mainView = new MainView({ el: $("#app") });

    var resizeWindow = function () {
        $("#app")
            .width($(window).width())
            .height($(window).height());

        w2ui[mainView.getLayoutName()].resize();
    };

    //

    $(window).resize(_.debounce(resizeWindow, 100));

    // Reformat the window content.
    resizeWindow();
});