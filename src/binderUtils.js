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

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const _ = require("underscore");
const debug = require("debug")("be:utils");
const ChildProcess = require("child_process");
const process = require("process");
const readline = require("readline");

const ServiceManager = require("./ServiceManager.js");

var requests = {};
var sm = new ServiceManager.ServiceManager();

var readAllBinderProcFiles = function (resultCb) {
    var results = {},
        queue = Queue();

    queue.on("end", function () {
        resultCb(results);
    });

    fs.readdir("/dev/binderfs/binder_logs/proc", function (err, files) {
        for (var i in files) {
            (function (file, results) {
                queue.push(function (queueCb) {
                    var procFile = path.join("/dev/binderfs/binder_logs/proc", file);

                    fs.exists(procFile, function (exists) {
                        if (exists) {
                            readBinderProcFile(file,
                                               function (procData) {
                                                   results[file] = procData;
                                                   queueCb();
                                               },
                                               // Ignore read errors there. Just handle the missing process later on.
                                               function (err) { });
                        } else {
                            console.log("Process file " + file + " does not exists.");
                        }
                    });
                });
            })(files[i], results);
        }

        queue.start();
    });
};

var readBinderStateFile = function (successCallback, errorCallback) {
    var stateFile = "/dev/binderfs/binder_logs/state",
        stateData = {},
        currentProc = null,
        liner = readline.createInterface(fs.createReadStream(stateFile));

    liner.on("line", function (line) {
        var dataLine = _.filter(line.trim().split(" "), function (item) {
            return item !== "";
        });
        var dataLineType = dataLine.shift();

        if (dataLineType == "proc") {
            currentProc = dataLine.shift();

            stateData[currentProc] = {};
            stateData[currentProc].pid = currentProc;
            stateData[currentProc].threads = [];
            stateData[currentProc].refs = [];
            stateData[currentProc].nodes = [];
        }
        else if (currentProc && dataLineType === "thread") {
            var threadInfo = {};

            threadInfo.id = dataLine.shift().replace(":", "");
            while (dataLine.length > 0) {
                threadInfo[dataLine.shift()] = dataLine.shift();
            }

            stateData[currentProc].threads.push(threadInfo);
        }
        else if (currentProc && dataLineType === "ref") {
            var refInfo = {};

            refInfo.id = dataLine.shift().replace(":", "");

            refInfo[dataLine.shift()] = dataLine.shift();
            if (dataLine[0] == "dead") {
                dataLine.shift();
                refInfo.isdead = true;
            } else
                refInfo.isdead = false;

            while (dataLine.length > 0) {
                refInfo[dataLine.shift()] = dataLine.shift();
            }

            stateData[currentProc].refs.push(refInfo);

        } else if (currentProc && dataLineType === "node") {
            var nodeInfo = {};

            nodeInfo.id = dataLine.shift().replace(":", "");

            // There is 2 hexadecimal numbers on a "node" line.
            // I don't know what they are.
            nodeInfo.data = [dataLine.shift(), dataLine.shift()];

            while (dataLine.length > 0) {
                nodeInfo[dataLine.shift()] = dataLine.shift();
            }

            stateData[currentProc].nodes.push(nodeInfo);
        }
    });

    liner.on("close", function () {
        return successCallback(stateData);
    });
};

var readBinderProcFile = function (pid, successCallback, errorCallback) {
    var procFile, procData;

    procFile = path.join("/dev/binderfs/binder_logs/proc", pid);
    procData = {};

    procData.pid = pid;
    procData.threads = [];
    procData.refs = [];
    procData.nodes = [];

    fs.readFile(procFile, function (err, data) {
        if (err) {
            if (errorCallback)
                return errorCallback(err);
            else
                throw "readBinderProcFile error: " + err;
        }

        var dataLines = data.toString().split("\n");

        // Remove the first 2 lines: we already know them
        dataLines.splice(0, 2);

        for (var j = 0; j < dataLines.length; j++) {
            var dataLine = _.filter(dataLines[j].trim().split(" "), function (item) {
                return item != "";
            });
            var dataLineType = dataLine.shift();

            if (dataLineType == "thread") {
                var threadInfo = {};

                threadInfo.id = dataLine.shift().replace(":", "");
                while (dataLine.length > 0) {
                    threadInfo[dataLine.shift()] = dataLine.shift();
                }

                procData.threads.push(threadInfo);
            }
            else if (dataLineType == "ref") {
                var refInfo = {};

                refInfo.id = dataLine.shift().replace(":", "");

                refInfo[dataLine.shift()] = dataLine.shift();
                if (dataLine[0] == "dead") {
                    dataLine.shift();
                    refInfo.isdead = true;
                } else
                    refInfo.isdead = false;

                while (dataLine.length > 0) {
                    refInfo[dataLine.shift()] = dataLine.shift();
                }

                procData.refs.push(refInfo);

            } else if (dataLineType == "node") {
                var nodeInfo = {};

                nodeInfo.id = dataLine.shift().replace(":", "");

                // There is 2 hexadecimal numbers on a "node" line.
                // I don't know what they are.
                nodeInfo.data = [dataLine.shift(), dataLine.shift()];

                while (dataLine.length > 0) {
                    nodeInfo[dataLine.shift()] = dataLine.shift();
                }

                procData.nodes.push(nodeInfo);
            }
        }

        return successCallback(procData);
    });
};

// Calls for findServiceNodeId MUST be serialized and no other
// Binder calls should be done within the same process.

var findServiceNodeId = (serviceName, resultCb) => {
    let knownNodes = [];
    let self = this;

    let sg = sm.grabService(serviceName);

    sg.on("statusChange", (newStatus) => {
        if (newStatus == ServiceManager.GRAB_OK) {
            readBinderStateFile(
                function (stateData) {
                    var currentNodes = [], newNodes, newNode, iface;
                    var procData = stateData[sg.pid];

                    for (var ref in procData.refs) {
                        if (procData.refs[ref].node != 1) {
                            currentNodes.push(procData.refs[ref].node);
                        }
                    }

                    newNodes = [].concat(_.difference(currentNodes, knownNodes));
                    sg.release();                    
                    
                    while (newNodes.length > 0) {
                        newNode = newNodes.pop();
                        knownNodes = currentNodes;

                        iface = sm.getService(serviceName).interface;

                        /**
                         * FIXME: Node 2 is assumed to be the service manager.
                         */
                        if (newNode == 2) continue;

                        resultCb(newNode, iface);
                    }
                },

                function (/*err*/) {
                    resultCb(null, null);
                });
        } else {
            // We couldn't grab the service for some reason.
            resultCb(null, null);
        }
    });
};

module.exports = {
    readBinderStateFile: readBinderStateFile,
    readBinderProcFile: readBinderProcFile,
    readAllBinderProcFiles: readAllBinderProcFiles,
    findServiceNodeId: findServiceNodeId
};
