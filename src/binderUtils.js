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

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const util = require("util");

const ServiceManager = require("./ServiceManager.js");
const Binder = require("./DataObjects.js");
const debug = require("debug")("be:utils");

let readBinderStateFile = (successCallback, errorCallback) => {
    let stateFile = "/dev/binderfs/binder_logs/state",
        currentProcPid = null,
        currentProc = null,
        currentContextName = null,
        currentContext = null,
        isdeadnodes = false,
        data = new Binder(),
        liner = readline.createInterface(fs.createReadStream(stateFile));

    liner.on("line", function (line) {
        let dataLine = line.trim().split(" ").filter((item) => {
            return item !== "";
        });
        let dataLineType = dataLine.shift();

        // Start of dead nodes
        if (line === "dead nodes:")
            isdeadnodes = true;

        // Skip the "dead nodes" until we find the first actual node.
        if (isdeadnodes && (dataLineType === "node" || dataLineType == "dead"))
            return;

        // Done reading the dead nodes.
        else if (isdeadnodes && dataLineType == "proc")
            isdeadnodes = false;

        if (dataLineType === "proc") {
            currentProcPid = parseInt(dataLine.shift());
            currentProc = data.addProcess(currentProcPid);
        }
        else if (currentProc && dataLineType === "context") {
            currentContextName = dataLine.shift();
            currentContext = currentProc.addContext(currentContextName);
        }
        else if (currentContext && currentProc && dataLineType === "thread") {
            let threadId, thread;

            threadId = parseInt(dataLine.shift().replace(":", ""));
            thread = currentContext.addThread(threadId);

            dataLine.shift(); // Desc
            thread.l = parseInt(dataLine.shift());

            dataLine.shift(); // need_return
            thread.need_return = parseInt(dataLine.shift());
        }
        else if (currentContext && currentProc && dataLineType === "ref") {
            let refId, ref;

            refId = parseInt(dataLine.shift().replace(":", ""));
            ref = currentContext.addRef(refId);

            dataLine.shift(); // Desc
            ref.desc = parseInt(dataLine.shift());

            if (dataLine[0] == "dead") {
                dataLine.shift();
                ref.dead = true;
            } else
                ref.dead = false;

            dataLine.shift(); // node
            ref.node = parseInt(dataLine.shift());

            dataLine.shift(); // s
            ref.s = parseInt(dataLine.shift());

            dataLine.shift(); // w
            ref.w = parseInt(dataLine.shift());

        } else if (currentContext && currentProc && dataLineType === "node") {
            let node, nodeId, s;

            s = dataLine.shift().replace(":", "");
            nodeId = parseInt(s);
            if (!nodeId || !Number.isInteger(nodeId)) {
                debug(`Invalid nodeId ${s}, discarding record`);
                return;
            }
            else node = currentContext.addNode(nodeId);

            // There is 2 hexadecimal numbers on a "node" line.  I
            // don't know what they are.
            dataLine.shift(); dataLine.shift();

            dataLine.shift(); // pri
            node.pri = dataLine.shift();
            dataLine.shift(); // hs
            node.hs = parseInt(dataLine.shift());
            dataLine.shift(); // hw
            node.hw = parseInt(dataLine.shift());
            dataLine.shift(); // ls
            node.ls = parseInt(dataLine.shift());
            dataLine.shift(); // lw
            node.lw = parseInt(dataLine.shift());
            dataLine.shift(); // is
            node.is = parseInt(dataLine.shift());
            dataLine.shift(); // iw
            node.iw = parseInt(dataLine.shift());
            dataLine.shift(); // tr
            node.tr = parseInt(dataLine.shift());
            dataLine.shift(); // proc

            while (dataLine.length > 0) {
                s = dataLine.shift();
                let pid = parseInt(s);

                if (!nodeId || !Number.isInteger(pid))
                    debug(`Invalid PID ${s}, discarding record`);
                else
                    node.addPid(pid);
            }
        }
    });

    liner.on("close", () => {
        return successCallback(data);
    });
};

let findServiceNodeId = (serviceManager, serviceName, resultCb) => {
    let sg = serviceManager.grabService(serviceName);

    // The service grab should add a new entry to the binder logs
    // corresponding to the process that is doing the grab.

    sg.on("statusChange", (newStatus) => {
        // If the service exists, the grab should be successful.

        if (newStatus == ServiceManager.GRAB_OK) {

            // Read the binder state file to find the process grabbing
            // the service.
            readBinderStateFile((binderData) => {
                let proc = binderData.getProcess(sg.pid);

                sg.release();

                if (proc.hasContext(serviceManager.name)) {
                    let ref, refs = proc.getContext(serviceManager.name).getRefs();

                    // The grabber will have a reference to the
                    // service manager it interacted with and to the
                    // service it's grabbing. We only care about the
                    // second result.

                    // refs should be 1 or 2 items. (maybe even always 2)?
                    assert(refs.length == 1 || refs.length == 2);

                    // We pop the last item only, so as to ignore the
                    // first one.
                    ref = refs.pop();

                    //console.log(`${serviceName} returning ${util.inspect(ref)}`);

                    resultCb(ref.node);
                }
                // No process data.
                else resultCb(null);

            }, (/*err*/) => {
                sg.release();
                resultCb(null);
            });
        } else {
            // We couldn't grab the service for some reason.
            sg.release();
            resultCb(null);
        }
    });
};

module.exports = {
    readBinderStateFile: readBinderStateFile,
    findServiceNodeId: findServiceNodeId
};
