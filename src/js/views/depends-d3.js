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
    var Function = require("models/Function");
    var d3 = require("d3/d3");
    var $ = require("jquery");
    var _ = require("underscore");

    return Backbone.View.extend({

        // Center of focus.
        _foci: {},

        // Services that were added before render was called.
        _waitingServices: [],

        _onZoom: function () {
            var self = this;
            self._svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        },

        _graphNodeFocusSet: function (binderService) {
            var self = this, updateGroups = false;

            if (!self._foci[binderService.get("pid")]) {
                console.log("Creating a new center of focus for PID " + binderService.get("pid"));

                var nbFoci = _.values(self._foci).length + 1;
                var angleFoci = 2 * Math.PI / nbFoci;
                var currentAngleFoci = 0.0;
                var radius = $(self.el).height() / 2;

                self._foci[binderService.get("pid")] = {
                    pid: binderService.get("pid"),
                    nodes: [binderService]
                };

                _.values(self._foci).forEach(function (focus, i) {
                    focus.fx = radius * Math.cos(currentAngleFoci);
                    focus.fy = radius * Math.sin(currentAngleFoci);
                    currentAngleFoci += angleFoci;

                    console.log("Focus center for PID " + focus.pid + "-> X: " + focus.fx + " Y: " + focus.fy);
                });

                updateGroups = true;
            }
            else {
                self._foci[binderService.get("pid")].nodes.push(binderService);
                updateGroups = true;
            }

            if (updateGroups) {
                self._groups = d3.nest()
                    .key(function(d) { return d.service.get("pid"); })
                    .entries(self._force.nodes());
            }
        },

        _addGraphNode: function (binderService) {
            var self = this;

            // Might be called before rendering is done!
            if (!self._force) {
                self._waitingServices.push(binderService);
                return;
            }

            if (binderService)
                self._waitingServices.push(binderService);

            while (self._waitingServices.length > 0) {
                var nodeData, node, nodeGroup, bs = self._waitingServices.pop();

                self.cx = 0.5 * Math.cos(self.cangle);
                self.cy = 0.5 * Math.sin(self.cangle);
                self.cangle += self.angle;

                self._force.nodes().push({
                    x: self.cx,
                    y: self.cy,
                    service: bs
                });

                node = self._svg
                    .selectAll(".node")
                    .data(self._force.nodes())
                    .enter();

                nodeGroup = node
                    .append("g")
                    .attr("class", "node")
                    .call(self._force.drag);

                nodeGroup
                    .append("circle")
                     .attr("r", 5);
                nodeGroup
                    .append("text")
                     .attr("dx", 12)
                     .attr("dy", ".35em")
                     .text(function (d) { return d.service.get("name"); });

                self._force.start();
            }
        },

        _addGraphEdge: function (fromBinderService, toBinderService) {
            var self = this, link;

            self._force.links().push({
                source: fromBinderService,
                target: toBinderService
            });

            link = self._svg
                .selectAll(".link")
                .data(self._force.links());

            link
                .enter()
                .insert("line", ".node")
                .attr("class", "link");

            self._force.start();
        },

        _tick: function (e) {
            var self = this;
            var k = .1 * e.alpha;

            // Push nodes toward their designated focus.
            self._force.nodes().forEach(function(o) {
                var pid = o.service.get("pid");

                if (self._foci[pid]) {
                    o.y += (self._foci[pid].fy - o.y) * k;
                    o.x += (self._foci[pid].fx - o.x) * k;
                }
            });

            if (self._groups) {
                self._svg
                    .selectAll("path")
                    .data(self._groups)
                     .attr("d", self._groupPath)
                    .enter()
                     .append("path")
                      .style("fill", "rgb(255, 0, 0)")
                      .style("stroke", "rgb(255, 0, 0)")
                      .style("stroke-linejoin", "round")
                      .style("stroke-width", "40px")
                      .style("opacity", .2)
                      .attr("d", self._groupPath);
            }

            self._svg
                .selectAll(".node")
                .attr("transform", function (d) {
                    d.service.set({ x: d.x, y: d.y });
                    return "translate(" + d.x + "," + d.y + ")";
                });

            self._svg
                .selectAll(".link")
                .attr("x1", function (d) { return d.source.get("x"); })
                .attr("y1", function (d) { return d.source.get("y"); })
                .attr("x2", function (d) { return d.target.get("x"); })
                .attr("y2", function (d) { return d.target.get("y"); });
        },

        select: function (selectedBS) {

        },

        unselect: function (unselectedBS) {

        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._functions = opts.functions;

            self._binderServices.on("add", function (model) {
                self._addGraphNode(model);
            });

            self._binderServices.on("change", function (model, value, options) {
            });

            self._binderServices.on("change:pid", function (model) {
                self._graphNodeFocusSet(model);
            });

            self._binderServices.on("services:newlink", function (fromBinderService, toBinderService) {
                self._addGraphEdge(fromBinderService, toBinderService);
            });
        },

        resize: function () {
            var self = this;

        },

        render: function () {
            var self = this;

            console.log("depends-d3.js object: render called");

            self.el = self.box;

            self._force = d3.layout.force()
                .size([$(self.el).width(), $(self.el).height()])
                .nodes([])
                .links([])
                .charge(function (d) {
                    // The -2 multiplier was tuned through tests.
                    if (d.service.get("refs") != null)
                        return -1.5 * d.service.get("refs").length;
                    else
                        return -30;
                })
                .on("tick", function () { self._tick.apply(self, arguments) })
                .start();

            self._groupPath = function(d) {
                var hull = d3.geom.hull(d.values.map(function(d) { return [d.x, d.y]; }));

                if (!hull || hull.length == 0)
                    return null;

                return "M" + hull.join("L") + "Z";
            };

            // Add the root SVG element
            self._svg = d3.select(self.el)
                .append("svg")
                .attr("width", $(self.el).width())
                .attr("height", $(self.el).height())
                .append("g")
                 .call(d3.behavior.zoom()
                     .on("zoom", function () {
                         self._onZoom.apply(self, arguments);
                     }))
                 .append("g");
        }
    });
});