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

const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const debug = require("debug")("be:utils");
const ChildProcess = require("child_process");
const process = require("process");
const readline = require("readline");

const ServiceManager = require("./ServiceManager.js");

let requests = {};
let sm = new ServiceManager.ServiceManager();

let readBinderStateFile = (successCallback, errorCallback) => {
    let stateFile = "/dev/binderfs/binder_logs/state",
        stateData = {},
        currentProc = null,
        currentContext = null,
        isdeadnodes = false,
        liner = readline.createInterface(fs.createReadStream(stateFile));

    liner.on("line", function (line) {
        let dataLine = line.trim().split(" ").filter((item) => {
            return item !== "";
        });
        let dataLineType = dataLine.shift();

        // Start of dead nodes
        if (line === "dead nodes:")
            isdeadnodes = true;

        if (isdeadnodes && (dataLineType === "node" || dataLineType == "dead"))
            return;
        else if (isdeadnodes && dataLineType == "proc")
            isdeadnodes = false;

        if (dataLineType === "proc") {
            currentProc = dataLine.shift();

            stateData[currentProc] = {};
            stateData[currentProc].pid = currentProc;
        }
        else if (currentProc && dataLineType === "context") {
            currentContext = dataLine.shift();

            stateData[currentProc][currentContext] = {};
            stateData[currentProc][currentContext].threads = [];
            stateData[currentProc][currentContext].refs = [];
            stateData[currentProc][currentContext].nodes = [];
        }
        else if (currentContext && currentProc && dataLineType === "thread") {
            let threadInfo = {};

            threadInfo.id = dataLine.shift().replace(":", "");
            while (dataLine.length > 0)
                threadInfo[dataLine.shift()] = dataLine.shift();

            stateData[currentProc][currentContext].threads.push(threadInfo);
        }
        else if (currentContext && currentProc && dataLineType === "ref") {
            let refInfo = {};

            refInfo.id = dataLine.shift().replace(":", "");

            refInfo[dataLine.shift()] = dataLine.shift();
            if (dataLine[0] == "dead") {
                dataLine.shift();
                refInfo.isdead = true;
            } else
                refInfo.isdead = false;

            while (dataLine.length > 0)
                refInfo[dataLine.shift()] = dataLine.shift();

            stateData[currentProc][currentContext].refs.push(refInfo);

        } else if (currentContext && currentProc && dataLineType === "node") {
            let nodeInfo = {};

            nodeInfo.id = dataLine.shift().replace(":", "");

            // There is 2 hexadecimal numbers on a "node" line.
            // I don't know what they are.
            nodeInfo.data = [dataLine.shift(), dataLine.shift()];

            while (dataLine.length > 0)
                nodeInfo[dataLine.shift()] = dataLine.shift();

            stateData[currentProc][currentContext].nodes.push(nodeInfo);
        }
    });

    liner.on("close", () => {
        return successCallback(stateData);
    });
};

let readBinderProcFile = (pid, successCallback, errorCallback) => {
    let procFile, procData;

    procFile = path.join("/dev/binderfs/binder_logs/proc", pid);
    procData = {};

    procData.pid = pid;
    procData.contexts = {};
    procData.threads = [];
    procData.refs = [];
    procData.nodes = [];

    fs.readFile(procFile, (err, data) => {
        if (err) {
            if (errorCallback)
                return errorCallback(err);
            else
                throw "readBinderProcFile error: " + err;
        }

        let dataLines = data.toString().split("\n");

        // Remove the first 2 lines: we already know them
        dataLines.splice(0, 2);

        for (let j = 0; j < dataLines.length; j++) {
            let dataLine = dataLines[j].trim().split(" ").filter((item) => {
                return item != "";
            });
            let dataLineType = dataLine.shift();
            let currentContext;

            if (dataLineType == "context") {
                currentContext = dataLine.shift();

                procData[currentContext].threads = [];
                procData[currentContext].refs = [];
                procData[currentContext].nodes = [];
            }
            else if (dataLineType == "thread") {
                let threadInfo = {};

                threadInfo.id = dataLine.shift().replace(":", "");
                while (dataLine.length > 0)
                    threadInfo[dataLine.shift()] = dataLine.shift();

                procData[currentContext].threads.push(threadInfo);
            }
            else if (dataLineType == "ref") {
                let refInfo = {};

                refInfo.id = dataLine.shift().replace(":", "");
                refInfo[dataLine.shift()] = dataLine.shift();

                if (dataLine[0] == "dead") {
                    dataLine.shift();
                    refInfo.isdead = true;
                } else
                    refInfo.isdead = false;

                while (dataLine.length > 0)
                    refInfo[dataLine.shift()] = dataLine.shift();

                procData[currentContext].refs.push(refInfo);

            } else if (dataLineType == "node") {
                let nodeInfo = {};

                nodeInfo.id = dataLine.shift().replace(":", "");

                // There is 2 hexadecimal numbers on a "node" line.
                // I don't know what they are.
                nodeInfo.data = [dataLine.shift(), dataLine.shift()];

                while (dataLine.length > 0)
                    nodeInfo[dataLine.shift()] = dataLine.shift();

                procData[currentContext].nodes.push(nodeInfo);
            }
        }

        return successCallback(procData);
    });
};

// Calls for findServiceNodeId MUST be serialized and no other
// Binder calls should be done within the same process.

let findServiceNodeId = (serviceName, binderName, resultCb) => {
    let knownNodes = [];
    let sg = sm.grabService(serviceName);

    sg.on("statusChange", (newStatus) => {
        if (newStatus == ServiceManager.GRAB_OK) {
            readBinderStateFile((binderData) => {
                let currentNodes = [], newNodes, newNode, iface;
                let procData = binderData[sg.pid];

                for (let ref in procData[binderName].refs)
                    if (procData[binderName].refs[ref].node != 1)
                        currentNodes.push(procData[binderName].refs[ref].node);

                newNodes = [].concat(currentNodes.filter(x => !knownNodes.includes(x)));
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
            }, (/*err*/) => {
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
    findServiceNodeId: findServiceNodeId
};
