define(function (require) {
    var Backbone = require("backbone/backbone");
    var DependsView = require("views/depends");
    var ServicesView = require("views/services");
    var $ = require("jquery/jquery");
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        _dependsView: null,

        getLayoutName: function () {
            return "layout";
        },

        initialize: function (opts) {
            var self = this;

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    { type: "main", size: 600 },
                    { type: "left" }
                ],
                onResize: function (ev) {
                    ev.onComplete = function () {
                        //self.onResize.apply(arguments);
                        if (self._dependsView)
                            self._dependsView.resize();
                    };
                }
            });

            self._dependsView = new DependsView({
                el: $(w2ui[self.getLayoutName()].el("main"))
            });

            self._servicesView = new ServicesView({
                el: $(w2ui[self.getLayoutName()].el("left"))
            });
        }
    });
});