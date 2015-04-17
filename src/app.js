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

var express = require("express");
var exStatic = require("serve-static");
var path = require("path");
var http = require("http");
var _ = require("underscore");
var pslook = require("pslook");
var Binder = require("jsbinder");
var fs = require("fs");
var cache = require("js-cache");

// Local modules
var BinderUtils = require("./binderUtils.js");

// Express application
var app = express();
var server = http.createServer(app);
var serviceManager = new Binder.ServiceManager();
var defaultIcon = "public/images/default-icon.png";

app.set("env", process.env.ENV || "development");
app.set("port", process.env.PORT || 3200);
app.set("views", path.join(__dirname, "views"));
app.set("json spaces", 2);

// Static files.
app.use(exStatic(path.join(__dirname, "public"), k{ index: false }));

var imgCache = new cache();

// Precache the default icon.
fs.stat(defaultIcon, function (err, defStat) {
    var defIn = fs.createReadStream(defaultIcon);

    defIn.on("readable", function () {
        var defBuf = defIn.read(defStat.size);

        if (defBuf != null)
            imgCache.set("default", defBuf);
        else
            throw "Failed to read default icon";
    });
});

/**
 * Fetch the an icon for a particular package.
 */
function fetchIcon (pkg, options) {
    var imgBuf;
    var hasDefault = (options.default && options.default != '');

    // Check in the memory cache.
    if (!(imgBuf = imgCache.get(pkg))) {
        // Stream a request.

        http.get("http://localhost:3001/icon/" + pkg, function (r) {
            var newImgBuf, sz, idx = 0;

            if (r.statusCode == 200) {
                sz = parseInt(r.headers["content-length"]);
                newImgBuf = new Buffer(sz);

                r.on("data", function (imgChunk) {
                    imgChunk.copy(newImgBuf, idx);
                    idx += imgChunk.length;
                });

                r.on("end", function () {
                    imgCache.set(pkg, newImgBuf, 86400000);
                    if (options.success) options.success(newImgBuf);
                });
            }
            else {
                if (hasDefault) {
                    imgBuf = imgCache.get("default");
                    if (options.success) options.success(imgBuf);
                } else {
                    if (options.error) options.error();
                }
            }
        }).on("error",
            function () {
                if (hasDefault) {
                    imgBuf = imgCache.get("default");
                    if (options.success) options.success(imgBuf);
                } else {
                    if (options.error) options.error();
                }
            });
    }
    else {
        if (options.success) options.success(imgBuf);
    }
}

app.head("/icon/:app", function (req, res) {
    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    fetchIcon(req.params.app, {
        success: function (imgBuf) {
            res.set("Content-length", imgBuf.length);
            res.end();
        },
        error: function () {
            res.status(404).end();
        }
    });
});

app.get("/icon/:app", function (req, res) {
    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    fetchIcon(req.params.app, {
        success: function (imgBuf) {
            res.set("Content-length", imgBuf.length);
            res.write(imgBuf, function () {
                res.end();
            });
        },
        error: function () {
            res.status(404).end();
        }
    });
});

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

app.get("/binder/procs", function (req, res) {
    try {
        BinderUtils.readBinderStateFile(function (binderProcs) {
            res.json(_.map(_.keys(binderProcs), function (binderProcPid) {
                return { pid: binderProcPid  };
            }));
        });
    } catch (ex) {
        res.status(404).send();
    }
});

app.get("/binder/procs/:pid([0-9]+)", function (req, res) {
    try {
        BinderUtils.readBinderStateFile(function (binderProcs) {
            if (binderProcs[req.params.pid])
                res.json(binderProcs[req.params.pid]);
            else
                res.status(404).send();
        });
    } catch (ex) {
        res.status(404).send();
    }
});

app.get("/binder/services/:serviceName", function (req, res) {
    try {
        // Make a catalog of node IDs to PID because findServiceNodeId doesn't provide
        // us with the PID.
        BinderUtils.readBinderStateFile(function (binderProcs) {
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

                if (!node && !iface)
                    res.json(response);
                else {
                    if (iface) response.iface = iface;

                    response.node = node;
                    response.pid = binderProcsByNode[node].pid;

                    res.json(response);
                }
            });
        });
    } catch (ex) {
        res.status(404).send();
    }
});

app.get("/binder/services", function (req, res) {
    res.json(_.map(serviceManager.list(), function (serviceName) {
        return { name: serviceName }
    }));
});

server.listen(app.get("port"), function() {});
