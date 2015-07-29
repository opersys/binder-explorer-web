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

"use strict";

var util = require("util");
var _ = require("underscore");

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

var ServiceListParser = function () {
    var self = this;

    self._state = self._NEUTRAL;
    self._services = [];
    self._currentService = {};
    self._currentBindingRecord = {};
};

//ServiceListParser.prototype._IN_CR = 3;
ServiceListParser.prototype._IN_BR = 2;
ServiceListParser.prototype._IN_SR= 1;
ServiceListParser.prototype._NEUTRAL = 0;

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

ServiceListParser.prototype._simplify = function (s) {
    var ss = {
        intent: s.intent,
        pid: s.app.pid,
        pkg: s.packageName,
        clients: []
    };

    s.bindingRecords.forEach(function (br) {
        if (br.client) {
            ss.clients.push(br.client.pid);
        }
    });

    return ss;
};

ServiceListParser.prototype.getServicesForPid = function (pid) {
    var self = this;

    return _.map(
        _.filter(self._services, function (s) {
            return s.app && s.app.pid === pid;
        }),
        function (s) {
            return self._simplify(s);
        }
    );
};

ServiceListParser.prototype._parsePr = function (prValue) {
    if (prValue === "null")
        return {};

    var pr = prValue.match(/ProcessRecord{.* ([0-9]*):(.*)\/.*}/);
    var pid = pr[1];
    var nm = pr[2];

    return { "name": nm, "pid": pid };
};

ServiceListParser.prototype._parseVar = function (varLine) {
    varLine = varLine.split(/=/);

    var varName = varLine.shift();
    var varValue = varLine.join("=");

    return {"name": varName, "value": varValue};
};

ServiceListParser.prototype._parseCrLine = function (crLine) {
    var self = this;
    var m = crLine.match(/Client AppBindRecord{.* (ProcessRecord{.*}})/);

    if (m) {
        return self._parsePr(m[1]);
    } else {
        return "unknown";
    }
};

ServiceListParser.prototype._parseBrLine = function (brLine) {
    var self = this;
    var v;

    if (brLine.match(/^intent|^binder/)) {
        v = self._parseVar(brLine);

        self._currentBindingRecord[v.name] = v.value;

    } else if (brLine.match(/^requested/)) {
        var vs, vl = brLine.split(/ /);

        while ((vs = vl.shift()) != null) {
            v = self._parseVar(vs);
            self._currentBindingRecord[v.name] = v.value;
        }
    }
};

ServiceListParser.prototype._parseSrLine = function (srLine) {
    var self = this;
    var v;

    if (srLine.match(/^intent|^packageName|^processName|^baseDir|^dataDir|^app/)) {
        v = self._parseVar(srLine);

        if (v.name === "app") {
            self._currentService[v.name] = self._parsePr(v.value);
        } else {
            self._currentService[v.name] = v.value;
        }

    } else if (srLine.match(/^createTime|^lastActivity|^startRequested/)) {
        var vs, vl = srLine.split(/ /);

        while ((vs = vl.shift()) != null) {
            v = self._parseVar(vs);
            self._currentService[v.name] = v.value;
        }
    }
};

ServiceListParser.prototype.parseOutput = function (output) {
    var self = this;
    var line, lines = output.split(/\n/);

    self._state = self._NEUTRAL;
    self._services.length = 0;

    while ((line = lines.shift()) != null) {
        line = line.trim();

        if (self._state !== self._NEUTRAL && line.match(/^\s*$/)) {
            self._state = self._NEUTRAL;

            self._currentService.bindingRecords.push(self._currentBindingRecord);
            self._currentBindingRecord = {};

            self._services.push(self._currentService);
            self._currentService = {};
            self._currentService.bindingRecords = [];
        }
        /* Parse the lines starting by * */
        else if (line.match(/^\s*\*.*/)) {
            if (self._state === self._NEUTRAL) {
                if (line.match(/ServiceRecord{/)) {
                    self._state = self._IN_SR;
                }
            }
            else if (self._state === self._IN_SR) {
                if (line.match(/IntentBindRecord{/)) {
                    self._state = self._IN_BR;
                }
            }
            else if (self._state === self._IN_BR) {
                if (line.match(/Client AppBindRecord/)) {
                    self._currentBindingRecord.client = self._parseCrLine(line);
                }
                else if (line.match(/IntentBindRecord{/)) {
                    self._currentService.bindingRecords.push(self._currentBindingRecord);
                    self._currentBindingRecord = {};
                }
            }
        }
        /* Line is not starting by * */
        else if (self._state !== self._NEUTRAL) {
            if (self._state === self._IN_SR) {
                self._parseSrLine(line);
            }

            if (self._state === self._IN_BR) {
                self._parseBrLine(line);
            }
        }
        else if (self._state === self._NEUTRAL) {
            self._currentService = {};
            self._currentService.bindingRecords = [];
        }
    }
};

module.exports = ServiceListParser;