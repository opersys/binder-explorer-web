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

    const Backbone = require("backbone");
    const BinderServices = require("models/BinderServices");
    const Operation = require("models/Operation");
    const d3 = require("d3");
    const $ = require("jquery");
    const _ = require("underscore");
    d3.tip = require("d3-tip/index");

    return Backbone.View.extend({

        selectedItem: null,

        _fetchIcon: function (d) {
            $.ajax("http://" + window.location.host + "/icon/" + d.get("process").get("cmdline")[0], {
                type: "HEAD",
                success: (data, status, jqXHR) => {
                    console.log("Icon found for " + d.get("pid"));

                    // Clear the selection elements.
                    $("#pid_" + d.id + " circle.node").remove();

                    // Replace the element by an image.
                    d3.select("#pid_" + d.id)
                        .append("image")
                        .attr("width", 24)
                        .attr("height", 24)
                        .attr("transform", (d) => {
                            return "translate(-15, -15)";
                        })
                        .attr("xlink:xlink:href", (d) => {
                            return "http://" + window.location.host + "/icon/" + d.get("process").get("cmdline")[0];
                        })
                        .on("mouseover", (data) => {
                            this._onItemOver(data);
                        })
                        .on("mouseout", (data) => {
                            this._onItemOut(data);
                        })
                        .on("click", (data) => {
                            this._onItemClick(data);
                        });
                },
                error: () => {
                    console.log("No icon found for " + d.get("pid"));
                }
            });
        },

        _tick: function (e) {
            const gravityCenter = (d, alpha) => {
                d.y += (this._centerY - d.y) * alpha;
                d.x += (this._centerX - d.x) * alpha;
            };

            d3.selectAll(".node.process")
                .each((d) => {
                    gravityCenter(d, 0.2 * e.alpha);
                })
                .attr("transform", (d) => {
                    return "translate(" + d.x + ","  + d.y +")";
                });

            d3.selectAll(".link")
                .attr("d", (l) => { return this._linkPath(l); });

            d3.selectAll(".userlink")
                .attr("x1", (l) => { return l.source.x; })
                .attr("y1", (l) => { return l.source.y; })
                .attr("x2", (l) => { return l.target.x; })
                .attr("y2", (l) => { return l.target.y; });
        },

        _moveTo: function (sourceSel, targetSel) {
            let el = $(sourceSel).remove();
            $(targetSel).append(el);
        },

        _onItemOut: function (target, data) {
            d3.select(target).select("circle").classed({"hover": false});

            if (data.collection === this._binderProcesses) {
                this._moveTo(".link.source-" + data.getDomId(), ".linkBox.links");
                this._moveTo(".userlink.source-" + data.getDomId(), ".linkBox.userLinks");
                this._moveTo(".userlink.target-" + data.getDomId(), ".linkBox.userLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed({"hover": false});
                d3.selectAll(".userlink.source-" + data.getDomId()).classed({"hover": false});
                d3.selectAll(".userlink.target-" + data.getDomId()).classed({"hover": false});

                this.trigger("depends_view:onProcessOut", this._tip, data);
            }
            else if (data.collection === this._binderServices) {
                this._moveTo(".link.target-" + data.getDomId(), ".linkBox.links");
                d3.selectAll(".link.target-" + data.getDomId()).classed({"hover": false});

                this.trigger("depends_view:onServiceOut", this._tip, data);
            } else {
                this.trigger("depends_view:onUserServiceOut", this._tip, data);
            }
        },

        _onItemOver: function (target, data) {
            d3.select(target).select("circle").classed({"hover": true});

            if (data.collection === this._binderProcesses) {
                this._moveTo(".link.source-" + data.getDomId(), ".linkBox.selectedLinks");
                this._moveTo(".userlink.source-" + data.getDomId(), ".linkBox.selectedLinks");
                this._moveTo(".userlink.target-" + data.getDomId(), ".linkBox.selectedLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed({"hover": true});
                d3.selectAll(".userlink.source-" + data.getDomId()).classed({"hover": true});
                d3.selectAll(".userlink.target-" + data.getDomId()).classed({"hover": true});

                this.trigger("depends_view:onProcessOver", this._tip, data);
            }
            else if (data.collection === this._binderServices) {
                this._moveTo(".link.target-" + data.getDomId(), ".linkBox.selectedLinks");
                d3.selectAll(".link.target-" + data.getDomId()).classed({"hover": true});

                this.trigger("depends_view:onServiceOver", this._tip, data);
            } else {
                this.trigger("depends_view:onUserServiceOver", this._tip, data);
            }
        },

        _onItemClick: function (target, data) {
            if (data.collection === this._binderProcesses)
                this.trigger("depends_view:onProcessClick", data);
            else if (data.collection === this._binderServices)
                this.trigger("depends_view:onServiceClick", data);
        },

        resize: function () {

        },

        _onNewProcessService: function (userService) {
            let processG, processGServ,
                newUserServices, upUserServices, obServ,
                angle, cangle, sangle;
            let servs; // All services for this process.

            processG = d3.select("#pid_" + userService.pid);
            processGServ = processG.selectAll(".pid_" + userService.pid + "_services");
            obServ = processG.selectAll(".service_orbit");
            servs = this._binderProcesses.get(userService.pid).get("services");

            angle = 270 / servs.length + 1;
            cangle = 45;
            sangle = [];

            for (let i = 0; i < servs.length; i++)
                sangle.push(cangle += angle);

            upUserServices = processGServ.data(servs, (d) => { return d.intent; });
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
                .attr("r", "5")
                .on("mouseover", (data, i) => {
                    this._onItemOver(data);
                })
                .on("mouseout", (data, i) => {
                    this._onItemOut(data);
                })
                .on("click", (data) => {
                    this._onItemClick(data);
                });

            upUserServices
                .attr("transform", (d) => {
                    d.angle = sangle.pop();
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                });

            this._force.start();
        },

        _onRemovedProcessService: function (userService) {
            let processG, processGServ, obServ,
                upUserServices, goneUserServices,
                angle, cangle, sangle;
            let iserv;
            let servs;

            processG = d3.select("#pid_" + userService.pid);

            processGServ = processG.selectAll(".pid_" + userService.pid + "_services");
            servs = this._binderProcesses.get(userService.pid).get("services");

            angle = 270 / servs.length + 1;
            cangle = 45;
            sangle = [];

            for (let i = 0; i < servs.length; i++)
                sangle.push(cangle += angle);

            upUserServices = processGServ.data(servs, (d) => { return d.intent; });

            // Clear the services that aren't there anymore.
            goneUserServices = upUserServices.exit();
            goneUserServices.remove();

            // Update the services that still exists.
            upUserServices
                .attr("transform", (d) => {
                    d.angle = sangle.pop();
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                });

            this._force.start();
        },

        _updateProcessLinks: function () {
            let userLinks, goneLinks, newUserLinks, upUserLinks;

            userLinks = this._userLinkBox.selectAll(".userlink");
            upUserLinks = userLinks.data(() => {
                    return this._userServiceLinks.getLinks((from, to) => {
                        if (!this._binderProcesses.get(from))
                            throw "PID " + from + " not found in processes";
                        if (!this._binderProcesses.get(to))
                            throw "PID " + to + " not found in processes";

                        return {
                            source: this._binderProcesses.get(from),
                            target: this._binderProcesses.get(to)
                        };
                    });
                },
                (d) => {
                    return "source-" + d.source.id + " target-" + d.target.id;
                }
            );

            newUserLinks = upUserLinks.enter();
            goneLinks = upUserLinks.exit();

            // Remove the links that are now missing
            goneLinks.remove();

            // Refresh all the existing links position.
            userLinks.attr("x1", (l) => { return l.source.x; })
                .attr("y1", (l) => { return l.source.y; })
                .attr("x2", (l) => { return l.target.x; })
                .attr("y2", (l) => { return l.target.y; });

            // Add the missing links.
            newUserLinks.append("line")
                .attr("class", (d) => {
                    return "userlink source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                })
                .attr("marker-end", "url(#arrowhead)")
                .attr("x1", (l) => { return l.source.x; })
                .attr("y1", (l) => { return l.source.y; })
                .attr("x2", (l) => { return l.target.x; })
                .attr("y2", (l) => { return l.target.y; });
        },

        _linkTmpl: _.template(
            "M <%= sx %> <%= sy %> " + "" +
            "C <%= sx %> <%= sy %> <%= tcx %> <%= tcy %> <%= tx %> <%= ty %>"),

        _linkPath: function (l) {
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

            return this._linkTmpl({
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
            let links, goneLinks, newLinks, upLinks;

            links = this._linkBox.selectAll(".link");
            upLinks = links.data(() => {
                return this._serviceLinks.getLinks((a, b) => {
                    let serviceName, pid;

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

                    // This is a sanity check that validates that the PID and the service
                    // name we found can be found inside their respective collection. This
                    // has trapped a few bug.

                    if (!this._binderProcesses.get(pid))
                        throw "PID " + a + " not found in processes";
                    if (!this._binderServices.get(serviceName))
                        throw "Service " + b + " not found in services";

                    return {
                        source: this._binderProcesses.get(pid),
                        target: this._binderServices.get(serviceName)
                    };
                });
            }, (d) => {
                return "source-" + d.source.getDomId() + " target-" + d.target.getDomId();
            });

            newLinks = upLinks.enter();
            goneLinks = upLinks.exit();

            // Remove the links that are now missing.
            goneLinks.remove();

            // Refresh all the existing links position.
            links.attr("d", (l) => { return this._linkPath(l); });

            // Add the missing links.
            newLinks.append("path")
                .attr("class", (d) => {
                    return "link source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                })
                .attr("fill", "transparent")
                .attr("d", (l) => { return this._linkPath(l); });
        },

        _onRemoveBinderProcess: function () {
            let processNodes, goneProcessNodes;

            processNodes = this._nodeBox.selectAll(".node.process").data(this._binderProcesses.models,
                (model) => {
                    return model.get("pid");
                }
            );

            // Remove the nodes that are gone.
            goneProcessNodes = processNodes.exit();

            goneProcessNodes.each((d) => {
                d3.select("#pid_" + d.get("pid"))
                    .transition()
                    .duration(1000)
                    .style("opacity", 0)
                    .each("end", (d) => {
                        d3.select("#pid_" + d.get("pid")).remove();
                    });
            });

            this._force
                .nodes(this._binderProcesses.models)
                .start();
        },

        /**
         * Called when there is a new process added in the collection.
         */
        _onNewBinderProcess: function (binderProcess) {
            let processNodes, newProcessNodes, newProcessNodeG;

            processNodes = this._nodeBox.selectAll(".node.process").data(this._binderProcesses.models,
                (model) => {
                    return model.get("pid");
                }
            );

            // Add new process nodes.
            newProcessNodes = processNodes.enter();

            newProcessNodeG = newProcessNodes.append("g")
                .each((d) => {
                    d.x = (2 * (Math.random() - 0.5)) * this._radius + this._centerX;
                    d.y = (2 * (Math.random() - 0.5)) * this._radius + this._centerY;
                    d.radius = 8;
                })
                .classed({"node": true, "process": true})
                .attr("transform", (d) => {
                    return "translate(" + d.x + ","  + d.y +")";
                })
                .attr("id", (d) => { return d.getDomId(); });

            newProcessNodeG
                .append("text")
                .attr("transform", (d) => {
                    return "translate(" + d.radius + ", " + d.radius + ")";
                })
                .text((d) => {
                    return d.get("pid");
                });

            newProcessNodeG
                .append("circle")
                .on("mouseover", (data, i) => {
                    this._onItemOver(this, data);
                })
                .on("mouseout", (data, i) => {
                    this._onItemOut(this, data);
                })
                .on("click", (data) => {
                    this._onItemClick(this, data);
                })
                .attr("class", "node")
                .attr("r", (d) => {
                    return d.radius;
                })
                .each((newBinderProcess) => {
                    // Schedule a timer to fetch the icon for this process.
                    setTimeout(() => {
                        this._fetchIcon(newBinderProcess);
                    }, 0);
                });

            this._force
                .nodes(this._binderProcesses.models)
                .start();
        },

        /**
         * Called when there is a new service added in the collection.
         */
        _onNewBinderService: function (binderService) {
            let serviceNodes, newServiceNodes, newServiceNodeG;

            if (this._binderServices.length > this._circlePositions.length)
                this._circlePositions = this._prepareCircle(this._binderServices.models.length);

            serviceNodes  = this._nodeBox.selectAll(".node.service").data(this._binderServices.models);

            // Adjust the position of the currently placed services
            serviceNodes.attr("transform", (d) => {
                d.x = this._circlePositions[d.i].x;
                d.y = this._circlePositions[d.i].y;
                d.t = this._circlePositions[d.i].t;
                d.a = this._circlePositions[d.i].a;
                d.cx = this._circlePositions[d.i].cx;
                d.cy = this._circlePositions[d.i].cy;

                return "translate(" + d.x + ","  + d.y +")";
            })
                .select("text")
                .attr("text-anchor", (d) => {
                    if (d.t === "left") { return "end"; }
                    if (d.t === "right") { return "start"; }
                })
                .attr("transform", (d) => {
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
                .each((d) => {
                    d.i = this._circlePositionIndex++;
                    d.x = this._circlePositions[d.i].x;
                    d.y = this._circlePositions[d.i].y;
                    d.t = this._circlePositions[d.i].t;
                    d.a = this._circlePositions[d.i].a;
                    d.cx = this._circlePositions[d.i].cx;
                    d.cy = this._circlePositions[d.i].cy;

                    d.radius = 5;
                })
                .attr("transform", (d) => {
                    return "translate(" + d.x + ","  + d.y +")";
                })
                .classed({"node": true, "service": true});

            newServiceNodeG
                .append("text")
                .attr("text-anchor", (d) => {
                    if (d.t === "left") { return "end"; }
                    if (d.t === "right") { return "start"; }
                })
                .attr("transform", (d) => {
                    let rot = 0.5 * d.a * 180 / Math.PI;

                    if (d.t === "left")
                        return "translate(-" + (d.radius + 5) + ", " + d.radius + ")";

                    if (d.t === "right")
                        return "translate(" + (d.radius + 5) + ", " + d.radius + ")";
                })
                .text((d) => {
                    return d.get("name");
                });

            newServiceNodeG
                .append("circle")
                .attr("r", (d) => { return d.radius; })
                .attr("id", (d) => { return d.getDomId(); })
                .on("mouseover", (data, i) => {
                    this._onItemOver(this, data);
                })
                .on("mouseout", (data, i) => {
                    this._onItemOut(this, data);
                })
                .on("click", (data) => {
                    this._onItemClick(this, data);
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
            var w = $(this.box).width();
            var h = $(this.box).height();
            var xmargin = 160;
            var ymargin = 50;
            var svcPerSide;

            // There are 6 segments on which the services can be placed.
            // 3 on the left, 3 on the right. The segments on the right
            // a reflexion of the segments of the left so we only need
            // to calculate the position of the services on the left.

            // Top left segment.
            this.s1 = {
                // Those coordinates are the top and bottom
                // position of the top segment.
                x1: w / 3,   y1: ymargin,
                x2: xmargin, y2: h / 3,

                // This is the function that will be used to calculate
                // the X position of a service in the segment, as a function
                // of Y.
                g: (y) => {
                    let n = (xmargin - w / 3) / (h / 3 - ymargin);
                    let c = -1 * n * h / 3 + xmargin;
                    return n * y + c;
                },

                c: (x, y) => {
                    return { x: x + 200, y: y };
                }
            };

            // Middle segment.
            this.s2 = {
                x1: xmargin, y1: h / 3,
                x2: xmargin, y2: 2 / 3 * h,

                // There is no g function here because the X position
                // of a service on that segment constant.

                c: (x, y) => {
                    return { x: x + 200, y: y };
                }
            };

            // Bottom segment. See 's1' for documentation.
            this.s3 = {
                x1: xmargin, y1: 2 / 3 * h,
                x2: w / 3, y2: h - ymargin,
                g: (y) => {
                    let n = (w / 3 - xmargin) / ((h - ymargin) - 2 / 3 * h);
                    let c = -1 * n * (h - ymargin) + w / 3;
                    return n * y + c;
                },

                c: (x, y) => {
                    return {x: x + 200, y: y};
                }
            };

            let segSz = 2 * (this.s1.y2 - this.s1.y1) + (this.s2.y2 - this.s2.y1);
            let cPos = [];

            svcPerSide = Math.ceil(n / 2 + 1);

            for (let i = 0; i < Math.ceil(n / 2 + 1); i++) {
                let xleft, yleft = (segSz / svcPerSide * i) + ymargin;
                let xright, yright = yleft;
                let cxleft, cyleft, cxright, cyright;
                let cp;

                if (yleft < this.s1.y2) {
                    xleft = this.s1.g(yleft);

                    cp = this.s1.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else if (yleft > this.s3.y1) {
                    xleft = this.s3.g(yleft);

                    cp = this.s3.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else {
                    xleft = this.s2.x1;

                    cp = this.s2.c(xleft, yleft);
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
            let w, h, r;

            this.el = this.box;

            w = $(this.box).width();
            h = $(this.box).height();
            r = $(this.box).width() * 0.30;

            this._centerX = w / 2;
            this._centerY = h / 2;
            this._radius = r;

            this._svg = d3.select(this.box)
                .append("svg")
                .attr("width", w)
                .attr("height", h)
                .attr("xmlns", "http://www.w3.org/2000/svg");

            // http://logogin.blogspot.ca/2013/02/d3js-arrowhead-markers.html
            this._svg.append("defs")
                .append("marker")
                .attr("id", "arrowhead")
                .attr("refX", 6 + 3) /*must be smarter way to calculate shift*/
                .attr("refY", 2)
                .attr("markerWidth", 10)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 0,0 V 4 L6,2 Z");

            // Links between process and services.
            this._linkBox = this._svg.append("g").attr("class", "linkBox links");

            // Links between processes
            this._userLinkBox = this._svg.append("g").attr("class", "linkBox userLinks");

            // This will contain the selected links, which are moved on top of the other.
            this._selectedLinks = this._svg.append("g").attr("class", "linkBox selectedLinks");

            // The nodes
            this._nodeBox = this._svg.append("g");

            // The tooltips.
            this._tooltipBox = this._svg.append("g");

            // Initialize the tooltips.
            this._tip = d3.tip().attr('class', 'd3-tip');
            this._tooltipBox.call(this._tip);

            this._force = d3.layout.force()
                .charge((d) => {
                    if (d.get("services").length > 5)
                        return -1000;
                    else if (d.get("services").length > 0)
                        return -750;
                    else
                        return -250;
                })
                .gravity(0)
                .on("tick", (e) => { this._tick(e); });

            this._serviceLinks.on("serviceadded", (s) => {
                this._onNewBinderService(s);
            });

            this._serviceLinks.on("processadded", (m) => {
                this._onNewBinderProcess(m);
            });

            this._serviceLinks.on("processremoved", (m) => {
                this._onRemoveBinderProcess(m);
            });

            this._binderProcesses.on("serviceadded", (s) => {
                this._onNewProcessService(s);
            });

            this._binderProcesses.on("serviceremoved", (s) => {
                this._onRemovedProcessService(s);
            });

            this._serviceLinks.on("linkadded", (f, t) => {
                this._updateServiceLinks(f, t);
            });

            this._serviceLinks.on("linkremoved", (f, t) => {
                this._updateServiceLinks(f, t);
            });

            this._userServiceLinks.on("linkadded", (f, t) => {
                this._updateProcessLinks(f, t);
            });

            this._userServiceLinks.on("linkremoved", (f, t) => {
                this._updateProcessLinks(f, t);
            });

            // Fire the events the services and processes that might be already in the collections.
            this._onNewBinderService();
            this._onNewBinderProcess();
        },

        initialize: function (opts) {
            this._binderServices = opts.binderServices;
            this._binderProcesses = opts.binderProcesses;
            this._serviceLinks = opts.serviceLinks;
            this._userServiceLinks = opts.userServiceLinks;

            this._functions = opts.functions;
            this._tip = d3.tip().attr("class", "d3-tip").html(
                (d) => {
                    return d.get("process").get("cmdline")[0];
                }
            );

            this._circlePositions = [];
            this._circlePositionIndex = 0;
        }
    });
});
