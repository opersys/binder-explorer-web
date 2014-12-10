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
var _ = require("underscore");
var pslook = require("pslook");
var Binder = require("jslibbinder");
var util = require("util");

// Local modules
var BinderUtils = require("./binderUtils.js");

// Express application
var app = express();
var server = http.createServer(app);
var serviceManager = new Binder.ServiceManager();

app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));
app.set("json spaces", 2);

/*
API draft:

/binder: List of services
  Returns: a simple flat list of service names.

/binder/:serviceName: Fetch informations about the service called 'serviceName'
  A JSON object containing the following data:
    pid: Likely PID of the service or nothing if no PID was found.
    iface: Interface implemented by the service or nothing if no PID was found.

/proc: List all the process in the system
/proc/:pid: Detail about one specific process.

*/

// Static files.
app.use(exStatic(path.join(__dirname, "public"), { index: false }));

// Routes.
app.get("/proc", function (req, res) {
    pslook.list(function (err, processes) {
        if (err)
            res.status(404).end();

        res.json(processes).end();
    }, {fields: pslook.ALL});
});

app.get("/proc/:pid", function (req, res) {
    pslook.read(req.params.pid, function (err, process) {
        if (err)
            res.status(404).end();

        res.json(process).end();
    }, {fields: pslook.ALL});
});

app.get("/binder/:serviceName", function (req, res) {
    try {
        // Make a catalog of node IDs to PID because findServiceNodeId doesn't provide
        // us with the PID.

        BinderUtils.readAllBinderProcFiles(function (binderProcs) {
            var binderProcsByNode = {};

            _.each(_.keys(binderProcs), function (binderPid) {
                _.each(binderProcs[binderPid].nodes, function (nodeData) {
                    binderProcsByNode[nodeData.id] = {};
                    binderProcsByNode[nodeData.id] = binderProcs[binderPid];
                    binderProcsByNode[nodeData.id].node = nodeData.id;
                    binderProcsByNode[nodeData.id].pid = binderPid;
                });
            });

            BinderUtils.findServiceNodeId(req.params.serviceName, function (node, iface) {
                var response = {};

                if (iface) response.iface = iface;

                response.node = node;
                response.pid = binderProcsByNode[node].pid;
                response.threads = binderProcsByNode[node].threads;
                response.refs = binderProcsByNode[node].refs;
                response.nodes = binderProcsByNode[node].nodes;

                res.json(response);
            });
        });
    } catch (ex) {
        res.status(404).send();
    }
});

app.get("/binder", function (req, res) {
    res.json(_.map(serviceManager.list(), function (serviceName) {
        return { name: serviceName }
    }));
});

server.listen(app.get("port"), function() {});
