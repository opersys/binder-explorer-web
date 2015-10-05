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
    "use strict";

    var Backbone = require("backbone");
    var BinderServices = require("models/BinderServices");
    var Operation = require("models/Operation");
    var d3 = require("d3");
    var $ = require("jquery");
    var _ = require("underscore");
    d3.tip = require("d3-tip/index");

    return Backbone.View.extend({

        selectedItem: null,

        _fetchIcon: function (d) {
            var self = this;

            $.ajax("http://" + window.location.host + "/icon/" + d.get("process").get("cmdline")[0], {
                type: "HEAD",
                success: function (data, status, jqXHR) {
                    console.log("Icon found for " + d.get("pid"));

                    // Clear the selection elements.
                    $("#pid_" + d.id + " circle.node").remove();

                    // Replace the element by an image.
                    d3.select("#pid_" + d.id)
                        .append("image")
                        .attr("width", 24)
                        .attr("height", 24)
                        .attr("transform", function (d) {
                            return "translate(-15, -15)";
                        })
                        .attr("xlink:xlink:href", function (d) {
                            return "http://" + window.location.host + "/icon/" + d.get("process").get("cmdline")[0];
                        })
                        .on("mouseover", function (data) {
                            self._onItemOver(this, data);
                        })
                        .on("mouseout", function (data) {
                            self._onItemOut(this, data);
                        })
                        .on("click", function (data) {
                            self._onItemClick(this, data);
                        });
                },
                error: function () {
                    console.log("No icon found for " + d.get("pid"));
                }
            });
        },

        _tick: function (e) {
            var self = this;

            function gravityCenter(d, alpha) {
                d.y += (self._centerY - d.y) * alpha;
                d.x += (self._centerX - d.x) * alpha;
            }

            d3.selectAll(".node.process")
                .each(function (d) {
                    gravityCenter(d, 0.2 * e.alpha);
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + ","  + d.y +")";
                });

            d3.selectAll(".link")
                .attr("d", function (l) { return self._linkPath.apply(self, [l]); });

            d3.selectAll(".userlink")
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
        },

        _moveTo: function (sourceSel, targetSel) {
            var el = $(sourceSel).remove();
            $(targetSel).append(el);
        },

        _onItemOut: function (target, data) {
            var self = this;

            d3.select(target).select("circle").classed({"hover": false});

            if (data.collection === self._binderProcesses) {
                self._moveTo(".link.source-" + data.getDomId(), ".linkBox.links");
                self._moveTo(".userlink.source-" + data.getDomId(), ".linkBox.userLinks");
                self._moveTo(".userlink.target-" + data.getDomId(), ".linkBox.userLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed({"hover": false});
                d3.selectAll(".userlink.source-" + data.getDomId()).classed({"hover": false});
                d3.selectAll(".userlink.target-" + data.getDomId()).classed({"hover": false});

                self.trigger("depends_view:onProcessOut", self._tip, data);
            }
            else if (data.collection === self._binderServices) {
                self._moveTo(".link.target-" + data.getDomId(), ".linkBox.links");
                d3.selectAll(".link.target-" + data.getDomId()).classed({"hover": false});

                self.trigger("depends_view:onServiceOut", self._tip, data);
            }

            self._tip.hide(data);
        },

        _onItemOver: function (target, data) {
            var self = this;

            d3.select(target).select("circle").classed({"hover": true});

            if (data.collection === self._binderProcesses) {
                self._moveTo(".link.source-" + data.getDomId(), ".linkBox.selectedLinks");
                self._moveTo(".userlink.source-" + data.getDomId(), ".linkBox.selectedLinks");
                self._moveTo(".userlink.target-" + data.getDomId(), ".linkBox.selectedLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed({"hover": true});
                d3.selectAll(".userlink.source-" + data.getDomId()).classed({"hover": true});
                d3.selectAll(".userlink.target-" + data.getDomId()).classed({"hover": true});

                self.trigger("depends_view:onProcessOver", self._tip, data);
            }
            else if (data.collection === self._binderServices) {
                self._moveTo(".link.target-" + data.getDomId(), ".linkBox.selectedLinks");
                d3.selectAll(".link.target-" + data.getDomId()).classed({"hover": true});

                self.trigger("depends_view:onServiceOver", self._tip, data);
            }
        },

        _onItemClick: function (target, data) {
            var self = this;

            if (data.collection === self._binderProcesses) {
                self.trigger("depends_view:onProcessClick", data);
            } else if (data.collection === self._binderServices) {
                self.trigger("depends_view:onServiceClick", data);
            }
        },

        resize: function () {

        },

        _onNewProcessService: function (userService) {
            var self = this;
            var processG, processGServ,
                newUserServices, upUserServices, obServ,
                angle, cangle, sangle;
            var iserv; // List of interesting services.
            var servs; // All services for this process.

            processG = d3.select("#pid_" + userService.pid);
            processGServ = processG.selectAll(".pid_" + userService.pid + "_services");
            obServ = processG.selectAll(".pid_" + userService.pid + " .service_orbit");
            servs = self._binderProcesses.get(userService.pid).get("services");

            // Don't render self-referential services that have no other client
            // but their own parent process.
            iserv = _.reject(servs, function (s) {
                return s.clients.length === 1 && s.clients[0] === s.pid;
            });

            // If iserv is empty, it means there is no exposed service to render.
            if (iserv.length === 0) return;

            angle = 270 / iserv.length + 1;
            cangle = 45;
            sangle = [];

            for (var i = 0; i < iserv.length; i++) {
                sangle.push(cangle += angle);
            }

            upUserServices = processGServ.data(iserv, function (d) { return d.intent; });
            newUserServices = upUserServices.enter();

            // Add the orbit if there is not one already.
            if (obServ.empty()) {
                processG
                    .append("circle")
                    .attr("class", "service_orbit")
                    .attr("r", 40);
            }

            newUserServices
                .append("g")
                .attr("class", "pid_" + userService.pid + "_services")
                .append("circle")
                .attr("class", "service")
                .attr("r", "5");

            upUserServices
                .attr("transform", function (d) {
                    d.angle = sangle.pop();
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                });

            self._force.start();
        },

        _onRemovedProcessService: function (userService) {
            var self = this;
            var processG, processGServ, obServ,
                upUserServices, goneUserServices,
                angle, cangle, sangle;
            var iserv;
            var servs;

            processG = d3.select("#pid_" + userService.pid);

            processGServ = processG.selectAll(".pid_" + userService.pid + "_services");
            servs = self._binderProcesses.get(userService.pid).get("services");

            // Don't render self-referential services that have no other client
            // but their own parent process.

            iserv = _.reject(servs, function (s) {
                return s.clients.length === 1 && s.clients[0] === s.pid;
            });

            // If iserv is empty, it means there is no exposed service to render.
            if (iserv.length === 0) return;

            angle = 270 / iserv.length + 1;
            cangle = 45;
            sangle = [];

            for (var i = 0; i < iserv.length; i++) {
                sangle.push(cangle += angle);
            }

            upUserServices = processGServ.data(iserv, function (d) { return d.intent; });

            // Clear the services that aren't there anymore.
            goneUserServices = upUserServices.exit();
            goneUserServices.remove();

            // Update the services that still exists.
            upUserServices
                .attr("transform", function (d) {
                    d.angle = sangle.pop();
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                });

            //self._updateProcessLinks();
            self._force.start();
        },

        _updateProcessLinks: function () {
            var self = this;
            var userLinks, goneLinks, newUserLinks, upUserLinks;

            userLinks = self._userLinkBox.selectAll(".userlink");
            upUserLinks = userLinks.data(function () {
                    return self._userServiceLinks.getLinks(function (from, to) {
                        if (!self._binderProcesses.get(from))
                            throw "PID " + from + " not found in processes";
                        if (!self._binderProcesses.get(to))
                            throw "PID " + to + " not found in processes";

                        return {
                            source: self._binderProcesses.get(from),
                            target: self._binderProcesses.get(to)
                        };
                    });
                },
                function (d) {
                    return "source-" + d.source.id + " target-" + d.target.id;
                }
            );

            newUserLinks = upUserLinks.enter();
            goneLinks = upUserLinks.exit();

            // Remove the links that are now missing
            goneLinks.remove();

            // Refresh all the existing links position.
            userLinks.attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });

            // Add the missing links.
            newUserLinks.append("line")
                .attr("class", function(d) {
                    return "userlink source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                })
                .attr("marker-end", "url(#arrowhead)")
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
        },

        _linkTmpl: _.template(
            "M <%= sx %> <%= sy %> " + "" +
            "C <%= sx %> <%= sy %> <%= tcx %> <%= tcy %> <%= tx %> <%= ty %>"),

        _linkPath: function (l) {
            var self = this;
            var sx, sy, tx, ty, tcx, tcy;

            if (l.source.x && l.source.y) {
                sx = l.source.x;
                sy = l.source.y;
            } else {
                sx = l.target.x;
                sy = l.target.y;
            }

            if (l.target.x && l.target.y) {
                tx = l.target.x;
                ty = l.target.y;
                tcx = l.target.cx;
                tcy = l.target.cy;
            } else {
                tx = l.source.x;
                ty = l.source.y;
                tcx = l.source.x;
                tcy = l.source.y;
            }

            return self._linkTmpl({
                sx: sx,
                sy: sy,
                tx: tx,
                ty: ty,
                tcx: tcx,
                tcy: tcy
            });
        },

        /**
         * Update the links between processes and services.
         */
        _updateServiceLinks: function () {
            var self = this;
            var links, goneLinks, newLinks, upLinks;

            links = self._linkBox.selectAll(".link");
            upLinks = links.data(function () {
                    return self._serviceLinks.getLinks(function (a, b) {
                        var serviceName, pid;

                        // At this place, because we use an undirected link class,
                        // both "a" and "b" can interchangeably be PID or service names.
                        // Because of difference in hashtable implementation, or some race
                        // condition I don't understand, Firefox will sometimes return
                        // service names as 'a', while Chrome never does. This handles the
                        // possibility that we received a service name instead of a PID as
                        // the first argument. I thought about other more elegant ways
                        // to fix this mixup but they all required changes to core elements
                        // of the code that would have ended up much more complicated than
                        // this hack.

                        if (parseInt(a)) {
                            pid = a;
                            serviceName = b;
                        } else {
                            pid = b;
                            serviceName = a;
                        }

                        if (!self._binderProcesses.get(pid))
                            throw "PID " + a + " not found in processes";
                        if (!self._binderServices.get(serviceName))
                            throw "Service " + b + " not found in services";

                        return {
                            source: self._binderProcesses.get(pid),
                            target: self._binderServices.get(serviceName)
                        };
                    });
                },
                function (d) {
                    return "source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                }
            );
            newLinks = upLinks.enter();
            goneLinks = upLinks.exit();

            // Remove the links that are now missing.
            goneLinks.remove();

            // Refresh all the existing links position.
            links.attr("d", function (l) { return self._linkPath.apply(self, [l]); });

            // Add the missing links.
            newLinks.append("path")
                .attr("class", function(d) {
                    return "link source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                })
                .attr("fill", "transparent")
                .attr("d", function (l) { return self._linkPath.apply(self, [l]); });
        },

        _onRemoveBinderProcess: function () {
            var self = this;
            var processNodes, goneProcessNodes;

            processNodes  = self._nodeBox.selectAll(".node.process").data(self._binderProcesses.models,
                function (model) {
                    return model.get("pid");
                }
            );

            // Remove the nodes that are gone.
            goneProcessNodes = processNodes.exit();

            goneProcessNodes.each(function (d) {
                d3.select("#pid_" + d.get("pid"))
                    .transition()
                    .duration(1000)
                    .style("opacity", 0)
                    .each("end", function (d) {
                        d3.select("#pid_" + d.get("pid")).remove();
                    });
            });

            self._force
                .nodes(self._binderProcesses.models)
                .start();
        },

        /**
         * Called when there is a new process added in the collection.
         */
        _onNewBinderProcess: function (binderProcess) {
            var self = this;
            var processNodes, newProcessNodes, newProcessNodeG;

            processNodes  = self._nodeBox.selectAll(".node.process").data(self._binderProcesses.models,
                function (model) {
                    return model.get("pid");
                }
            );

            // Add new process nodes.
            newProcessNodes = processNodes.enter();

            newProcessNodeG = newProcessNodes.append("g")
                .each(function (d) {
                    d.x = (2 * (Math.random() - 0.5)) * self._radius + self._centerX;
                    d.y = (2 * (Math.random() - 0.5)) * self._radius + self._centerY;
                    d.radius = 8;
                })
                .classed({"node": true, "process": true})
                .attr("transform", function (d) {
                    return "translate(" + d.x + ","  + d.y +")";
                })
                .attr("id", function (d) { return d.getDomId(); });

            newProcessNodeG
                .append("text")
                .attr("transform", function (d) {
                    return "translate(" + d.radius + ", " + d.radius + ")";
                })
                .text(function (d) {
                    return d.get("pid");
                });

            newProcessNodeG
                .append("circle")
                .on("mouseover", function (data, i) {
                    self._onItemOver(this, data);
                })
                .on("mouseout", function (data, i) {
                    self._onItemOut(this, data);
                })
                .on("click", function (data) {
                    self._onItemClick(this, data);
                })
                .attr("class", "node")
                .attr("r", function (d) {
                    return d.radius;
                })
                .each(function (newBinderProcess) {
                    // Schedule a timer to fetch the icon for this process.
                    setTimeout(function () {
                        self._fetchIcon(newBinderProcess);
                    }, 0);
                });

            self._force
                .nodes(self._binderProcesses.models)
                .start();
        },

        /**
         * Called when there is a new service added in the collection.
         */
        _onNewBinderService: function (binderService) {
            var self = this;
            var serviceNodes, newServiceNodes, newServiceNodeG;

            if (self._binderServices.length > self._circlePositions.length) {
                self._circlePositions = self._prepareCircle(self._binderServices.models.length);
            }

            serviceNodes  = self._nodeBox.selectAll(".node.service").data(self._binderServices.models);

            // Adjust the position of the currently placed services
            serviceNodes.attr("transform", function (d) {
                d.x = self._circlePositions[d.i].x;
                d.y = self._circlePositions[d.i].y;
                d.t = self._circlePositions[d.i].t;
                d.a = self._circlePositions[d.i].a;
                d.cx = self._circlePositions[d.i].cx;
                d.cy = self._circlePositions[d.i].cy;

                return "translate(" + d.x + ","  + d.y +")";
            })
                .select("text")
                .attr("text-anchor", function (d) {
                    if (d.t === "left") { return "end"; }
                    if (d.t === "right") { return "start"; }
                })
                .attr("transform", function (d) {
                    if (d.t === "left") {
                        return "translate(-" + (d.radius + 5) + ", " + d.radius + ")";
                    }
                    if (d.t === "right") {
                        return "translate(" + (d.radius + 5) + ", " + d.radius + ")";
                    }
                });

            // Create a new service, adjust its position.
            newServiceNodes = serviceNodes.enter();
            newServiceNodeG = newServiceNodes.append("g")
                .each(function (d) {
                    d.i = self._circlePositionIndex++;
                    d.x = self._circlePositions[d.i].x;
                    d.y = self._circlePositions[d.i].y;
                    d.t = self._circlePositions[d.i].t;
                    d.a = self._circlePositions[d.i].a;
                    d.cx = self._circlePositions[d.i].cx;
                    d.cy = self._circlePositions[d.i].cy;

                    d.radius = 5;
                })
                .attr("transform", function (d) {
                    return "translate(" + d.x + ","  + d.y +")";
                })
                .classed({"node": true, "service": true});

            newServiceNodeG
                .append("text")
                .attr("text-anchor", function (d) {
                    if (d.t === "left") { return "end"; }
                    if (d.t === "right") { return "start"; }
                })
                .attr("transform", function (d) {
                    var rot = 0.5 * d.a * 180 / Math.PI;

                    if (d.t === "left") {
                        return "translate(-" + (d.radius + 5) + ", " + d.radius + ")";
                    }
                    if (d.t === "right") {
                        return "translate(" + (d.radius + 5) + ", " + d.radius + ")";
                    }
                })
                .text(function (d) {
                    return d.get("name");
                });

            newServiceNodeG
                .append("circle")
                .attr("r", function (d)  { return d.radius; })
                .attr("id", function (d) { return d.getDomId(); })
                .on("mouseover", function (data, i) {
                    self._onItemOver(this, data);
                })
                .on("mouseout", function (data, i) {
                    self._onItemOut(this, data);
                })
                .on("click", function (data) {
                    self._onItemClick(this, data);
                });
        },

        /**
         * Precalculate the positions available for service nodes.
         *
         * .... This is BLASPHEMY
         * ....... This is MADNESS
         * .......... THIS
         * ............IS
         * .............D3!
         */
        _prepareCircle: function (n) {
            var self = this;
            var w = $(self.box).width();
            var h = $(self.box).height();
            var xmargin = 160;
            var ymargin = 50;
            var svcPerSide;

            // There are 6 segments on which the services can be placed.
            // 3 on the left, 3 on the right. The segments on the right
            // a reflexion of the segments of the left so we only need
            // to calculate the position of the services on the left.

            // Top left segment.
            self.s1 = {
                // Those coordinates are the top and bottom
                // position of the top segment.
                x1: w / 3,   y1: ymargin,
                x2: xmargin, y2: h / 3,

                // This is the function that will be used to calculate
                // the X position of a service in the segment, as a function
                // of Y.
                g: function (y) {
                    var n = (xmargin - w / 3) / (h / 3 - ymargin);
                    var c = -1 * n * h / 3 + xmargin;
                    return n * y + c;
                },

                c: function (x, y) {
                    return { x: x + 200, y: y };
                }
            };

            // Middle segment.
            self.s2 = {
                x1: xmargin, y1: h / 3,
                x2: xmargin, y2: 2 / 3 * h,

                // There is no g function here because the X position
                // of a service on that segment constant.

                c: function (x, y) {
                    return { x: x + 200, y: y };
                }
            };

            // Bottom segment. See 's1' for documentation.
            self.s3 = {
                x1: xmargin, y1: 2 / 3 * h,
                x2: w / 3, y2: h - ymargin,
                g: function (y) {
                    var n = (w / 3 - xmargin) / ((h - ymargin) - 2 / 3 * h);
                    var c = -1 * n * (h - ymargin) + w / 3;
                    return n * y + c;
                },

                c: function (x, y) {
                    return {x: x + 200, y: y};
                }
            };

            var segSz = 2 * (self.s1.y2 - self.s1.y1) + (self.s2.y2 - self.s2.y1);
            var cPos = [];

            svcPerSide = Math.ceil(n / 2 + 1);

            for (var i = 0; i < Math.ceil(n / 2 + 1); i++) {
                var xleft, yleft = (segSz / svcPerSide * i) + ymargin;
                var xright, yright = yleft;
                var cxleft, cyleft, cxright, cyright;
                var cp;

                if (yleft < self.s1.y2) {
                    xleft = self.s1.g(yleft);

                    cp = self.s1.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else if (yleft > self.s3.y1) {
                    xleft = self.s3.g(yleft);

                    cp = self.s3.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else {
                    xleft = self.s2.x1;

                    cp = self.s2.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;
                }
                xright = w - xleft;
                cxright = w - cxleft;
                cyright = cyleft;

                cPos.push({
                    x: xleft, y: yleft, t: "left",
                    cx: cxleft, cy: cyleft
                });
                cPos.push({
                    x: xright, y: yright, t: "right",
                    cx: cxright, cy: cyright
                });
            }

            return cPos;
        },

        render: function () {
            var self = this, w, h, r;

            self.el = self.box;

            w = $(self.box).width();
            h = $(self.box).height();
            r = $(self.box).width() * 0.30;

            self._centerX = w / 2;
            self._centerY = h / 2;
            self._radius = r;

            self._svg = d3.select(self.box)
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("xmlns", "http://www.w3.org/2000/svg");

            // http://logogin.blogspot.ca/2013/02/d3js-arrowhead-markers.html
            self._svg.append("defs")
                .append("marker")
                .attr("id", "arrowhead")
                .attr("refX", 6 + 3) /*must be smarter way to calculate shift*/
                .attr("refY", 2)
                .attr("markerWidth", 10)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 0,0 V 4 L6,2 Z");

            // Links between processes
            self._userLinkBox = self._svg.append("g").attr("class", "linkBox userLinks");

            // Links between process and services.
            self._linkBox = self._svg.append("g").attr("class", "linkBox links");

            // This will contain the selected links, which are moved on top of the other.
            self._selectedLinks = self._svg.append("g").attr("class", "linkBox selectedLinks");

            // The nodes
            self._nodeBox = self._svg.append("g");

            // The tooltips.
            self._tooltipBox = self._svg.append("g");

            // Initialize the tooltips.
            self._tip = d3.tip().attr('class', 'd3-tip');
            self._tooltipBox.call(self._tip);

            self._force = d3.layout.force()
                .charge(function (d) {
                    if (d.get("services").length > 5) {
                        return -1000;
                    } else if (d.get("services").length > 0) {
                        return -750;
                    } else {
                        return -250;
                    }
                })
                .gravity(0)
                .on("tick", function (e) { self._tick.apply(self, [e]); });

            self._serviceLinks.on("serviceadded", function () {
                self._onNewBinderService.apply(self, arguments);
            });

            self._serviceLinks.on("processadded", function () {
                self._onNewBinderProcess.apply(self, arguments);
            });

            self._serviceLinks.on("processremoved", function () {
                self._onRemoveBinderProcess.apply(self, arguments);
            });

            self._binderProcesses.on("serviceadded", function () {
                self._onNewProcessService.apply(self, arguments);
            });

            self._binderProcesses.on("serviceremoved", function () {
                self._onRemovedProcessService.apply(self, arguments);
            });

            self._serviceLinks.on("linkadded", function () {
                self._updateServiceLinks.apply(self, arguments);
            });

            self._serviceLinks.on("linkremoved", function () {
                self._updateServiceLinks.apply(self, arguments);
            });

            self._userServiceLinks.on("linkadded", function () {
                self._updateProcessLinks.apply(self, arguments);
            });

            self._userServiceLinks.on("linkremoved", function () {
                self._updateProcessLinks.apply(self, arguments);
            });

            // Fire the events the services and processes that might be already in the collections.
            self._onNewBinderService();
            self._onNewBinderProcess();
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._serviceLinks = opts.serviceLinks;
            self._userServiceLinks = opts.userServiceLinks;

            self._functions = opts.functions;
            self._tip = d3.tip().attr("class", "d3-tip").html(
                function (d) {
                    return d.get("process").get("cmdline")[0];
                }
            );

            self._circlePositions = [];
            self._circlePositionIndex = 0;
        }
    });
});