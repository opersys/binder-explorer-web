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

define(function (require) {
    var d3 = require("d3");

    var Undirected = function () {
        var self = this;
        self._linksTo = {};
    };

    Undirected.prototype.getLinks = function (makeLinkCb) {
        var self = this;
        var links = [], linkVal;
        var doneLinks = d3.set();

        _.keys(self._linksTo).forEach(function (x) {
            self._linksTo[x].forEach(function (y) {
                var ak = x.toString() + "@@" + y.toString(),
                    bk = y.toString() + "@@" + x.toString();

                if (!doneLinks.has(ak) && !doneLinks.has(bk)) {
                    doneLinks.add(ak);
                    doneLinks.add(bk);

                    linkVal = makeLinkCb(x, y);
                    if (linkVal) links.push(linkVal);
                }
            });
        });

        return links;
    };

    Undirected.prototype.addLink = function (a, b) {
        var self = this;

        if (!self._linksTo[a]) {
            self._linksTo[a] = d3.set();
        }
        if (!self._linksTo[b]) {
            self._linksTo[b] = d3.set();
        }

        self._linksTo[a].add(b);
        self._linksTo[b].add(a);
    };

    Undirected.prototype.removeAll = function (a) {
        var self = this;
        self._linksTo[a] = d3.set();
    };

    return {
        Undirected: Undirected
    };
});