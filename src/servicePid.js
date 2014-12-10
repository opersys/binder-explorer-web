var Binder = require("jslibbinder");
var Guid = require("guid");
var child_process = require("child_process");
var Queue = require("queue");
var _ = require("underscore");
var path = require("path");
var fs = require("fs");

// This is a test program that tries to find the PID of any running
// binder process. Let me make clear that this is a very dirty hack but
// this is the only solution that will allow us to correlate what is
// in /sys/kernel/debug/binder with the binder service names.

var sm = new Binder.ServiceManager();

var requests = {};
var requestIndex = 0;
var requestQueue = Queue({ concurrency: 1 });
var knownNodes = [];

function readBinderProcFile(pid, successCallback, errorCallback) {
    var procFile, procData;

    procFile = path.join("/sys/kernel/debug/binder/proc", pid);
    procData = {};

    procData.pid = pid;
    procData.threads = [];
    procData.refs = [];
    procData.nodes = [];

    fs.readFile(procFile, function (err, data) {
        if (err)
            return errorCallback(err);

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
}

function findServicePid(serviceName, resultCb) {
    var pm = sm.getService(serviceName);
    var guid = Guid.raw();

    requests[guid] = {
        index: requestIndex++,
        name: serviceName,
        callback: resultCb,
        timeout: setTimeout(function () {
            findLastNewNodeNumber(function (newNode) {
                requests[guid].callback(null, null, newNode);
                delete(requests[guid]);
            });
        }, 2000)
    };

    readBinderProcFile(process.pid.toString(), function (data) {
        var currentNodes = [], newNode, iface;

        for (var ref in data.refs)
            if (data.refs[ref].node != 1)
                currentNodes.push(data.refs[ref].node);

        newNode = _.difference(currentNodes, knownNodes);
        knownNodes = currentNodes;
        iface = pm.getInterface();

        resultCb(iface, newNode);
    });
}

var services = [];

if (process.argv.length <= 2) {
    services = sm.list();
} else {
    process.argv.shift();
    process.argv.shift();

    services = process.argv;
}

while (services.length > 0) {
    var sn = services.shift();

    (function (serviceName) {
        requestQueue.push(function (queueCb) {
            findServicePid(serviceName, function (iface, node) {
                var data = [];

                if (iface) data.push("Iface: " + iface);
                if (node) data.push("Node: " + node);

                console.log(serviceName + " " + data.join(", "));

                queueCb();
            });
        });
    })(sn);
}

requestQueue.start(function () {
    process.exit(1);
});


