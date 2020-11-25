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

'use strict';

const ServiceListParser = require("../src/ServiceListParser.js");
const fs = require("fs");
const assert = require("assert");

let SLP, content;

describe("Basic Parsing", () => {
    before(() => {
        SLP = new ServiceListParser();
        content = fs.readFileSync("./tests/dumpsys.out").toString();
    });

    it("should be able to parse the output", () => {
        SLP.parseOutput(content);
    });

    it("should be able to extract services", () => {
        let services;

        SLP.parseOutput(content);

        services = SLP.getServicesForPid(627);
        assert.ok(services.length > 0);
        assert.ok(services[0].pid === 627);
        assert.ok(services[0].pkg === "com.android.bluetooth");
    });
});
