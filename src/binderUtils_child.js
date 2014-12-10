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

var _ = require("underscore");

var Binder = require("jslibbinder");
var BinderUtils = require("./binderUtils.js");

var sm = new Binder.ServiceManager();
var knownNodes = [];
var serviceObj = sm.getService(process.argv[2]);

BinderUtils.readBinderProcFile(process.pid.toString(),
    function (data) {
        var currentNodes = [], newNode, iface;

        for (var ref in data.refs)
            if (data.refs[ref].node != 1)
                currentNodes.push(data.refs[ref].node);

        newNode = _.difference(currentNodes, knownNodes);

        // If this happens, it means there was an issue with the was
        // findServiceNodeId was used.
        if (newNode.length > 1)
            throw "Too much differences";

        newNode = newNode.pop();
        knownNodes = currentNodes;
        iface = serviceObj.getInterface();

        if (process.send)
            process.send({ node: newNode, iface: iface });
        else
            console.log("NODE: " + newNode + " IFACE: " + iface);
    },

    function (err) {
        if (process.send)
            process.send({ node: null, iface: null });
        else
            console.log("Error opening the binder process file: ", err);
    }
);


