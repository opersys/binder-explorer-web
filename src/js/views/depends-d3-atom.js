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
    var d3 = require("d3");
    var $ = require("jquery");
    var _ = require("underscore");
    var Linker = require("linkhandler");
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
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });

            d3.selectAll(".userlink")
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
        },

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._serviceLinks = opts.serviceLinks;
            self._functions = opts.functions;
            self._tip = d3.tip().attr("class", "d3-tip").html(
                function (d) {
                    return d.get("process").get("cmdline")[0];
                }
            );

            self._circlePositions = [];
            self._circlePositionIndex = 0;
        },

        _moveTo: function (sourceSel, targetSel) {
            var el = $(sourceSel).remove();
            $(targetSel).append(el);
        },

        _onItemOut: function (target, data) {
            var self = this;

            d3.select(target).select("circle").classed({"hover": false});

            if (data.collection === self._binderProcesses) {
                self._moveTo(".link.source-" + data.id, ".linkBox.links");
                self._moveTo(".userlink.source-" + data.id, ".linkBox.userLinks");
                self._moveTo(".userlink.target-" + data.id, ".linkBox.userLinks");

                d3.selectAll(".link.source-" + data.id).classed({"hover": false});
                d3.selectAll(".userlink.source-" + data.id).classed({"hover": false});
                d3.selectAll(".userlink.target-" + data.id).classed({"hover": false});

                self.trigger("depends_view:onProcessOut", self._tip, data);
            }
            else if (data.collection === self._binderServices) {
                self._moveTo(".link.target-" + data.id, ".linkBox.links");
                d3.selectAll(".link.target-" + data.id).classed({"hover": false});

                self.trigger("depends_view:onServiceOut", self._tip, data);
            }

            self._tip.hide(data);
        },

        _onItemOver: function (target, data) {
            var self = this;

            d3.select(target).select("circle").classed({"hover": true});

            if (data.collection === self._binderProcesses) {
                self._moveTo(".link.source-" + data.id, ".linkBox.selectedLinks");
                self._moveTo(".userlink.source-" + data.id, ".linkBox.selectedLinks");
                self._moveTo(".userlink.target-" + data.id, ".linkBox.selectedLinks");

                d3.selectAll(".link.source-" + data.id).classed({"hover": true});
                d3.selectAll(".userlink.source-" + data.id).classed({"hover": true});
                d3.selectAll(".userlink.target-" + data.id).classed({"hover": true});

                self.trigger("depends_view:onProcessOver", self._tip, data);
            }
            else if (data.collection === self._binderServices) {
                self._moveTo(".link.target-" + data.id, ".linkBox.selectedLinks");
                d3.selectAll(".link.target-" + data.id).classed({"hover": true});

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

            userService.clients.forEach(function (pid) {
                if (self._binderProcesses.get(pid) != null) {
                    self._userLinks.addLink(userService.pid, pid);
                } else {
                    console.log("Target process " + pid + " unknown. Can't make user service link.");
                }
            });

            self._updateProcessLinks();
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

            self._updateProcessLinks();
            self._force.start();
        },

        _updateProcessLinks: function () {
            var self = this;
            var userLinks, goneLinks, newUserLinks, upUserLinks;

            userLinks = self._userLinkBox.selectAll(".userlink");
            upUserLinks = userLinks.data(function () {
                    return self._userLinks.getLinks(function (a, b) {
                        return {
                            source: self._binderProcesses.get(a),
                            target: self._binderProcesses.get(b)
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
                    return "userlink source-" + d.source.id + " target-" + d.target.id;
                })
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
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
                        return {
                            source: self._binderProcesses.get(a),
                            target: self._binderServices.get(b)
                        };
                    });
                },
                function (d) {
                    return "source-" + d.source.id + " target-" + d.target.id;
                }
            );
            newLinks = upLinks.enter();
            goneLinks = upLinks.exit();

            // Remove the links that are now missing.
            goneLinks.remove();

            // Refresh all the existing links position.
            links.attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });

            // Add the missing links.
            newLinks.append("line")
                .attr("class", function(d) {
                    return "link source-" + d.source.id + " target-" + d.target.id;
                })
                .attr("x1", function (l) { return l.source.x; })
                .attr("y1", function (l) { return l.source.y; })
                .attr("x2", function (l) { return l.target.x; })
                .attr("y2", function (l) { return l.target.y; });
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

                // Remove the links from that process.
                self._userLinks.removeAll(d.get("pid"));
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
                .classed({"node": true, "process": true})
                .attr("id", function (d) {
                    if (d.collection === self._binderServices) {
                        return "service_" + d.id;
                    }

                    return "pid_" + d.id;
                });

            newProcessNodeG
                .append("text")
                .attr("font-weight", "bold")
                .each(function (d) {
                    d.x = (2 * (Math.random() - 0.5)) * self._radius + self._centerX;
                    d.y = (2 * (Math.random() - 0.5)) * self._radius + self._centerY;
                    d.radius = 8;
                })
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
                .attr("id", function (d) {
                    return d.get("process_" + d.get("id"));
                })
                .attr("class", "node")
                .attr("r", function (d) {
                    return d.radius;
                })
                .each(function (newBinderProcess) {
                    newBinderProcess.get("process").on("change", function () {
                        // Schedule a timer to fetch the icon for this process.
                        setTimeout(function () {
                            self._fetchIcon(newBinderProcess);
                        }, 0);
                    });
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
                .attr("id", function (d) { return d.get("service_" + d.get("id")); })
                .attr("r", function (d)  { return d.radius; })
                .attr("id", function (d) { return "service_" + d.id;  })
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

            self.s1 = {
                x1: w / 3, y1: ymargin,
                x2: xmargin, y2: h / 3,
                g: function (y) {
                    var n = (xmargin - w / 3) / (h / 3 - ymargin);
                    var c = -1 * n * h / 3 + xmargin;
                    return n * y + c;
                }
            };
            self.s2 = {
                x1: xmargin, y1: h / 3,
                x2: xmargin, y2: 2 / 3 * h
            };
            self.s3 = {
                x1: xmargin, y1: 2 / 3 * h,
                x2: w / 3, y2: h - ymargin,
                g: function (y) {
                    var n = (w / 3 - xmargin) / ((h - ymargin) - 2 / 3 * h);
                    var c = -1 * n * (h - ymargin) + w / 3;
                    return n * y + c;
                }
            };

            var segSz = 2 * (self.s1.y2 - self.s1.y1) + (self.s2.y2 - self.s2.y1);
            var cPos = [];

            svcPerSide = Math.ceil(n / 2 + 1);

            for (var i = 0; i < Math.ceil(n / 2 + 1); i++) {
                var xleft, yleft = (segSz / svcPerSide * i) + ymargin;
                var xright, yright = yleft;

                if (yleft < self.s1.y2) {
                    xleft = self.s1.g(yleft);
                } else if (yleft > self.s3.y1) {
                    xleft = self.s3.g(yleft);
                } else {
                    xleft = self.s2.x1;
                }
                xright = w - xleft;

                cPos.push({
                    x: xleft, y: yleft, t: "left"
                });
                cPos.push({
                    x: xright, y: yright, t: "right"
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

            self._links = [];
            self._userLinks = new Linker.Undirected();

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

            self._binderServices.on("add", function () {
                self._onNewBinderService.apply(self, arguments);
            });

            self._binderProcesses.on("add", function () {
                self._onNewBinderProcess.apply(self, arguments);
            });

            self._binderProcesses.on("remove", function () {
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

            // Fire the events the services and processes that might be already in the collections.
            self._onNewBinderService();
            self._onNewBinderProcess();
        }
    });
});