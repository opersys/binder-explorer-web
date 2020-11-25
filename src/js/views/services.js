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
    var Backbone = require("backbone");
    var w2ui = require("w2ui");

    /*
     * Events:
     *   services_view:selected([selectedServices]):
     */

    return Backbone.View.extend({

        // Sorted by service name.
        _services: [],

        _selectedServices: null,

        _refreshSidebar: function () {
            var self = this;

            if (!w2ui["sidebar"]) return;

            self._services = _.sortBy(self._services, function (name) {
                var binderService = self._binderServices.get(name);
                return binderService.get("name");
            });

            self._processes = _.sortBy(self._processes, function (pid) {
                var binderProcess = self._binderProcesses.get(pid);
                return binderProcess.get("name")
            });

            w2ui["sidebar"].nodes[0].nodes = _.map(self._services, function (name) {
                return {
                    id: name,
                    text: self._binderServices.get(name).get("name"),
                    nodes: [],
                    type: "service"
                };
            });

            w2ui["sidebar"].nodes[1].nodes = _.map(self._processes, function (pid) {
                return {
                    id: pid,
                    text: self._binderProcesses.get(pid).get("pid"),
                    nodes: [],
                    type: "process"
                }
            });

            w2ui["sidebar"].refresh();
        },

        _onServiceAdded: function (binderService) {
            var self = this;

            if (binderService)
                self._services.push(binderService.get("name"));

            self._refreshSidebar();
        },

        _onProcessAdded: function (binderProcess) {
            var self = this;

            if (binderProcess) {
                self._processes.push(binderProcess.get("pid"));

                binderProcess.get("process").on("change", function (model, coll, opts) {
                    self._onProcessChanged.apply(self, arguments);
                });
            }

            self._refreshSidebar();
        },

        _onProcessRemoved: function (binderProcess) {
            var self = this;

            self._processes = _.reject(self._processes, function (binderProcessPid) {
                return binderProcessPid === binderProcess.get("pid");
            });

            self._refreshSidebar();
        },

        /*
         * When processs are added to the main collection, they only get their PID.
         * We have to subscribe to their change to have more details such as the
         * process true name.
         */
        _onProcessChanged: function (process) {
            var self = this, node;

            node = w2ui["sidebar"].get("processes", process.get("pid"));
            node.text = process.get("pid") + ": " + process.get("cmdline")[0];
            w2ui["sidebar"].set("processes", process.get("pid"), node);

            w2ui["sidebar"].refresh();
        },

        _onServiceListClick: function (event) {
            var self = this;

            if (self._selectedService) {
                self.trigger("services_view:unselected", self._selectedService.type, self._selectedService.id);
                self._selectedServices = null;
            }

            self._selectedService = {};
            self._selectedService.type = event.node.type;
            self._selectedService.id = event.node.id;
            self.trigger("services_view:selected", self._selectedService.type, self._selectedService.id);
        },

        select: function (type, id) {
            var self = this;

            if (self._selectedService && self._selectedService.id != id)
                self.unselect(type, id);

            w2ui["sidebar"].select(id);
        },

        unselect: function (type, id) {
            var self = this;

            w2ui["sidebar"].unselect(id);
            self._selectedService = null;
        },

        render: function () {
            var self = this;

            // self.box is set by w2ui.
            self.$el = $(self.box);

            self.$el.w2sidebar({
                name: 'sidebar',
                img: null,
                nodes: [
                    { id: "services", text: "Services", expanded: true, nodes: [], img: "icon-folder" },
                    { id: "processes", text: "Processes", expanded: true, nodes: [], img: "icon-folder" }
                ]
            });

            self.$el.bind("resize", self._onResize);

            w2ui["sidebar"].on("click", function () {
                self._onServiceListClick.apply(self, arguments);
            });

            // Add any pending services.
            self._onServiceAdded();
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;

            self._binderServices.on("add", function () {
                self._onServiceAdded.apply(self, arguments);
            });

            self._binderServices.on("services:newnode", function () {
                self._onServiceNodeAdded.apply(self, arguments);
            });

            self._binderProcesses.on("add", function () {
                self._onProcessAdded.apply(self, arguments);
            });

            self._binderProcesses.on("remove", function () {
                self._onProcessRemoved.apply(self, arguments);
            });
        }
    });
});
