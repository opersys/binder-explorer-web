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

    return Backbone.View.extend({

        // Sorted by service name.
        _services: [],

        _refreshSidebar: function () {
            var self = this;

            self._services = _.sortBy(self._services, function (name) {
                var binderService = self._binderServices.get(name);
                return binderService.getCaption();
            });

            w2ui["sidebar"].nodes[0].nodes = _.map(self._services, function (name) {
                return {
                    id: name,
                    text: self._binderServices.get(name).getCaption(),
                    nodes: []
                }
            });

            w2ui["sidebar"].refresh();
        },

        _onServiceAdded: function (binderService) {
            var self = this;

            self._services.push(binderService.get("name"));
            self._refreshSidebar();
        },

        _onServiceProcessChanged: function (binderService) {
        },

        _onServiceRemoved: function (binderService) {

        },

        _onServiceListClick: function (event) {
            var self = this, binderService;

            binderService = self._binderServices.get(event.target);

            if (binderService != null)
                self.trigger("viewServices:selected", binderService);
        },

        select: function (binderService) {
             w2ui["sidebar"].select(binderService.get("pid"));
        },

        initialize: function (opts) {
            var self = this;

            self.$el.w2sidebar({
                name: 'sidebar',
                img: null,
                nodes: [
                    {
                        id: "services", text: "Services", expanded: true, nodes: []
                    }
                ]
            });

            self._binderServices = opts.binderServices;

            self._binderServices.on("add", function () {
                self._onServiceAdded.apply(self, arguments);
            });

            self._binderServices.on("change:process", function (model, coll, opts) {
                self._onServiceProcessChanged.apply(self, arguments);
            });

            self._binderServices.on("remove", function (model, coll, opts) {
            });

            w2ui["sidebar"].on("click", function () {
                self._onServiceListClick.apply(self, arguments);
            });
        }
    });
});