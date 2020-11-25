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

const util = require("util");
const assert = require("assert");

/*
  { bindingRecords:
     [ { intent: '{cmp=com.touchtype.swiftkey/com.touchtype_fluency.service.FluencyServiceImpl}',
         binder: 'android.os.BinderProxy@185d0ca1',
         requested: 'true',
         received: 'true',
         hasBound: 'true',
         doRebind: 'false',
         client: { name: 'com.touchtype.swiftkey', pid: '1087' } } ],
    packageName: 'com.touchtype.swiftkey',
    processName: 'com.touchtype.swiftkey',
    baseDir: '/data/app/com.touchtype.swiftkey-1/base.apk',
    dataDir: '/data/data/com.touchtype.swiftkey',
    app: { name: 'com.touchtype.swiftkey', pid: '1087' },
    createTime: '-1d8h18m40s940ms',
    startingBgTimeout: '--',
    lastActivity: '-1h35m24s885ms',
    restartTime: '-18h58m55s885ms',
    createdFromFg: 'true',
    startRequested: 'false',
    delayedStop: 'false',
    stopIfKilled: 'true',
    callStart: 'false',
    lastStartId: '6' } ]
*/


/* Let's say a Service structure is like this.

{
  intent: // Service ID (launch intent)
  pid: // Pid of owning process
  pkg: // Name of the package
  clients: [ // List of client of the service
    // Pids of the client
  ]
}
 */

//const _IN_CR = 3;
const _IN_BR = 2;
const _IN_SR= 1;
const _NEUTRAL = 0;

/**
 * Represents a Service object. This is returned to the caller.
 */
class Service {
    constructor(intent, pid, pkg) {
        assert.ok(intent, "Null/invalid intent");
        assert(Number.isInteger(pid), "Invalid 'pid'");
        assert.ok(pkg, "Invalid 'pkg'");

        this._intent = intent;
        this._pid = pid;
        this._pkg = pkg;
        this._clients = [];
    }

    get intent() { return this._intent; }
    get pid() { return this._pid; }
    get pkg() { return this._pkg; }
    get clients() { return this._clients; };
}

/**
 * Parse the return of "dumpsys activity services".
 *
 * Note: I've tried making this class "cleaner" by using classes and
 * Map objects but it just made a mess. Just keep it as such. It work
 * outs its internals alone just fine and does not expose it to the
 * caller.
 */
class ServiceListParser {
    constructor() {
        this._state = _NEUTRAL;
        this._services = [];
        this._currentService = {};
        this._currentBindingRecord = {};
    }

    simplify(s) {
        let ss = new Service(s.intent, s.app.pid, s.packageName);

        s.bindingRecords.forEach(function (br) {
            if (br.client) ss.clients.push(br.client.pid);
        });

        return ss;
    }

    getServicesForPid(pid) {
        return this._services.filter((s) => s.app && s.app.pid === pid).map((s) => this.simplify(s));
    }

    parsePr(prValue) {
        if (prValue === "null")
            return new Map();

        let pr = prValue.match(/ProcessRecord{.* ([0-9]*):(.*)\/.*}/);
        let pid = pr[1];
        let nm = pr[2];

        return { name: nm, pid: parseInt(pid) };
    }

    parseVar(varLine) {
        varLine = varLine.split(/=/);

        let varName = varLine.shift();
        let varValue = varLine.join("=");

        return {name: varName, value: varValue};
    }

    parseCrLine(crLine) {
        let m = crLine.match(/Client AppBindRecord{.* (ProcessRecord{.*}})/);

        if (m)
            return this.parsePr(m[1]);
        else
            return "unknown";
    }

    parseBrLine(brLine) {
        let v;

        if (brLine.match(/^intent|^binder/)) {
            v = this.parseVar(brLine);
            this._currentBindingRecord[v.name] = v.value;

        } else if (brLine.match(/^requested/)) {
            let vs, vl = brLine.split(/ /);

            while ((vs = vl.shift()) != null) {
                v = this.parseVar(vs);
                this._currentBindingRecord[v.name] = v.value;
            }
        }
    }

    parseSrLine(srLine) {
        var v;

        if (srLine.match(/^intent|^packageName|^processName|^baseDir|^dataDir|^app/)) {
            v = this.parseVar(srLine);

            if (v.name === "app")
                this._currentService[v.name] = this.parsePr(v.value);
            else
                this._currentService[v.name] = v.value;

        } else if (srLine.match(/^createTime|^lastActivity|^startRequested/)) {
            var vs, vl = srLine.split(/ /);

            while ((vs = vl.shift()) != null) {
                v = this.parseVar(vs);
                this._currentService[v.name] = v.value;
            }
        }
    }

    parseOutput(output) {
        let line, lines = output.split(/\n/);

        this._state = _NEUTRAL;
        this._services.length = 0;

        while ((line = lines.shift()) != null) {
            line = line.trim();

            if (this._state !== _NEUTRAL && line.match(/^\s*$/)) {
                this._state = _NEUTRAL;

                this._currentService.bindingRecords.push(this._currentBindingRecord);
                this._currentBindingRecord = {};

                this._services.push(this._currentService);
                this._currentService = {};
                this._currentService.bindingRecords = [];
            }
            /* Parse the lines starting by * */
            else if (line.match(/^\s*\*.*/)) {
                if (this._state === _NEUTRAL) {
                    if (line.match(/ServiceRecord{/))
                        this._state = _IN_SR;
                }
                else if (this._state === _IN_SR) {
                    if (line.match(/IntentBindRecord{/))
                        this._state = _IN_BR;
                }
                else if (this._state === _IN_BR) {
                    if (line.match(/Client AppBindRecord/))
                        this._currentBindingRecord.client = this.parseCrLine(line);

                    else if (line.match(/IntentBindRecord{/)) {
                        this._currentService.bindingRecords.push(this._currentBindingRecord);
                        this._currentBindingRecord = new Map();
                    }
                }
            }
            /* Line is not starting by * */
            else if (this._state !== _NEUTRAL) {
                if (this._state === _IN_SR)
                    this.parseSrLine(line);

                if (this._state === _IN_BR)
                    this.parseBrLine(line);
            }
            else if (this._state === _NEUTRAL) {
                this._currentService = new Map();
                this._currentService.bindingRecords = [];
            }
        }

    }
}

module.exports = ServiceListParser;
