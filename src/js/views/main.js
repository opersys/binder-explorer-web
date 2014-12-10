/*
 * Copyright (C) 2014 Opersys inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define(function (require) {
    var Backbone = require("backbone");
    var DependsView = require("views/depends");
    var ServicesView = require("views/services");
    var $ = require("jquery");
    var w2ui = require("w2ui");

    return Backbone.View.extend({

        _dependsView: null,

        getLayoutName: function () {
            return "layout";
        },

        _onServiceSelected: function (binderSer) {
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._procs = opts.procs;

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    { type: "main" },
                    { type: "left", size: 300 }
                ],
                onResize: function (ev) {
                    ev.onComplete = function () {
                        if (self._dependsView)
                            self._dependsView.resize();
                    };
                }
            });

            self._dependsView = new DependsView({
                el: $(w2ui[self.getLayoutName()].el("main")),
                binderServices: self._binderServices
            });

            self._servicesView = new ServicesView({
                el: $(w2ui[self.getLayoutName()].el("left")),
                binderServices: self._binderServices
            });

            self._servicesView.on("viewServices:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });

            self._dependsView.on("viewDepends:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });
        }
    });
});