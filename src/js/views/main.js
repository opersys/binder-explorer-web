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
    var w2ui = require("w2ui");
    var io = require("socketio");
    var WSHandler = require("wshandler");
    var Operation = require("models/Operation");
    var DependsView = require("views/depends-d3-atom");
    var ServiceTooltip = require("views/tooltip-service");
    var ProcessTooltip = require("views/tooltip-process");
    var ServiceDialog = require("views/dialog-service");
    var ProcessDialog = require("views/dialog-process");

    return Backbone.View.extend({

        _dependsView: null,
        _serviceTooltip: null,
        _processTooltip: null,

        getLayoutName: function () { return "layout"; },

        _onServiceOver: function (tip, data) {
            var self = this;

            self._serviceTooltip = new ServiceTooltip(tip, data);
            self._serviceTooltip.render();
        },

        _onServiceOut: function (tip, data) {
            var self = this;

            self._serviceTooltip.hide();
        },

        _onProcessOver: function (tip, data) {
            var self = this;

            self._serviceTooltip = new ProcessTooltip(tip, data);
            self._serviceTooltip.render();
        },

        _onProcessOut: function (tip, data) {
            var self = this;

            self._serviceTooltip.hide();
        },

        _onProcessClick: function (data) {
            var self = this;

            self._processDialog = new ProcessDialog(data, self._serviceLinks);
            self._processDialog.render();
        },

        _onServiceClick: function (data) {
            var self = this;

            self._serviceDialog = new ServiceDialog(data, self._serviceLinks);
            self._serviceDialog.render();
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._serviceLinks = opts.serviceLinks;
            self._operations = opts.operations;
            self._procs = opts.procs;

            self._dependsView = new DependsView({
                binderServices: self._binderServices,
                binderProcesses: self._binderProcesses,
                serviceLinks: self._serviceLinks,
                functions: self._functions
            });

            self._sock = io(location.host + "/", { transports: ["websocket"] });
            self._wsHandler = new WSHandler(self._sock, self._binderServices, self._binderProcesses);

            self.$el.w2layout({
                name: self.getLayoutName(),
                panels: [
                    {
                        type: "main",
                        content: self._dependsView,
                        overflow: "hidden"
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

            self._dependsView.on("depends_view:onServiceOver", function () {
                self._onServiceOver.apply(self, arguments);
            });

            self._dependsView.on("depends_view:onServiceOut", function () {
                self._onServiceOut.apply(self, arguments);
            });

            self._dependsView.on("depends_view:onProcessOver", function () {
                self._onProcessOver.apply(self, arguments);
            });

            self._dependsView.on("depends_view:onProcessOut", function () {
                self._onProcessOut.apply(self, arguments);
            });

            self._dependsView.on("depends_view:onProcessClick", function () {
                self._onProcessClick.apply(self, arguments);
            });

            self._dependsView.on("depends_view:onServiceClick", function () {
                self._onServiceClick.apply(self, arguments);
            });
        }
    });
});