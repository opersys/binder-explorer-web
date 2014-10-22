requirejs.config({
    shim: {
        "w2ui": {
            deps: ["jquery/jquery"],
            exports: "w2ui"
        },
        "sigma": {
            exports: "sigma"
        },
        "sigma.layout.forceAtlast2": {
            deps: ["sigma"]
        },
        "sigma.plugins.dragNodes": {
            deps: ["sigma"]
        },
        "jquery-timer/jquery.timer": {
            deps: ["jquery/jquery"]
        },
        "jquery/jquery": {
            exports: "$"
        },
        "underscore/underscore": {
            exports: "_"
        },
        "backbone/backbone": {
            deps: ["underscore/underscore"]
        }
    },
    paths: {
        w2ui: "w2ui/w2ui-1.4.2.min",
        sigma: "sigma.js/sigma.min",
        "sigma.layout.forceAtlast2": "sigma.js/plugins/sigma.layout.forceAtlas2.min",
        "sigma.plugins.dragNodes": "sigma.js/plugins/sigma.plugins.dragNodes.min",

        views: "views"
    },
    packages: [

    ]
});

requirejs(["app"]);