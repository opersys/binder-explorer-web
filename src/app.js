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

var express = require("express");
var exStatic = require("serve-static");
var fs = require("fs");
var path = require("path");
var util = require("util");
var http = require("http");
var queue = require("queue");

// Express application
var app = express();
var server = http.createServer(app);

app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("json spaces", 2);

// Static files.
app.use(exStatic(path.join(__dirname, "public"), { index: false }));

app.get("/procedures", function (req, res) {

});

// Routes
app.get("/binder", function (req, res) {
    var procs = [];
    var nodeToProc = {};
    var nodeRefs = {};
    var filesQueue = queue();

    fs.readdir("/sys/kernel/debug/binder/proc", function (err, files) {
        var file;

        filesQueue.on("end", function () {
            var graphNodes = [];
            var graphLinks = [];

            for (var k = 0; k < procs.length; k++) {
                var isVm = false;
                var procExePath = path.join("/proc", procs[k], "exe");
                var procCmdLinePath = path.join("/proc", procs[k], "cmdline");
                var exePath = path.basename(fs.readlinkSync(procExePath));

                if (exePath == "app_process") {
                    exePath = fs.readFileSync(procCmdLinePath).toString("utf-8").replace(/\u0000/g, '');
                    isVm = true;
                }

                graphNodes.push({
                    pid: procs[k],
                    name: exePath,
                    isVm: isVm
                });

                for (var l = 0; l < nodeRefs[procs[k]].length; l++) {
                    graphLinks.push({
                        source: procs[k],
                        target: nodeToProc[nodeRefs[procs[k]][l]]
                    });
                }
            }

            res.json({
                nodeRefs: nodeRefs,
                nodeToProc: nodeToProc,
                nodes: graphNodes,
                links: graphLinks
            });
        });

        while (file = files.shift()) {
            (function f(currentProc) {
                filesQueue.push(function (queueCallback) {
                    var procFile;

                    procFile = path.join("/sys/kernel/debug/binder/proc", currentProc);

                    nodeRefs[currentProc]  = [];
                    procs.push(currentProc);

                    fs.readFile(procFile, function (err, data) {
                        var nodeNo, dataLines = data.toString().split("\n");

                        // Remove the first 2 lines.
                        dataLines.splice(0, 2);

                        for (var j = 0; j < dataLines.length; j++) {
                            var dataLine = dataLines[j].trim().split(" ");

                            if (dataLine[0] == "thread") {}
                            else if (dataLine[0] == "ref") {
                                if (dataLine[4] != "dead") {
                                    nodeNo = dataLine[5].replace(":", "");
                                    nodeRefs[currentProc].push(nodeNo);
                                }
                            } else if (dataLine[0] == "node") {
                                nodeNo = dataLine[1].replace(":", "");
                                nodeToProc[nodeNo] = currentProc;
                            }
                        }

                        queueCallback();
                    });
                });
            })(file);
        }

        filesQueue.start();
    });
});

server.listen(app.get("port"), function() {});
