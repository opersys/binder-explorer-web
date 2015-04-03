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
    var BinderServices = require("models/BinderServices");
    var Operation = require("models/Operation");
    var d3 = require("d3/d3");
    var $ = require("jquery");
    var _ = require("underscore");

    return Backbone.View.extend({

        _tick: function (e) {
            var self = this, rs, ls;

            function gravityCenter(d, alpha) {
                d.y += (self._centerY - d.y) * alpha;
                d.x += (self._centerX - d.x) * alpha;
            }

            self._node
                .each(function (d) {
                    if (d.collection == self._binderProcesses)
                        gravityCenter(d, 0.2 * e.alpha);
                    else {
                        d.x = d.pos.x;
                        d.y = d.pos.y;
                        d.t = d.pos.t;
                    }
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + ","  + d.y +")";
                });

            self._link
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._functions = opts.functions;
        },

        resize: function () {},

        renderGraph: function () {
            var self = this;

            self._nodes = self._binderServices.models.concat(self._binderProcesses.models);
            self._links = [];

            // Calculate the links.
            self._binderProcesses.each(function (n) {
                var srefs = n.getServiceRefs();

                srefs.forEach(function (sr) {
                    self._links.push({
                        source: n,
                        target: sr
                    });
                });
            });

            self._nodes.forEach(function(o) {
                o.x = (2 * (Math.random() - 0.5)) * self._radius + self._centerX;
                o.y = (2 * (Math.random() - 0.5)) * self._radius + self._centerY;
                o.radius = 5;
            });

            self._circlePositions = self._prepareCircle(self._binderServices.models.length);

            self._allNodes = self._nodeBox.selectAll(".node").data(self._nodes);
            self._node = self._allNodes
                .enter()
                .append("g")
                .on("mouseover", function (d, i) {
                    d3.select(this)
                        .select("circle")
                        .attr("fill", "red");

                    if (d.collection == self._binderProcesses)
                        d3.selectAll(".link.source-" + d.id)
                            .attr("stroke", "red")
                            .attr("stroke-width", 3);
                    else if (d.collection == self._binderServices)
                        d3.selectAll(".link.target-" + d.id)
                            .attr("stroke", "red")
                            .attr("stroke-width", 3);
                })
                .on("mouseout", function (d, i) {
                    d3.select(this)
                        .select("circle")
                        .attr("fill", "black");

                    if (d.collection == self._binderProcesses)
                        d3.selectAll(".link.source-" + d.id)
                            .attr("stroke", "lightgray")
                            .attr("stroke-width", "1");
                    else if (d.collection == self._binderServices)
                        d3.selectAll(".link.target-" + d.id)
                            .attr("stroke", "lightgray")
                            .attr("stroke-width", "1");
                });

            self._node
                .each(function (d) {
                    if (d.collection == self._binderServices)
                        d.pos = self._circlePositions.pop();

                    if (d.pos) {
                        d3.select(this)
                            .append("text")
                            .attr("text-anchor", function (d) {
                                if (d.pos.t == "left") return "end";
                                if (d.pos.t == "right") return "start";
                            })
                            .attr("transform", function (d) {
                                var rot = 0.5 * d.pos.a * 180 / Math.PI;

                                if (d.pos.t == "left")
                                    return "translate(-" + (d.radius + 5) + ", " + d.radius + ")";
                                if (d.pos.t == "right")
                                    return "translate(" + (d.radius + 5) + ", " + d.radius + ")";
                            })
                            .text(function (d) {
                                return d.get("name");
                            });

                        d3.select(this)
                            .append("circle")
                            .attr("r", function (d) {
                                return d.radius;
                            });
                    }

                    if (!d.pos) {
                        if (d.get("process").get("cmdline")[0].indexOf(".") == -1) {
                            d3.select(this)
                                .append("text")
                                .attr("font-weight", "bold")
                                .attr("transform", function (d) {
                                    return "translate(" + d.radius + "," + d.radius + ")";
                                })
                                .text(function (d) {
                                    return d.get("pid");
                                });

                            d3.select(this)
                                .append("circle")
                                .attr("r", function (d) {
                                    return d.radius;
                                });
                        } else {
                            d3.select(this)
                                .append("image")
                                .attr("width", 24)
                                .attr("height", 24)
                                .attr("transform", function (d) {
                                    return "translate(-15, -15)";
                                })
                                .attr("xlink:xlink:href", function (d) {
                                    return "http://localhost:3000/icon/" + d.get("process").get("cmdline")[0];
                                });
                        }
                    }
                });

            self._allLinks = self._linkBox.selectAll(".link").data(self._links);
            self._link = self._allLinks.enter()
                .append("line")
                .attr("class", function(d) {
                    return "link source-" + d.source.id + " target-" + d.target.id;
                })
                .attr("stroke", "lightgray");

            self._force
                .nodes(self._nodes)
                .start();
        },

        //
        _prepareCircle: function (n) {
            var self = this;
            var cPos = [], pos;
            var cAngle = 0;
            var incAngle = ((2 * Math.PI) - (Math.PI / 2)) / n;

            for (var i = 0; i < n; i++) {
                pos = {
                    x: self._radius * Math.cos(cAngle) + self._centerX,
                    y: self._radius * Math.sin(cAngle) + self._centerY,
                    t: cAngle > (0.625 * Math.PI) && cAngle < (1.375 * Math.PI) ? "left" : "right",
                    a: cAngle
                };

                cPos.push(pos);

                cAngle += incAngle;

                if ((cAngle >= (0.375 * Math.PI) && cAngle <= (0.625 * Math.PI)) ||
                    (cAngle > (1.375 * Math.PI) && cAngle <= (1.625 * Math.PI)))
                    cAngle += (Math.PI * 0.25);
            }

            return cPos;
        },

        render: function () {
            var self = this, w, h;

            self.el = self.box;

            w = $(self.box).width();
            h = $(self.box).height();
            r = $(self.box).width() * 0.25;

            self._centerX = w / 2;
            self._centerY = h / 2;
            self._radius = r;

            self._svg = d3.select(self.box)
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("xmlns", "http://www.w3.org/2000/svg");
            self._linkBox = self._svg.append("g");
            self._nodeBox = self._svg.append("g");

            self._force = d3.layout.force()
                .charge(-250)
                .gravity(0)
                .on("tick", function (e) { self._tick.apply(self, [e]); });
        }
    });
});