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

/* This file is kept for reference. */

define(function (require) {
    var Backbone = require("backbone");
    var BinderServices = require("models/BinderServices");
    var Function = require("models/Function");
    var d3 = require("d3/d3");
    var $ = require("jquery");
    var _ = require("underscore");

    return Backbone.View.extend({

        _colorScale: d3.scale.category10().domain([1, 2, 3]),

        select: function (selectedBS) {},

        unselect: function (unselectedBS) {},

        initialize: function (opts) {
            var self = this;

            self._binderServices = opts.binderServices;
            self._binderProcesses = opts.binderProcesses;
            self._functions = opts.functions;
        },

        resize: function () {},

        _onRefMouseOver: function (process, service) {
            var rectSelector = [".process_" + process.get("pid"), ".service_" + service.get("name")].join("");
            var textServiceSelector = [".column", ".label", ".service_" + service.get("name")].join("");
            var textProcessSelector = [".row", ".label", ".process_" + process.get("pid")].join("");
            var $target;

            $target = $(rectSelector);
            $target.css("fill", "red");

            $target = $(textServiceSelector);
            $target.css("font-weight", "bold");

            $target = $(textProcessSelector);
            $target.css("font-weight", "bold");
        },

        _onRefMouseOut: function (process, service) {
            var self = this;
            var rectSelector = [".process_" + process.get("pid"), ".service_" + service.get("name")].join("");
            var textServiceSelector = [".column", ".label", ".service_" + service.get("name")].join("");
            var textProcessSelector = [".row", ".label", ".process_" + process.get("pid")].join("");
            var $target;

            $target = $(rectSelector);
            $target.css("fill", self._colorScale(1));

            $target = $(textServiceSelector);
            $target.css("font-weight", "normal");

            $target = $(textProcessSelector);
            $target.css("font-weight", "normal");
        },

        _onServiceMouseOver: function (service) {
            var self = this;
            var rectSelector = [".service_" + service.get("name")].join("");
            var $target;

            $target = $(rectSelector);
            $target.css("fill", "red");
        },

        _onServiceMouseOut: function (service) {
            var self = this;
            var rectSelector = [".service_" + service.get("name")].join("");
            var $target;

            $target = $(rectSelector);
            $target.css("fill", self._colorScale(1));
        },

        _onProcessMouseOver: function (d) {
            console.log("Processmouseover");
        },

        _onProcessMouseOut: function (d) {
            console.log("Processmouseout");
        },

        renderGraph: function () {
            var self = this;
            var width = $(self.el).width(),
                height = $(self.el).height(),
                margin = {top: 160, right: 0, bottom: 10, left: 160},
                processNames = d3.range(self._binderProcesses.length).sort(function (a, b) {
                    return d3.ascending(
                        self._binderProcesses.at(a).get("process").get("cmdline")[0],
                        self._binderProcesses.at(b).get("process").get("cmdline")[0]);
                }),
                serviceNames = d3.range(self._binderServices.length).sort(function (a, b) {
                    return d3.ascending(
                        self._binderServices.at(a).get("name"),
                        self._binderServices.at(b).get("name"));
                }),
                x = d3.scale.ordinal().rangeBands([0, width]).domain(serviceNames),
                y = d3.scale.ordinal().rangeBands([0, height]).domain(processNames),
                svgWidth = serviceNames.length * x.rangeBand() + margin.left + margin.right,
                svgHeight = processNames.length * y.rangeBand() + margin.top + margin.bottom;

            self._svg = d3.select(self.el).append("svg")
                .attr("width", svgWidth)
                .attr("height", svgHeight)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            self._svg.append("rect")
                .attr("class", "background")
                .attr("width", width)
                .attr("height", height);

            var row = self._svg.selectAll(".row")
                .data(self._binderProcesses.models)
                .enter()
                  .append("g")
                  .attr("class", "row")
                  .attr("transform", function(binderProcess, i) {
                      return "translate(0," + y(i) + ")";
                  })
                  .each(function (row) {
                    d3.select(this).selectAll(".cell")
                        .data(function () {
                            return self._binderServices.models;
                        })
                        .enter()
                          .append("rect")
                          .attr("class", function (d, i) {
                              return ["cell", "service_" + d.get("name"), "process_" + row.get("pid")].join(" ");
                          })
                          .attr("x", function(d, i) {
                              return x(i);
                          })
                          .attr("width", x.rangeBand())
                          .attr("height", y.rangeBand())
                          .style("fill", function(d) {
                              if (_.some(row.getServiceRefs(), function (r) {
                                  return d.get("name") == r.get("name");
                              }))
                                  return self._colorScale(1);
                              else
                                  return "none";
                          })
                          .on("mouseover", function (d, i) { self._onRefMouseOver.call(self, row, d); })
                          .on("mouseout", function (d, i) { self._onRefMouseOut.call(self, row, d); });
                  });

            row.append("line")
                .attr("x2", width);

            row.append("text")
                .attr("x", 0)
                .attr("y", x.rangeBand() / 2)
                .attr("dy", ".32em")
                .attr("class", function (d) {
                    return ["row", "label", "process_" + d.get("pid")].join(" ");
                })
                .attr("text-anchor", "end")
                .text(function(d, i) {
                    return self._binderProcesses.at(i).get("process").get("cmdline")[0];
                })
                .on("mouseover", function (d, i) { self._onProcessMouseOver.call(self, d); })
                .on("mouseout", function (d, i) { self._onProcessMouseOut.call(self, d); });

            var column = self._svg.selectAll(".column")
                .data(self._binderServices.models)
                .enter()
                  .append("g")
                  .attr("class", "column")
                  .attr("transform", function(binderService, i) {
                      return "translate(" + x(i) + ")rotate(-90)";
                  });

            column.append("line")
                .attr("x1", -height);

            column.append("g")
                .attr("transform","rotate(30)")
                .append("text")
                .attr("class", function (d) {
                    return ["column", "label", "service_" + d.get("name")].join(" ");
                })
                .attr("x", 6)
                .attr("y", x.rangeBand() / 2)
                .attr("dy", ".32em")
                .attr("text-anchor", "start")
                .text(function(d, i) {
                    return self._binderServices.at(i).get("name");
                })
                .on("mouseover", function (d, i) { self._onServiceMouseOver.call(self, d); })
                .on("mouseout", function (d, i) { self._onServiceMouseOut.call(self, d); });
        },

        render: function () {
            var self = this;
            self.el = self.box;

            // Rendering will be done when loading the data will be complete.
        }
    });
});