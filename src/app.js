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

"use strict";

const async = require("async");
const express = require("express");
const exStatic = require("serve-static");
const path = require("path");
const http = require("http");
const pslook = require("pslook");
const fs = require("fs");
const cache = require("js-cache");
const debug = require("debug")("be");
const SocketIO = require("socket.io");
const domain = require("domain");
const process = require("process");

// Local modules
const BinderUtils = require("./binderUtils.js");
const BinderWatcher = require("./binderWatcher.js");
const DataFeeder = require("./dataFeeder.js");
const ServiceManager = require("./ServiceManager.js");
const PackageManager = require("./PackageManager.js");
const ActivityManager = require("./ActivityManager.js");

// Express application
const app = express();
const server = http.createServer(app);
const serviceManager = new ServiceManager.ServiceManager();

var argv = require("yargs")
    .options({
        "p": {
            alias: "port",
            "default": "3000",
            type: "number"
        },
        "e": {
            alias: "environment",
            "default": "development",
            type: "string"
        },
        "d": {
            alias: "directory",
            type: "string",
            "default": process.cwd()
        }
    }).argv;

app.set("env", argv.environment);
app.set("port", argv.port);
app.set("socket", argv.socket);
app.set("views", path.join(__dirname, "views"));
app.set("directory", argv.directory);
app.set("json spaces", 2);

var defaultIcon = path.join(app.get("directory"), "public/images/default-icon.png");
var imgCache = new cache();

var agent = new http.Agent();
agent.maxSockets = 1000;

// Precache the default icon.
fs.stat(defaultIcon, (err, defStat) => {
    var defIn = fs.createReadStream(defaultIcon);

    defIn.on("readable", () => {
        var defBuf = defIn.read(defStat.size);

        if (defBuf != null)
            imgCache.set("default", defBuf);
    });

    defIn.on("error", () => {
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
        var opts = {
            hostname: "127.0.0.1",
            port: "3001",
            path: "/icon/" + pkg,
            method: "GET",
            agent: agent
        };

        debug("Performing HTTP request to /icon/" + pkg);

        var req = http.request(opts, (r) => {
            var newImgBuf, sz, idx = 0;

            debug("Received HTTP request from /icon/" + pkg);

            if (r.statusCode === 200) {
                sz = parseInt(r.headers["content-length"]);
                newImgBuf = new Buffer(sz);

                r.on("data", (imgChunk) => {
                    imgChunk.copy(newImgBuf, idx);
                    idx += imgChunk.length;
                });

                r.on("end", () => {
                    imgCache.set(pkg, newImgBuf, 86400000);
                    r.socket.destroy();
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
        });

        req.on("error", (err) => {
            debug("Request /icon/" + pkg + " error: " + err.message);

            if (hasDefault) {
                imgBuf = imgCache.get("default");
                if (options.success) options.success(imgBuf);
            } else {
                if (options.error) options.error();
            }
        });

        req.setTimeout(500, () => {
            debug("Request /icon/" + pkg + " timedout");
            if (options.error) options.error();
        });

        req.end();
    }
    else {
        if (options.success) options.success(imgBuf);
    }
}

/**
 * Fetch the AIDL interface for a particular class name.
 */
function fetchAidl(serviceName, serviceClassName, options) {
    // Stream a request.
    var opts = {
        hostname: "127.0.0.1",
        port: "3001",
        path: "/aidl/" + serviceName + "/" + serviceClassName,
        method: "GET",
        agent: agent
    };

    debug("Performing HTTP request on /aidl/" + serviceName + "/" + serviceClassName);

    var req = http.request(opts, (r) => {
        var sz, raidlBuf, idx;

        debug("Received HTTP request from /aidl/" + serviceName + "/" + serviceClassName);

        if (r.statusCode === 200) {
            sz = parseInt(r.headers["content-length"]);
            raidlBuf = new Buffer(sz);

            r.on("data", (raidlChunk) => {
                raidlChunk.copy(raidlBuf, idx);
                idx += raidlChunk.length;
            });

            r.on("end", () => {
                if (options.success) options.success(raidlBuf);
            });
        }
    }).on("error", () => {
        if (options.error) options.error();
    });

    req.setTimeout(500, () => {
        if (options.error) options.error();
    });

    req.end();
}

app.head("/icon/:app", (req, res) => {
    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    fetchIcon(req.params.app, {
        success: (imgBuf) => {
            res.set("Content-length", imgBuf.length);
            res.end();
        },
        error: () => {
            res.status(404).end();
        }
    });
});

app.get("/icon/:app", (req, res) => {
    res.set("Content-type", "image/png");
    res.set("Cache-Control", "public, max-age=86400000");

    fetchIcon(req.params.app, {
        success: (imgBuf) => {
            res.set("Content-length", imgBuf.length);

            res.write(imgBuf, () => {
                res.end();
            });
        },
        error: () => {
            res.status(404).end();
        }
    });
});

// Routes.
app.get("/proc", (req, res) => {
    var pslook_domain = domain.create();

    pslook_domain.on("error", (err) => {
        debug("Error in pslook: " + err);
        res.status(404).end();
    });

    pslook_domain.run(() => {
        pslook.list((err, processes) => {
            var procsData = [];

            if (err)
                res.status(404).end();

            async.each(processes, (item, callback) => {
                try {
                    pslook.read(item.pid, (err, procData) => {
                        if (err) {
                            callback(err);
                        } else {
                            procsData.push(procData);
                            callback();
                        }
                    }, {fields: pslook.ALL});
                } catch (ex) {
                    debug("Failed to read process " + item.pid);
                    res.status(404).end();
                }
            }, () => {
                res.json(procsData).end();
            });
        }, {fields: pslook.ALL});
    });
});

app.get("/proc/:pid", (req, res) => {
    var pslook_domain = domain.create();

    pslook_domain.on("error", (err) => {
        debug("Error in pslook: " + err);
        res.status(404).end();
    });

    pslook_domain.run(() => {
        pslook.read(req.params.pid, (err, process) => {
            if (err) {
                res.status(404).end();
            } else {
                res.json(process).end();
            }
        }, {fields: pslook.ALL});
    });
});

function getBinderProcs(binderName) {
    return (req, res) => {
        try {
            BinderUtils.readBinderStateFile((binderData) => {
                res.json(Object.keys(binderData[binderName]).map((binderProcPid) => {
                    return { pid: binderProcPid  };
                }));
            });
        } catch (ex) {
            res.status(404).send();
        }
    };
}

function getBinderProc(binderName) {
    return (req, res) => {
        try {
            BinderUtils.readBinderStateFile((binderProcs) => {
                if (binderProcs[req.params.pid])
                    res.json(binderProcs[req.params.pid]);
                else
                    res.status(404).send();
            });
        } catch (ex) {
            res.status(404).send();
        }
    };
}

function getBinderService(binderName) {
    return (req, res) => {
        try {
            // Make a catalog of node IDs to PID because findServiceNodeId doesn't provide
            // us with the PID.
            BinderUtils.readBinderStateFile(function (binderData) {
                var binderProcsByNode = {};

                Object.keys(binderData[binderName]).forEach((binderPid) => {
                    binderData[binderName][binderPid].nodes.forEach((nodeData) => {
                        binderProcsByNode[nodeData.id] = {};
                        binderProcsByNode[nodeData.id] = binderData[binderName][binderPid];
                        binderProcsByNode[nodeData.id].node = nodeData.id;
                        binderProcsByNode[nodeData.id].pid = binderPid;
                    });
                });

                BinderUtils.findServiceNodeId(app.get("directory"), req.params.serviceName, (node, iface) => {
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
    };
}

app.get("/binder/procs", getBinderProcs("binder"));
app.get("/hwbinder/procs", getBinderProcs("hwbinder"));
app.get("/vndbinder/procs", getBinderProcs("vndbinder"));

app.get("/binder/procs/:pid([0-9]+)", getBinderProc("binder"));
app.get("/hwbinder/procs/:pid([0-9]+)", getBinderProc("hwbinder"));
app.get("/vndbinder/procs/:pid([0-9]+)", getBinderProc("vndbinder"));

app.get("/binder/services/:serviceName", getBinderService("binder"));
app.get("/hwbinder/services/:serviceName", getBinderService("hwbinder"));
app.get("/vndbinder/services/:serviceName", getBinderService("vndbinder"));

app.get("/binder/services", (req, res) => {
    res.json(serviceManager.all().map((service) => {
        return { name: service.name };
    }));
});

app.get("/aidl/:serviceName/:serviceClassName", (req, res) => {
    fetchAidl(req.params.serviceName, req.params.serviceClassName, {
        success: (raidlBuf) => {
            res.write(raidlBuf, () => {
                res.end();
            });
        },
        error: () => {
            res.status(404).end();
        }
    });
});

function setCustomHeaders(res, path) {
    if (new RegExp(".css$").test(path))
        res.setHeader("Content-type", "text/css");
}

// Static files.
app.use(exStatic(path.join(__dirname, "public"), {
    index: false,
    setHeaders: setCustomHeaders
}));
app.get("/", (req, res) => { res.redirect("/index.html"); });

var io = new SocketIO({ transports: ["websocket"] });
var binderWatcher = new BinderWatcher(app.get("directory"));

io.on("connection", (sock) => {
    sock.dataFeeder = new DataFeeder(binderWatcher, sock);
    sock.dataFeeder.start();

    sock.on("disconnect", () => {
        sock.dataFeeder.stop();
        sock.dataFeeder = null;
    });
});

// Make sure the backend service is available
let pm = new PackageManager();
let am = new ActivityManager();

if (!pm.isInstalled("com.opersys.infolauncher")) {
    let file = path.join(process.cwd(), "_bin", "infolauncher.apk");

    debug("Installing " + file);

    // Install the infolauncher.
    pm.install(file);
}
else debug("InfoLauncher service already installed");

// Start the InfoLauncher service
am.startForegroundService("com.opersys.infolauncher/.InfoLauncherService");
debug("InfoLauncher started (or already started)");

// Ready for input
io.listen(server);
binderWatcher.start();
server.listen(app.get("port"), () => {});

// Handle receiving the "quit" command from the UI.
process.stdin.on("data", (chunk) => {
    var cmd, cs;

    cs = chunk.toString().split("\n")[0].trim().split(" ");
    cmd = cs.shift().toLowerCase();

    if (cmd === "quit")
        process.exit();
    else
        console.log("Unknown command: " + cmd);
});
