/*
 * Copyright (C) 2020 Opersys inc.
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

// Instances of those classes are serialized by SocketIO to transfert
// information from the backend to the frontend. Change the interface
// of those classes might break the frontend.

class Ref {
    constructor(node) {
        this.node = node;
    }
}

class Service {
    constructor(name, nodeId, pid) {
        assert(Number.isInteger(nodeId), `Invalid nodeId value ${nodeId}`);
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);

        this.name = name;
        this.node = nodeId;
        this.pid = pid;
    }
}

class ProcessService {
    static fromClass(procService) {
        return new ProcessService(
            procService.pid,
            procService.intent,
            procService.pkg,
            procService.clients
        );
    }
    
    constructor(pid, intent, pkg, clients) {
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);
        assert(intent, `Invalid intent value ${intent}`);
        assert(pkg, `Invalid pkg value ${pkg}`);

        this.intent = intent;
        this.pid = pid;
        this.pkg = pkg;
        this.clients = clients;
    }
}

class Process {
    constructor(pid) {
        assert(Number.isInteger(pid), `Invalid pid value ${pid}`);        
        this.pid = pid;
        this.refs = [];
    }

    addRef(node) {
        assert(Number.isInteger(node));
        this.refs.push(new Ref(node));
    }    
}

module.exports = {
    "Process": Process,
    "Service": Service,
    "ProcessService": ProcessService
};
