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

var Binder = require("jsbinder");
var Queue = require("queue");
var Guid = require("guid");
var fs = require("fs");
var path = require("path");
var cp = require("child_process");
var _ = require("underscore");
var debug = require("debug")("be:utils");

var requests = {};
var sm = new Binder.ServiceManager();

var readAllBinderProcFiles = function (resultCb) {
    var results = {},
        queue = Queue();

    queue.on("end", function () {
        resultCb(results);
    });

    fs.readdir("/sys/kernel/debug/binder/proc", function (err, files) {
        for (var i in files) {
            (function (file, results) {
                queue.push(function (queueCb) {
                    var procFile = path.join("/sys/kernel/debug/binder/proc", file);

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
                            console.log("Process file " + file + " does not exists.")
                        }
                    });
                });
            })(files[i], results);
        }

        queue.start();
    });
};

var readBinderStateFile = function (successCallback, errorCallback) {
    var stateFile = "/sys/kernel/debug/binder/state",
        stateData = {},
        currentProc = null;

    fs.readFile(stateFile, function (err, data) {
        if (err) {
            if (errorCallback)
                return errorCallback(err);
            else
                throw "readBinderProcFile error: " + err;
        }

        var dataLines = data.toString().split("\n");

        for (var j = 0; j < dataLines.length; j++) {
            var dataLine = _.filter(dataLines[j].trim().split(" "), function (item) {
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
        }

        return successCallback(stateData);
    });
};

var readBinderProcFile = function (pid, successCallback, errorCallback) {
    var procFile, procData;

    procFile = path.join("/sys/kernel/debug/binder/proc", pid);
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

var findServiceNodeId = function (serviceName, resultCb) {
    var c = cp.fork("binderUtils_child.js", [serviceName]);

    c.on("message", function (msg) {
        resultCb(parseInt(msg.node), msg.iface);
    });
};

module.exports = {
    readBinderStateFile: readBinderStateFile,
    readBinderProcFile: readBinderProcFile,
    readAllBinderProcFiles: readAllBinderProcFiles,
    findServiceNodeId: findServiceNodeId
};
