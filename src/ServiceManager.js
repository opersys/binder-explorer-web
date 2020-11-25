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

const assert = require("assert");
const util = require("util");
const cp = require("child_process");
const EventEmitter = require("events");
const path = require("path");
const process = require("process");
const grabdebug = require("debug")("grab");

const GRAB_OK = "ok";
const GRAB_WAITING = "waiting";
const GRAB_DEAD = "dead";

class Service {
    constructor(number, name, iface = null) {
        assert(number != null);
        assert(name != null && name.trim() != "");

        this._number = number;
        this._name = name;
        this._iface = iface;
    }

    toString() {
        if (this._iface)
            return this._number + " " + this._name + " " + this._iface;
        else
            return this._number + " " + this._name;
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

    constructor(serviceName, grabber) {
        assert(grabber != null);
        assert(serviceName != null);

        super();

        grabdebug(`Grabbing ${serviceName} with ${grabber}`);

        this._status = GRAB_WAITING;
        this._name = serviceName;
        this._grabber = grabber;
        this._proc = cp.spawn(path.join(process.cwd(), "_bin", grabber), this.toArguments(serviceName),
                              { stdio: ["ignore", "pipe", "ignore"] });

        if (this._proc.stdout) {
            this._proc.stdout.on("data", (data) => {
                if (data.toString().substr(0, 2) == "OK")
                    this.status = GRAB_OK;
                else if (data.toString().substr(0, 2) == "NO")
                    this.status = GRAB_DEAD;
                else
                    throw "Unsupported return value from service grab binary";
            });
        }
        else this.status = GRAB_DEAD;
    }

    /**
     * Convert the service name to command line arguments for the grabbing command.
     */
    toArguments(serviceName) {
        return [serviceName];
    }

    release() {
        if (this._status != GRAB_DEAD)
            this._proc.kill();

        this._proc = null;
    }

    set status(newStatus) {
        grabdebug(`Grab on ${this._name} with ${this._grabber} change from ${this._status} -> ${newStatus}`);

        this._status = newStatus;
        this.emit("statusChange", newStatus);
    }

    get status() { return this._status; }
    get name() { return this._name; }
    get pid() { return this._proc.pid; }
}

/**
 * Service grab for hwbinder services.
 */
class HwServiceGrab extends ServiceGrab {
    constructor(serviceName) {
        super(serviceName, "grabservice-hw");
    }

    toArguments(serviceName) {
        let serv, iface, i;

        i = serviceName.indexOf("/");
        serv = serviceName.substr(0, i);
        iface = serviceName.substr(i + 1, serviceName.length - i);

        return [serv, iface];
    }
}

/**
 * Service grab for vndbinder services.
 */
class VndServiceGrab extends ServiceGrab {
    constructor(serviceName) {
        super(serviceName, "grabservice-vnd");
    }
}

class ServiceList {
    constructor(services) {
        this._services = services;
    }

    /**
     * Return the list of all service names.
     */
    all() {
        return Array.from(this._services.values());
    }

    /**
     * Return a single service object.
     */
    getService(serviceName) {
        return this._services.get(serviceName);
    }

    hasService(serviceName) {
        return this._services.has(serviceName);
    }
}

class ServiceManager {

    constructor(binderName = "binder", serviceCmd = null, grabber = "grabservice") {
        this._binderName = binderName;
        this._grabber = grabber;

        if (!serviceCmd)
            this._serviceCmd = "service";
        else
            this._serviceCmd = serviceCmd;

        this._grabs = new Map();
        this._services = new Map();
    }

    _parseLine(line) {
        let s, lineparts = line.split(/[\t\s]/);

        let number = parseInt(lineparts[0]);
        let name = lineparts[1].substr(0, lineparts[1].length - 1);
        let iface = lineparts[2].substr(1, lineparts[2].length - 2);

        s = new Service(number, name, iface ? iface : "");
        return s;
    }

    grabService(serviceName) {
        let sg = new ServiceGrab(serviceName, this._grabber);
        this._grabs.set(serviceName, sg);
        return sg;
    }

    /**
     * Fetch the list of services.
     *
     * This returns a list of service representing the list of service
     * loaded in the service manager at the time of the call.
     */
    fetch(callback) {
        let proc = cp.spawnSync(this._serviceCmd, ["list"]);
        let firstline = true;
        let lines = proc.stdout.toString().split(/\n/);
        let services = new Map();

        lines.forEach((line) => {
            if (!firstline && line) {
                let s = this._parseLine(line);
                services.set(s.name, s);
            }

            firstline = false;
        });

        let serviceList = new ServiceList(services);

        if (callback) callback(serviceList);

        return serviceList;
    }

    get name() { return this._binderName; }
};

class HwService {

    constructor(name, path = null) {
        assert(name != null && name.trim() != "");

        this._name = name;
        this._path = path;
    }

    toString() {
        if (this._path)
            return "\"" + this._name + "\" " + this._path;
        else
            return "\"" + this._name + "\"";
    }

    get name() { return this._name; }
    get path() { return this._path; }
}

class HwServiceManager extends ServiceManager {

    constructor() {
        super("hwbinder", "lshal", "grabservice-hw");
    }

    _parseLine(line) {
        let s = line.split(/\s/);
        let sname, spath;

        // Service name
        sname = s[0];
        if (!sname) return null;

        // Path
        if (s[1]) {
            spath = s[1];
            return new HwService(sname, spath);
        } else
            return new HwService(sname);
    }

    grabService(serviceName) {
        let sg = new HwServiceGrab(serviceName, this._grabber);
        this._grabs.set(serviceName, sg);
        return sg;
    }

    fetch(callback) {
        let proc = cp.spawnSync("lshal", ["--neat", "-i"]);
        let lines = proc.stdout.toString().split(/\n/);
        let services = new Map();

        lines.forEach((line) => {
            let service = this._parseLine(line);

            if (service)
                services.set(service.name, service);
        });

        let serviceList = new ServiceList(services);

        if (callback) callback(serviceList);

        return serviceList;
    }
}

class VndServiceManager extends ServiceManager {
    constructor() {
        super("vndbinder", "vndservice", "grabservice-vnd");
    }
}

module.exports = {
    "ServiceManager": ServiceManager,
    "ServiceGrab": ServiceGrab,
    "HwServiceManager": HwServiceManager,
    "VndServiceManager": VndServiceManager,

    "GRAB_OK": GRAB_OK,
    "GRAB_WAITING": GRAB_WAITING,
    "GRAB_DEAD": GRAB_DEAD
};
