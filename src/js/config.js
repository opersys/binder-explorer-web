requirejs.config({
    shim: {
        "w2ui": {
            deps: ["jquery"],
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
        "sigma.plugins.customEdgeShapes": {
            deps: ["sigma"]
        },
        "jquery-timer/jquery.timer": {
            deps: ["jquery"]
        },
        jquery: {
            exports: "$"
        },
        underscore: {
            exports: "_"
        },
        backbone: {
            deps: ["underscore"]
        },
        "backbone-relational": {
            deps: ["underscore", "backbone"]
        }
    },
    paths: {
        w2ui: "w2ui/w2ui-1.4.2.min",
        sigma: "sigma.js/sigma.min",
        "sigma.layout.forceAtlast2": "sigma.js/plugins/sigma.layout.forceAtlas2.min",
        "sigma.plugins.dragNodes": "sigma.js/plugins/sigma.plugins.dragNodes.min",
        "sigma.plugins.customEdgeShapes": "sigma.js/plugins/sigma.renderers.customEdgeShapes.min",
        underscore: "underscore/underscore",
        backbone: "backbone/backbone",
        jquery: "jquery/jquery"
    },
    packages: []
});

requirejs(["app"]);