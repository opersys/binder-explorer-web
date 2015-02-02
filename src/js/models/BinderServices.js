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
     *   services:newpid(pid):
     *      fired when a new container PID is added.
     *   services:newnode(node):
     *      fired when a new node ID is found.
     *   services:newlink(fromService, toService):
     *      fired when a new outbound link from a node to another node is added
     */

    return Backbone.Collection.extend({
        url: "/binder",
        model: BinderService,

        _serviceByNode: {},
        _servicesByPid: {},

        // List of refs that reference unknown nodes.
        _pendingRefs: {},

        findByNodeId: function (node) {
            return this._serviceByNode[node];
        },

        getServicesInPid: function (pid) {
            return this._servicesByPid[pid];
        },

        getAllServicesPid: function () {
            return _.keys(this._servicesByPid);
        },

        _processRefs: function (binderService) {
            var self = this;

            // Iterate through the services to add the relations.
            _.each(binderService.get("refs"), function (ref) {
                var outboundLinksTo,
                    inboundLinksTo,
                    targetService = self.findByNodeId(ref.node);

                // Links to the service_manager (node 1) are excluded.
                if (ref.node == 1) return;

                // If the target doesn't exists, make the ref pending.
                if (!targetService) {
                    if (!self._pendingRefs[ref.node])
                        self._pendingRefs[ref.node] = [];

                    self._pendingRefs[ref.node].push(binderService);

                    return;
                }

                if (!(outboundLinksTo = binderService.get("outboundLinks")))
                    outboundLinksTo = new Backbone.Collection();

                if (!(inboundLinksTo = binderService.get("inboundLinks")))
                    inboundLinksTo = new Backbone.Collection();

                if (!outboundLinksTo.get(targetService.get("name"))) {
                    outboundLinksTo.add(targetService);
                    self.trigger("services:newlink", binderService, targetService);
                }

                if (!inboundLinksTo.get(binderService.get("name")))
                    inboundLinksTo.add(binderService);

                binderService.set("outboundLinks", outboundLinksTo);
                binderService.set("inboundLinks", inboundLinksTo);
            });
        },

        // Called when the references for a service are loaded.
        _onServiceRefs: function (binderService) {
            var self = this, pendingRefs;

            if (pendingRefs = self._pendingRefs[binderService.get("node")]) {
                // Clear the pendings refs for this node, they will be re-added
                // by processRefs if they are still pending.
                self._pendingRefs[binderService.get("node")] = [];

                _.each(pendingRefs, function (binderService) {
                    self._processRefs(binderService);
                });
            }

            self._processRefs(binderService);
        },

        // Called when the nodes for a service are loaded.
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

            self.on("change:nodes", function (binderService) {
                self._onServiceNodes.apply(self, [binderService]);
            });

            self.on("change:refs", function (binderService) {
                self._onServiceRefs.apply(self, [binderService]);
            });

            self.on("services:newlink", function (fromService, toService) {
                //console.log("Link from: " + fromService.get("name") + " to " + toService.get("name"));
            });
        }
    });
});
