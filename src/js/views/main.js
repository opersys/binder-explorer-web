/*
 * Copyright (C) 2015-2020 Opersys inc.
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
    "use strict";

    var Backbone = require("backbone");
    var w2ui = require("w2ui");
    var io = require("socketio");
    var WSHandler = require("wshandler");
    var Operation = require("models/Operation");
    var DependsView = require("views/depends-d3-atom");
    var ServiceTooltip = require("views/tooltip-service");
    var ProcessTooltip = require("views/tooltip-process");
    var ProcessServiceTooltip = require("views/tooltip-procservice");
    var ServiceDialog = require("views/dialog-service");
    var ProcessDialog = require("views/dialog-process");

    return Backbone.View.extend({

        _dependsView: null,
        _serviceTooltip: null,
        _processTooltip: null,
        _procServiceTooltip: null,

        getLayoutName: function () { return "layout"; },

        _onProcServiceOver: function (tip, procService) {
            this._procServiceTooltip = new ProcessServiceTooltip({
                tip: tip,
                procService: procService
            });
            this._procServiceTooltip.render();
        },

        _onProcServiceOut: function () {
            this._procServiceTooltip.hide();
        },

        _onServiceOver: function (tip, service) {
            this._serviceTooltip = new ServiceTooltip({
                tip: tip,
                service: service,
                services: this._binderServices,
                linkhandler: this._linkhandler
            });
            this._serviceTooltip.render();
        },

        _onServiceOut: function () {
            this._serviceTooltip.hide();
        },

        _onProcessOver: function (tip, process) {
            this._processTooltip = new ProcessTooltip({
                tip: tip,
                process: process
            });
            this._processTooltip.render();
        },

        _onProcessOut: function () {
            this._processTooltip.hide();
        },

        _onProcessClick: function (process) {
            this._processDialog = new ProcessDialog({
                process: process,
                processes: this._processes,
                linkhandler: this._linkhandler
            });
            this._processDialog.render();
        },

        _onServiceClick: function (service) {
            this._serviceDialog = new ServiceDialog({
                service: service,
                processes: this._processes,
                linkhandler: this._linkhandler
            });
            this._serviceDialog.render();
        },

        initialize: function (opts) {
            this._binders = opts.binders;
            this._operations = opts.operations;
            this._processes = opts.processes;
            this._linkhandler = opts.linkhandler;
            this._proclinkhandler = opts.proclinkhandler;

            this._dependsView = new DependsView({
                binders: this._binders,
                linkhandler: this._linkhandler,
                proclinkhandler: this._proclinkhandler,
                functions: this._functions,
                processes: this._processes
            });

            this._sock = io(location.host + "/", { transports: ["websocket"] });
            this._wsHandler = new WSHandler(this._sock, this._binders, this._processes);

            this.$el.w2layout({
                name: this.getLayoutName(),
                panels: [
                    {
                        type: "main",
                        content: this._dependsView,
                        overflow: "hidden"
                    }
                ],
            });

            this._dependsView.on("depends_view:onProcServiceOver", (tip, procService) => {
                this._onProcServiceOver(tip, procService);
            });

            this._dependsView.on("depends_view:onProcServiceOut", () => {
                this._onProcServiceOut();
            });

            this._dependsView.on("depends_view:onServiceOver", (tip, service) => {
                this._onServiceOver(tip, service);
            });

            this._dependsView.on("depends_view:onServiceOut", () => {
                this._onServiceOut();
            });

            this._dependsView.on("depends_view:onProcessOver", (tip, process) => {
                this._onProcessOver(tip, process);
            });

            this._dependsView.on("depends_view:onProcessOut", () => {
                this._onProcessOut();
            });

            this._dependsView.on("depends_view:onProcessClick", this._onProcessClick);
            this._dependsView.on("depends_view:onServiceClick", this._onServiceClick);
        }
    });
});
