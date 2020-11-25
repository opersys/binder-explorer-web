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
    "use strict";

    const Backbone = require("backbone");
    const $ = require("jquery");
    const _ = require("underscore");

    class TieFighterServicePlacer {
        constructor(w, h, xmargin, ymargin) {
            this.W = w;
            this.H = h;
            this.XM = xmargin;
            this.YM = ymargin;

            // There are 6 segments on which the services can be placed.
            // 3 on the left, 3 on the right. The segments on the right
            // a reflexion of the segments of the left so we only need
            // to calculate the position of the services on the left.

            // Top left segment.
            this.S1 = {
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
            this.S2 = {
                x1: xmargin, y1: h / 3,
                x2: xmargin, y2: 2 / 3 * h,

                // There is no g function here because the X position
                // of a service on that segment constant.

                c: (x, y) => {
                    return { x: x + 200, y: y };
                }
            };

            // Bottom segment. See 's1' for documentation.
            this.S3 = {
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
        }

        place(n) {
            return Array.from(this.doPlace(n));
        }

        /**
         * Precalculate the positions available for service nodes.
         *
         * .... This is BLASPHEMY
         * ....... This is MADNESS
         * .......... THIS
         * ............IS
         * .............D3!
         */
        * doPlace(n) {
            const w = this.W;
            const h = this.H;
            const xmargin = this.XM;
            const ymargin = this.YM;

            let svcPerSide;

            let segSz = 2 * (this.S1.y2 - this.S1.y1) + (this.S2.y2 - this.S2.y1);
            let cPos = [];

            svcPerSide = Math.ceil(n / 2 + 1);

            for (let i = 0; i < svcPerSide; i++) {
                let xleft, yleft = (segSz / svcPerSide * i) + ymargin;
                let xright, yright = yleft;
                let cxleft, cyleft, cxright, cyright;
                let cp;

                if (yleft < this.S1.y2) {
                    xleft = this.S1.g(yleft);

                    cp = this.S1.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else if (yleft > this.S3.y1) {
                    xleft = this.S3.g(yleft);

                    cp = this.S3.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;

                } else {
                    xleft = this.S2.x1;

                    cp = this.S2.c(xleft, yleft);
                    cxleft = cp.x; cyleft = cp.y;
                }
                xright = w - xleft;
                cxright = w - cxleft;
                cyright = cyleft;

                yield {
                    x: xleft, y: yleft, t: "left",
                    cx: cxleft, cy: cyleft
                };
                yield {
                    x: xright, y: yright, t: "right",
                    cx: cxright, cy: cyright
                };
            }
        }
    }

    class XTranslatedTieFighterServicePlacer extends TieFighterServicePlacer {
        constructor(width, height, xmargin, ymargin, translation) {
            super(width, height, xmargin, ymargin);
            this.t = translation;
        }

        * doPlace(n) {
            for (let p of super.doPlace(n)) {

                // Translate left
                if (p.t == "left")
                    yield {
                        x: p.x - this.t, y: p.y, t: p.t,
                        cx: p.cx, cy: p.cy
                    };

                // Translate right
                else if (p.t == "right")
                    yield {
                        x: p.x + this.t, y: p.y, t: p.t,
                        cx: p.cx, cy: p.cy
                    };
            }
        }
    }

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
                        .on("mouseover", (data, i, nodes) => {
                            this._onItemOver(nodes[i], data);
                        })
                        .on("mouseout", (data, i, nodes) => {
                            this._onItemOut(nodes[i], data);
                        })
                        .on("click", (data, i, nodes) => {
                            this._onItemClick(nodes[i], data);
                        });
                },
                error: () => {
                    console.log("No icon found for " + d.get("pid"));
                }
            });
        },

        _tick: function (_) {
            const gravityCenter = (d, alpha) => {
                d.y += (this._centerY - d.y) * alpha;
                d.x += (this._centerX - d.x) * alpha;
            };

            d3.selectAll(".node.process")
                .each((d) => {
                    gravityCenter(d, 0.4 * this._force.alpha());
                })
                .attr("transform", (d) => {
                    return `translate(${d.x}, ${d.y})`;
                });

            d3.selectAll(".link")
                .attr("d", (l) => { return this._linkPath(l); });

            d3.selectAll(".proclink")
                .attr("x1", (l) => { return l.source.x; })
                .attr("y1", (l) => { return l.source.y; })
                .attr("x2", (l) => { return l.target.x; })
                .attr("y2", (l) => { return l.target.y; });
        },

        _moveTo: function (sourceSel, targetSel) {
            let el = $(sourceSel).remove();
            $(targetSel).append(el);
        },

        _isServiceObject: function (data) {
            return data.idAttribute == "name";
        },

        _isProcessObject: function (data) {
            return data.idAttribute == "pid";
        },

        _onItemOut: function (target, data) {
            d3.select(target).select("circle").classed("hover", false);

            if (this._isProcessObject(data)) {
                this._moveTo(".link.source-" + data.getDomId(), ".linkBox.links");
                this._moveTo(".proclink.source-" + data.getDomId(), ".linkBox.procLinks");
                this._moveTo(".proclink.target-" + data.getDomId(), ".linkBox.procLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed("hover", false);
                d3.selectAll(".proclink.source-" + data.getDomId()).classed("hover", false);
                d3.selectAll(".proclink.target-" + data.getDomId()).classed("hover", false);

                this.trigger("depends_view:onProcessOut", this._tip, data);
            }
            else if (this._isServiceObject(data)) {
                this._moveTo(".link.target-" + data.getDomId(), ".linkBox.links");
                d3.selectAll(".link.target-" + data.getDomId()).classed("hover", false);

                this.trigger("depends_view:onServiceOut", this._tip, data);
            } else {
                this.trigger("depends_view:onProcServiceOut", this._tip, data);
            }
        },

        _onItemOver: function (target, data) {
            d3.select(target).select("circle").classed("hover", true);

            if (this._isProcessObject(data)) {
                this._moveTo(".link.source-" + data.getDomId(), ".linkBox.selectedLinks");
                this._moveTo(".proclink.source-" + data.getDomId(), ".linkBox.selectedLinks");
                this._moveTo(".proclink.target-" + data.getDomId(), ".linkBox.selectedLinks");

                d3.selectAll(".link.source-" + data.getDomId()).classed("hover", true);
                d3.selectAll(".proclink.source-" + data.getDomId()).classed("hover", true);
                d3.selectAll(".proclink.target-" + data.getDomId()).classed("hover", true);

                this.trigger("depends_view:onProcessOver", this._tip, data);
            }
            else if (this._isServiceObject(data)) {
                this._moveTo(".link.target-" + data.getDomId(), ".linkBox.selectedLinks");
                d3.selectAll(".link.target-" + data.getDomId()).classed("hover", true);

                this.trigger("depends_view:onServiceOver", this._tip, data);
            } else {
                this.trigger("depends_view:onProcServiceOver", this._tip, data);
            }
        },

        _onItemClick: function (_, data) {
            if (this._isProcessObject(data))
                this.trigger("depends_view:onProcessClick", data);
            else if (this._isServiceObject(data))
                this.trigger("depends_view:onServiceClick", data);
        },

        _onNewProcessService: function (procService) {
            let processG, processGServ,
                newProcServices, upProcServices, obServ,
                angle, cangle, sangle;
            let servs; // All services for this process.

            processG = d3.select("#pid_" + procService.pid);
            processGServ = processG.selectAll(".pid_" + procService.pid + "_services");
            obServ = processG.selectAll(".service_orbit");
            servs = this._processes.get(procService.pid).get("services");

            angle = 270 / servs.length + 1;
            cangle = 45;
            sangle = [];

            for (let i = 0; i < servs.length; i++)
                sangle.push(cangle += angle);

            upProcServices = processGServ.data(servs, (d) => { return d.intent; });
            newProcServices = upProcServices.enter();

            // Add the orbit if there is not one already.
            if (obServ.empty()) {
                processG
                    .append("circle")
                    .attr("class", "service_orbit")
                    .attr("r", 40);
            }

            newProcServices
                .append("g")
                .attr("class", "pid_" + procService.pid + "_services")
                .append("circle")
                .attr("class", "service")
                .attr("r", "5")
                .attr("transform", (d) => {
                    d.angle = sangle.pop();
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                })
                .on("mouseover", (data, i, nodes) => {
                    this._onItemOver(nodes[i], data);
                })
                .on("mouseout", (data, i, nodes) => {
                    this._onItemOut(nodes[i], data);
                })
                .on("click", (data, i, nodes) => {
                    this._onItemClick(nodes[i], data);
                });

            upProcServices
                .attr("transform", (d) => {
                    d.angle = sangle.pop();
                    return "rotate(" + d.angle + ")";
                });
        },

        _onRemovedProcessService: function (procService) {
            let processG, processGServ, obServ,
                upProcServices, goneProcServices,
                angle, cangle, sangle;
            let iserv;
            let servs;

            processG = d3.select("#pid_" + procService.pid);

            processGServ = processG.selectAll(".pid_" + procService.pid + "_services");
            servs = this._processes.get(procService.pid).get("services");

            angle = 270 / servs.length + 1;
            cangle = 45;
            sangle = [];

            for (let i = 0; i < servs.length; i++)
                sangle.push(cangle += angle);

            upProcServices = processGServ.data(servs, (d) => { return d.intent; });

            // Clear the services that aren't there anymore.
            goneProcServices = upProcServices.exit();
            goneProcServices.remove();

            // Update the services that still exists.
            upProcServices
                .attr("transform", (d) => {
                    d.angle = sangle.pop();
                    console.assert(d.angle, `Angle is invalid for ${d.get("pid")}`);
                    return "translate(40) rotate(" + d.angle + ",-40,0)";
                });
        },

        _updateProcessLinks: function () {
            let procLinks, goneLinks, newProcLinks, upProcLinks;

            procLinks = this._procLinkBox.selectAll(".proclink");
            upProcLinks = procLinks.data(() => {
                    return this._proclinkhandler.getLinks((from, to) => {
                        return {
                            source: from,
                            target: to
                        };
                    });
                },
                (d) => {
                    return "source-" + d.source.getDomId() + " target-" + d.target.getDomId();
                }
            );

            newProcLinks = upProcLinks.enter();
            goneLinks = upProcLinks.exit();

            // Remove the links that are now missing
            goneLinks.remove();

            // Refresh all the existing links position.
            procLinks.attr("x1", (l) => { return l.source.x; })
                .attr("y1", (l) => { return l.source.y; })
                .attr("x2", (l) => { return l.target.x; })
                .attr("y2", (l) => { return l.target.y; });

            // Add the missing links.
            newProcLinks.append("line")
                .attr("class", (d) => {
                    return "proclink source-" + d.source.getDomId() + " target-" + d.target.getDomId();
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
                return this._linkhandler.getLinks((a, b) => {

                    // Always return a (service, process) tuple to d3.
                    if (this._isServiceObject(a))
                        return {
                            source: b,
                            target: a
                        };
                    else
                        return {
                            source: a,
                            target: b
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

            processNodes = this._nodeBox.selectAll(".node.process").data(this._processes.models,
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

            this._force.nodes(this._processes.models);

        },

        /**
         * Called when there is a new process added in the collection.
         */
        _onNewBinderProcess: function (binderProcess) {
            let processNodes, newProcessNodes, newProcessNodeG;

            processNodes = this._nodeBox.selectAll(".node.process").data(this._processes.models,
                (model) => {
                    return model.get("pid");
                }
            );

            // Add new process nodes.
            newProcessNodes = processNodes.enter();

            newProcessNodeG = newProcessNodes.append("g")
                .each((d) => {
                    //d.x = (2 * (Math.random() - 0.5)) * this._radius + this._centerX;
                    //d.y = (2 * (Math.random() - 0.5)) * this._radius + this._centerY;
                    d.x = this._centerX;
                    d.y = this._centerY;
                    d.radius = 8;
                })
                .classed("node process", true)
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
                .on("mouseover", (data, i, nodes) => {
                    this._onItemOver(nodes[i], data);
                })
                .on("mouseout", (data, i, nodes) => {
                    this._onItemOut(nodes[i], data);
                })
                .on("click", (data, i, nodes) => {
                    this._onItemClick(nodes[i], data);
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

            this._force.nodes(this._processes.models);
        },

        /**
         * Called when there is a new service added in the collection.
         */
        _onNewBinderService: function (binderName) {
            let serviceNodes, newServiceNodes, newServiceNodeG;
            let curServices = this._binders.get(binderName).get("services");

            if (curServices.length > this._positions.get(binderName).length) {
                let n, placer;

                if (!this._servicePlacers[binderName])
                    return;

                n = curServices.models.length;
                placer = this._servicePlacers[binderName];
                this._positions.set(binderName, placer.place(n));
            }

            serviceNodes = this._nodeBox.selectAll(`.node.service.${binderName}`).data(curServices.models);

            // Adjust the position of the currently placed services
            serviceNodes.attr("transform", (d, i) => {
                d.x = this._positions.get(binderName)[i].x;
                d.y = this._positions.get(binderName)[i].y;
                d.t = this._positions.get(binderName)[i].t;
                d.a = this._positions.get(binderName)[i].a;
                d.cx = this._positions.get(binderName)[i].cx;
                d.cy = this._positions.get(binderName)[i].cy;

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
                .each((d, i) => {
                    d.i = this._positionIndex.get(binderName);
                    d.x = this._positions.get(binderName)[i].x;
                    d.y = this._positions.get(binderName)[i].y;
                    d.t = this._positions.get(binderName)[i].t;
                    d.a = this._positions.get(binderName)[i].a;
                    d.cx = this._positions.get(binderName)[i].cx;
                    d.cy = this._positions.get(binderName)[i].cy;

                    this._positionIndex.set(this._positionIndex.get(binderName) + 1);

                    d.radius = 5;
                })
                .attr("transform", (d) => {
                    return "translate(" + d.x + ","  + d.y +")";
                })
                .classed(`node service ${binderName}`, true);

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
                .attr("id", (d) => {
                    return d.getDomId();
                })
                .on("mouseover", (data, i, nodes) => {
                     this._onItemOver(nodes[i], data);
                })
                .on("mouseout", (data, i, nodes) => {
                     this._onItemOut(nodes[i], data);
                })
                .on("click", (data, i, nodes) => {
                    this._onItemClick(nodes[i], data);
                });
        },

        render: function () {
            let w, h, r;

            this.el = this.box;

            w = $(this.box).width() * 1.2;
            h = $(this.box).height() * 1.5;
            r = $(this.box).width() * 0.6;

            this._servicePlacers = {
                "binder": new TieFighterServicePlacer(w, h, 160, 50),
                "hwbinder": new XTranslatedTieFighterServicePlacer(w, h, 160, 50, 300),
                "vndbinder": null
            };

            this._centerX = w / 2;
            this._centerY = h / 2;
            this._radius = r;

            this._svg = d3.select(this.box)
                .append("svg")
                .attr("width", w)
                .attr("height", h);

            this._svgBase = this._svg.append("g")
                .attr("width", w)
                .attr("height", h)
                .attr("xmlns", "http://www.w3.org/2000/svg");

            this._svg.call(d3.zoom()
                           .scaleExtent([0.5, 2.0])
                           .on("zoom", () => {
                               this._svgBase.attr("transform", d3.event.transform);
                           }));

            // http://logogin.blogspot.ca/2013/02/d3js-arrowhead-markers.html
            this._svgBase.append("defs")
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
            this._linkBox = this._svgBase.append("g").attr("class", "linkBox links");

            // Links between processes
            this._procLinkBox = this._svgBase.append("g").attr("class", "linkBox procLinks");

            // This will contain the selected links, which are moved on top of the other.
            this._selectedLinks = this._svgBase.append("g").attr("class", "linkBox selectedLinks");

            // The nodes
            this._nodeBox = this._svgBase.append("g");

            // The tooltips.
            this._tooltipBox = this._svgBase.append("g");

            // Initialize the tooltips.
            this._tip = d3.tip().attr('class', 'd3-tip');
            this._tooltipBox.call(this._tip);

            this._force = d3.forceSimulation()
                .force("charge", d3.forceManyBody().strength((d) => {
                    if (d.get("services").length > 5)
                        return -1000;
                    else if (d.get("services").length > 0)
                        return -750;
                    else
                        return -500;
                }))
                .force("center", d3.forceCenter(w / 2, h / 2))
                .on("tick", (e) => { this._tick(e); });

            this._linkhandler.on("serviceadded", (binder, service) => {
                this._onNewBinderService(binder);
            });

            this._linkhandler.on("serviceadded", (binder, service) => {
                this._onNewBinderService(binder);
            });

            this._linkhandler.on("processadded", (m) => {
                this._onNewBinderProcess(m);
            });

            this._linkhandler.on("processremoved", (m) => {
                this._onRemoveBinderProcess(m);
            });

            this._processes.on("processserviceadded", (s) => {
                this._onNewProcessService(s);
            });

            this._processes.on("processserviceremoved", (s) => {
                this._onRemovedProcessService(s);
            });

            this._linkhandler.on("linkadded", (f, t) => {
                this._updateServiceLinks(f, t);
            });

            this._linkhandler.on("linkremoved", (f, t) => {
                this._updateServiceLinks(f, t);
            });

            this._proclinkhandler.on("linkadded", (f, t) => {
                this._updateProcessLinks(f, t);
            });

            this._proclinkhandler.on("linkremoved", (f, t) => {
                this._updateProcessLinks(f, t);
            });
        },

        initialize: function (opts) {
            this._binders = opts.binders;
            this._linkhandler = opts.linkhandler;
            this._proclinkhandler = opts.proclinkhandler;
            this._functions = opts.functions;
            this._processes = opts.processes;

            this._tip = d3.tip().attr("class", "d3-tip").html(
                (d) => {
                    return d.get("process").get("cmdline")[0];
                }
            );

            this._positions = new Map();
            this._positions.set("binder", []);
            this._positions.set("hwbinder", []);
            this._positions.set("vndbinder", []);

            this._positionIndex = new Map();
            this._positionIndex.set("binder", 0);
            this._positionIndex.set("hwbinder", 0);
            this._positionIndex.set("vndbinder", 0);
        }
    });
});
