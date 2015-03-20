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
    var w2ui = require("w2ui");

    /*
     * Events:
     *   services_view:selected([selectedServices]):
     */

    return Backbone.View.extend({

        // Sorted by service name.
        _services: [],

        _selectedServices: [],

        _refreshSidebar: function () {
            var self = this;

            if (!w2ui["sidebar"]) return;

            self._services = _.sortBy(self._services, function (name) {
                var binderService = self._binderServices.get(name);
                return binderService.get("name");
            });

            w2ui["sidebar"].nodes[0].nodes = _.map(self._services, function (name) {
                return {
                    id: name,
                    text: self._binderServices.get(name).get("name"),
                    nodes: [],
                    type: "service"
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

        // Add services to the right PID.
        _onServiceNodeAdded: function (node) {
            var self = this, targetSbNode;
            var binderService = self._binderServices.findByNodeId(node);

            if (!self._s) return;

            targetSbNode = _.findWhere(w2ui["sidebar"].nodes[1].nodes, { id: binderService.get("pid") });

            if (!_.findWhere(targetSbNode.nodes, { id: binderService.get("name") })) {
                targetSbNode.nodes.push({
                    id: binderService.get("name"),
                    text: binderService.get("name"),
                    nodes: [],
                    type: "service"
                });

                targetSbNode.nodes = _.sortBy(targetSbNode.nodes, function (sbNode) {
                    return sbNode.id;
                });

                w2ui["sidebar"].refresh();
            }
        },

        // Add the PID to the list.
        _onServicePidAdded: function (pid) {
            if (!w2ui["sidebar"]) return;

            w2ui["sidebar"].nodes[1].nodes.push({
                id: pid,
                text: pid,
                type: "pid",
                nodes: []
            });
            w2ui["sidebar"].nodes[1].nodes = _.sortBy(w2ui["sidebar"].nodes[1].nodes, function (sbNode) {
                return sbNode.id;
            });

            w2ui["sidebar"].refresh();
        },

        _onServiceListClick: function (event) {
            var self = this;

            if (self._selectedServices.length > 0) {
                self.trigger("services_view:unselected", self._selectedServices);
                self._selectedServices = [];
            }

            switch (event.node.type) {
                case "pid":
                    self._selectedServices = self._binderServices.getServicesInPid(event.node.id);
                    break;

                case "service":
                    self._selectedServices = [self._binderServices.get(event.target)];
                    break;
            }

            if (self._selectedServices.length > 0)
                self.trigger("services_view:selected", self._selectedServices);
        },

        select: function (binderService) {
             w2ui["sidebar"].select(binderService.get("pid"));
        },

        render: function () {
            var self = this;

            console.log("services.js object: render called");

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

            self._binderServices.on("add", function () {
                self._onServiceAdded.apply(self, arguments);
            });

            self._binderServices.on("services:newpid", function () {
                self._onServicePidAdded.apply(self, arguments);
            });

            self._binderServices.on("services:newnode", function () {
                self._onServiceNodeAdded.apply(self, arguments);
            });

            self._binderServices.on("change:process", function (model, coll, opts) {
                self._onServiceProcessChanged.apply(self, arguments);
            });

            self._binderServices.on("remove", function (model, coll, opts) {
            });
        }
    });
});