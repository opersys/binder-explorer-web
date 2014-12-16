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
    var BinderService = require("models/BinderService");

    /*
     * Events:
     *   services:newpid(pid): called when a new container PID is added.
     *   services:newnode(node): called when a new node ID is found.
     */

    return Backbone.Collection.extend({
        url: "/binder",
        model: BinderService,
        _serviceByNode: {},
        _servicesByPid: {},

        findByNodeId: function (node) {
            return this._serviceByNode[node];
        },

        getServicesInPid: function (pid) {
            return this._servicesByPid[pid];
        },

        getAllServicesPid: function () {
            return _.keys(this._servicesByPid);
        },

        _onServiceNodes: function (binderService) {
            var self = this;

            if (!self._servicesByPid[binderService.get("pid")]) {
                self._servicesByPid[binderService.get("pid")] = [];
                self.trigger("services:newpid", binderService.get("pid"));
            }

            _.each(binderService.get("nodes"), function (node) {
                self._serviceByNode[node.id] = binderService;
                self.trigger("services:newnode", node.id);
            });

            self._servicesByPid[binderService.get("pid")].push(binderService);
        },

        initialize: function () {
            var self = this;

            self.on("change:nodes", function (model) {
                self._onServiceNodes.apply(self, [model]);
            });
        }
    });
});
