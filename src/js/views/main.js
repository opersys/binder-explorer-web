/*
 * Copyright (C) 2015 Opersys inc.
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
    var DependsView = require("views/depends-d3-atom");
    var ServicesView = require("views/services");
    var $ = require("jquery");
    var w2ui = require("w2ui");
    var Operation = require("models/Operation");
    var io = require("socketio");
    var WSHandler = require("wshandler");

    return Backbone.View.extend({

        _dependsView: null,

        getLayoutName: function () {
            return "layout";
        },

        _onServiceSelected: function (type, id) {
            var self = this;

            self._dependsView.select(type, id);
            self._serviceView.select(type, id);
        },

        _onServiceUnselected: function (type, id) {
            var self = this;

            self._dependsView.unselect(type, id);
            self._serviceView.unselect(type, id);
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._operations = opts.operations;
            self._procs = opts.procs;

            self._dependsView = new DependsView({
                binderServices: self._binderServices,
                binderProcesses: self._binderProcesses,
                functions: self._functions
            });

            self._serviceView = new ServicesView({
                binderServices: self._binderServices,
                binderProcesses: self._binderProcesses
            });

            self._sock = io(location.host + "/", { transports: ["websocket"] });
            self._wsHandler = new WSHandler(self._sock, self._binderServices, self._binderProcesses);

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    {
                        type: "main",
                        content: self._dependsView
                    },
                    {
                        type: "left",
                        content: self._serviceView,
                        size: 200
                    }
                ],
                onResize: function (ev) {
                    ev.onComplete = function () {
                        if (self._dependsView) {
                            self._dependsView.resize();
                        }
                    };
                }
            });

            self._serviceView.on("services_view:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });

            self._serviceView.on("services_view:unselected", function () {
                self._onServiceUnselected.apply(self, arguments);
            });

            self._dependsView.on("depends_view:selected", function () {
                self._onServiceSelected.apply(self, arguments);
            });
        }
    });
});