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

/*
 * This is a test suite for the linkhandler.js file, which is kinda
 * critical but a bit difficult to debug.
 *
 * Run the "chromedriver" for test in the following way:
 *
 * chromedriver --port=4444 --url-base=wd/hub
 *
 * Run the intern-runner this way:
 *
 *  % intern-runner config=tests/intern
 */

define(function (require) {
    var Linker = require("../src/js/linkhandler.js");
    var registerSuite = require('intern!object');
    var assert = require('intern/chai!assert');

    var f = function (a, b) {
        if (a == null) throw ("a should not be null");
        if (b == null) throw ("b should not be null");

        return {
            source: a,
            target: b
        };
    };

    registerSuite({
        name: 'Undirected',

        "Add": function () {
            var b, link;

            link = new Linker.Undirected();
            link.addLink("a", "b");
            b = link.getLinks(f);

            assert.lengthOf(b, 1);
            assert.deepEqual({ source: "a", target: "b" }, b[0]);
        },

        "Add/Remove": function () {
            var b, link;

            link = new Linker.Undirected();
            link.addLink("a", "b");
            b = link.getLinks(f);

            assert.lengthOf(b, 1);

            link.removeAll("a");
            b = link.getLinks(f);

            assert.lengthOf(b, 0);
        },

        "Add/Remove Dupe": function () {
            var b, link;

            link = new Linker.Undirected();
            link.addLink("a", "b");
            link.addLink("b", "a");
            b = link.getLinks(f);

            assert.lengthOf(b, 1);
            assert.deepEqual({ source: "a", target: "b" }, b[0]);

            link.addLink("b", "c");
            b = link.getLinks(f);

            assert.lengthOf(b, 2);
            assert.deepEqual({ source: "a", target: "b" }, b[0]);
            assert.deepEqual({ source: "b", target: "c" }, b[1]);
        },

        "Add/Remove Many": function () {
            var b, link;

            link = new Linker.Undirected();
            link.addLink("a", "b");
            link.addLink("a", "c");
            link.addLink("x", "y");
            link.addLink("b", "a");
            b = link.getLinks(f);

            assert.lengthOf(b, 3);
            assert.deepEqual({ source: "a", target: "b" }, b[0]);
            assert.deepEqual({ source: "a", target: "c" }, b[1]);
            assert.deepEqual({ source: "x", target: "y" }, b[2]);

            link.removeAll("a");
            b = link.getLinks(f);

            assert.lengthOf(b, 1);
            assert.deepEqual({ source: "x", target: "y" }, b[0]);
        },

        "getLinksFrom": function () {
            var b, link;

            link = new Linker.Undirected();
            link.addLink("a", "b");
            link.addLink("a", "c");
            link.addLink("b", "c");

            b = link.getLinksFrom("a", f);
            assert.lengthOf(b, 2);
            assert.deepEqual({ source: "a", target: "b" }, b[0]);
            assert.deepEqual({ source: "a", target: "c" }, b[1]);
        }
    });
});