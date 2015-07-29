var cp = require("child_process");
var fs = require("fs");
var util = require("util");

(function () {
    "use strict";

    var IN_CR = 3;
    var IN_BR = 2;
    var IN_SR= 1;
    var NEUTRAL = 0;
    var state = NEUTRAL;
    var services = [];
    var currentService = {};
    var currentBindingRecord = {};

    /* Parses a ProcessRecord, ie: ProcessRecord{2fa82663 25078:com.android.systemui/u0a13} */
    function parsePr(prValue) {
        if (prValue === "null")
            return {};

        var pr = prValue.match(/ProcessRecord{.* ([0-9]*):(.*)\/.*}/);
        var pid = pr[1];
        var nm = pr[2];

        return { "name": nm, "pid": pid };
    }

    /* Parse a NAME=VALUE string */
    function parseVar(varLine) {
        varLine = varLine.split(/=/);

        var varName = varLine.shift();
        var varValue = varLine.join("=");

        return {"name": varName, "value": varValue};
    }

    function parseCrLine(crLine) {
        var m = crLine.match(/Client AppBindRecord{.* (ProcessRecord{.*}})/);

        if (m) {
            return parsePr(m[1]);
        } else {
            return "unknown";
        }
    }

    function parseBrLine(brLine) {
        var v;

        if (brLine.match(/^intent|^binder/)) {
            v = parseVar(brLine);

            currentBindingRecord[v.name] = v.value;

        } else if (brLine.match(/^requested/)) {
            var vs, vl = brLine.split(/ /);

            while ((vs = vl.shift()) != null) {
                v = parseVar(vs);
                currentBindingRecord[v.name] = v.value;
            }
        }
    }

    function parseSrLine(srLine) {
        var v;

        if (srLine.match(/^packageName|^processName|^baseDir|^dataDir|^app/)) {
            v = parseVar(srLine);

            if (v.name === "app") {
                currentService[v.name] = parsePr(v.value);
            } else {
                currentService[v.name] = v.value;
            }

        } else if (srLine.match(/^createTime|^lastActivity|^startRequested/)) {
            var vs, vl = srLine.split(/ /);

            while ((vs = vl.shift()) != null) {
                v = parseVar(vs);
                currentService[v.name] = v.value;
            }
        }
    }

    function parseOutput(output) {
        var line, lines = output.split(/\n/);

        while ((line = lines.shift()) != null) {
            line = line.trim();

            if (state !== NEUTRAL && line.match(/^\s*$/)) {
                state = NEUTRAL;

                currentService.bindingRecords.push(currentBindingRecord);
                currentBindingRecord = {};

                services.push(currentService);
                currentService = {};
                currentService.bindingRecords = [];
            }
            /* Parse the lines starting by * */
            else if (line.match(/^\s*\*.*/)) {
                if (state === NEUTRAL) {
                    if (line.match(/ServiceRecord{/)) {
                        state = IN_SR;
                    }
                }
                else if (state === IN_SR) {
                    if (line.match(/IntentBindRecord{/)) {
                        state = IN_BR;
                    }
                }
                else if (state === IN_BR) {
                    if (line.match(/Client AppBindRecord/)) {
                        currentBindingRecord.client = parseCrLine(line);
                    }
                    else if (line.match(/IntentBindRecord{/)) {
                        currentService.bindingRecords.push(currentBindingRecord);
                        currentBindingRecord = {};
                    }
                }
            }
            /* Line is not starting by * */
            else if (state !== NEUTRAL) {
                if (state === IN_SR) {
                    parseSrLine(line);
                }

                if (state === IN_BR) {
                    parseBrLine(line);
                }
            }
            else if (state === NEUTRAL) {
                currentService = {};
                currentService.bindingRecords = [];
            }
        }

    }

    cp.exec("dumpsys.out", function (error, stdout, stderr) {
        parseOutput(stdout);
        console.log(util.inspect(services, {depth: null}));
    });
})();
