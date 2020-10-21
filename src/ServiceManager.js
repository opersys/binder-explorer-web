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

// Class that makes a snapshot of the state of the running services on
// the system.

const util = require("util");
const cp = require("child_process");
const EventEmitter = require("events");
const path = require("path");
const process = require("process");

const GRAB_OK = "ok";
const GRAB_WAITING = "waiting";
const GRAB_DEAD = "dead";

class Service {
    constructor(line) {
        let lineparts = line.split(/[\t\s]/);

        this._number = parseInt(lineparts[0]);
        this._name = lineparts[1].substr(0, lineparts[1].length - 1);
        this._iface = lineparts[2].substr(1, lineparts[2].length - 2);
    }

    toString() {
        return this._number + " " + this._name + " " + this._iface;
    }

    get name() { return this._name; }
    get interface() { return this._iface; }
}

class ServiceGrab extends EventEmitter {

    /**
     *  GRAB_WAITING: before the service is being grabbed
     *  GRAB_DEAD:    if the service could not be grabbed
     *  GRAB_OK:      if the service has been grabbed
     *
     *  null if the grab doesn't exist.
     */

    constructor(serviceName) {
        super();

        this._status = GRAB_WAITING;
        this._name = serviceName;
        this._proc = cp.spawn(path.join(process.cwd(), "_bin", "grabservice"), [serviceName],
                              { stdio: ["ignore", "pipe", "ignore"] });

        if (this._proc.stdout) {
            this._proc.stdout.on("data", (data) => {
                if (data.toString().substr(0, 2) == "OK")
                    this.status = GRAB_OK;
                else
                    this.status = GRAB_DEAD;
            });
        }
        else this.status = GRAB_DEAD;
    }

    release() {
        if (this._status != GRAB_DEAD)
            this._proc.kill();

        this._proc = null;
    }

    set status(newStatus) {
        this._status = newStatus;
        this.emit("statusChange", newStatus);
    }

    get status() { return this._status; }
    get name() { return this._name; }
    get pid() { return this._proc.pid; }
}

class ServiceManager {

    constructor(serviceCmd = null) {
        if (!serviceCmd)
            serviceCmd = "service";

        let proc = cp.spawnSync(serviceCmd, ["list"],);

        this._grabs = {};
        this._services = {};
        this._firstLine = true;

        let lines = proc.stdout.toString().split(/\n/);

        lines.forEach((line) => {
            if (line) this._parseLine(line);
        });
    }

    _parseLine(line) {
        let s;

        if (!this._firstLine) {
            s = new Service(line);
            this._services[s.name] = s;
        }
        else this._firstLine = false;
    }

    grabService(serviceName) {
        let sg = new ServiceGrab(serviceName);
        this._grabs[serviceName] = sg;
        return sg;
    }

    /**
     * Return a single service object.
     */
    getService(serviceName) {
        return this._services[serviceName];
    }

    /**
     * Return the list of all service objects.
     */
    all() {
        return Object.values(this._services);
    }
};

class HwServiceManager {
    constructor() {
        let proc = cp.spawnSync("lshal", ["--neat"]);

        this._grabs = {};
        this._services = {};
        this._firstLine = true;

        let lines = proc.stdout.toString().split(/\n/);

        lines.forEach((line) => {
            if (line) this._parseLine(line);
        });
    }
}

class VncServiceManager extends ServiceManager {
    constructor() {
        super("vndservice");
    }
}

module.exports = {
    "ServiceManager": ServiceManager,
    "ServiceGrab": ServiceGrab,

    "GRAB_OK": GRAB_OK,
    "GRAB_WAITING": GRAB_WAITING,
    "GRAB_DEAD": GRAB_DEAD
};
