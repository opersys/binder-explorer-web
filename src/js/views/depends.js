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
    var BinderServices = require("models/BinderServices");
    var sigma = require("sigma");
    var $ = require("jquery");
    var _ = require("underscore");

    // Sigma plugins. Just needs to be imported.
    require("sigma.layout.forceAtlast2");
    require("sigma.plugins.dragNodes");
    require("sigma.plugins.customEdgeShapes");

    // JQuery plugins
    require("jquery-timer/jquery.timer");

    return Backbone.View.extend({

        // Node ID to service object
        _nodeToService: null,

        // Edge ID counter.
        _edgeId: 0,

        // Node placement.
        cx: null,
        cy: null,
        cangle: 0.0,
        angle: Math.PI * 2 / 100,

        _onServicesSynced: function (coll, resp, options) {
            this._renderGraph();
        },

        _addGraphNode: function (binderService) {
            var self = this;

            self.cx = 0.5 * Math.cos(self.cangle);
            self.cy = 0.5 * Math.sin(self.cangle);
            self.cangle += self.angle;

            self._s.graph.addNode({
                id: binderService.get("name"),
                label: binderService.get("name"),
                x: self.cx,
                y: self.cy,
                size: 1
            });
        },

        _updateGraphEdges: function () {
            var self = this;

            // Iterate through the services to add the relations.
            self._binderServices.each(function (binderService) {
                _.each(binderService.get("refs"), function (ref) {
                    var target = self._binderServices.findByNodeId(ref.node);

                    if (ref.node != 1 && target && (binderService.get("name") != target.get("name"))) {
                        var edgeName = binderService.get("name") + "-" + target.get("name");

                        if (!self._s.graph.edges(edgeName)) {
                            console.log("Linking " + binderService.get("name") + " to " + target.get("name"));

                            self._s.graph.addEdge({
                                id: edgeName,
                                source: binderService.get("name"),
                                target: target.get("name"),
                                size: 1,
                                type: "arrow"
                            });
                        }
                    }
                });
            });

            if (!self._s.isForceAtlas2Running()) {
                // FIXME: Semi-random parameters.
                // The documentation on the parameters for the force layout
                // in sigma is pretty sparse so playing with them once in a while
                // could be good.
                self._s.startForceAtlas2({
                    linLogMode: true,
                    gravity: 2,
                    adjustSizes: true,
                    strongGravityMode: true,
                    //slowDown: 1,
                    edgeWeightInfluence: 100,
                    //outboundAttractionDistribution: false,
                    worker: true,
                    barnesHutOptimize: true
                });

                self.timer.play();
            }
        },

        _onNodeClicked: function (event) {
            var self = this;
            var binderService = self._binderServices.get(event.data.node.id);

            if (binderService != null)
                self.trigger("viewDepends:selected", binderService);
        },

        select: function (binderService) {
            var self = this, node;

            // Unselect any previously selected nodes.
            self._s.graph.nodes().forEach(function (node) {
                node.color = self._s.settings("defaultNodeColor");
            });

            node = self._s.graph.nodes(binderService.get("name"));
            if (node != null)
                node.color = "red";

            self._s.graph.edges().forEach(function (edge) {
                if (edge.source == binderService.get("name") || edge.target == binderService.get("name")) {
                    edge.color = "red";
                    edge.size = self._s.settings("maxEdgeSize");
                } else {
                    edge.color = self._s.settings("defaultEdgeColor");
                    edge.size = self._s.settings("minEdgeSize");
                }
            });

            self._s.refresh();
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;

            self.timer = $.timer(function () {
                self._s.stopForceAtlas2();
            });
            self.timer.set({ time: 15000 });

            // Let's first initialize sigma:
            self._s = new sigma({
                renderer: {
                    container: this.el,
                    type: "canvas"
                },

                settings: {
                    labelThreshold: 2,
                    doubleClickEnabled: false,
                    defaultEdgeColor: "#ccc",
                    defaultNodeColor: "black",
                    defaultEdgeArrow: "target",
                    edgeColor: "edge",
                    minEdgeSize: 1,
                    maxEdgeSize: 2,
                    minNodeSize: 1,
                    maxNodeSize: 10,
                    enableHovering: true,
                    minArrowSize: 1,
                    verbose: true
                }
            });

            sigma.plugins.dragNodes(self._s, self._s.renderers[0]);

            self._binderServices.on("add", function (model) {
                self._addGraphNode(model);
            });

            self._binderServices.on("change", function (model, value, options) {
            });

            self._binderServices.on("change:refs", function () {
                self._updateGraphEdges();
            });

            self._s.bind("clickNode", function (node) {
                self._onNodeClicked.apply(self, arguments);
            });

            self.on("viewDepends:selected", function (binderProc) {
                self.select(binderProc);
            });
        },

        resize: function () {
            this._s.renderers[0].resize();
            this._s.refresh();
        },

        render: function () {
            this._s.refresh();
        }
    });
});