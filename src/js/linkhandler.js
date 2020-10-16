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

define(function (require) {
    "use strict";

    const d3 = require("d3");
    const _ = require("underscore");
    const Backbone = require("backbone");

    const Directed = function () {
        this._linksFrom = {};
        this._linksTo = {};
        _.extend(this, Backbone.Events);
    };

    const Undirected = function () {
        this._linksFrom = {};
        _.extend(this, Backbone.Events);
    };

    Directed.prototype.getLinks = function (makeLinkCb) {
        let links = [], linkVal;

        if (!makeLinkCb) throw "callback missing";

        Object.keys(this._linksFrom).forEach((from) => {
            if (this._linksFrom[from] != null) {
                this._linksFrom[from].forEach((to) => {
                    linkVal = makeLinkCb(from, to);
                    if (linkVal) links.push(linkVal);
                });
            }
        });

        return links;
    };

    Undirected.prototype.getLinks = function (makeLinkCb) {
        let links = [], linkVal;
        let doneLinks = d3.set();

        if (!makeLinkCb) throw "callback missing";

        Object.keys(this._linksFrom).forEach((x) => {
            if (this._linksFrom[x] != null) {
                this._linksFrom[x].forEach((y) => {
                    var ak = x.toString() + "@@" + y.toString(),
                        bk = y.toString() + "@@" + x.toString();

                    // Handles deleted links.
                    if (this._linksFrom[y] === null) {
                        this._linksFrom[x].remove(y);
                        return;
                    }

                    if (!doneLinks.has(ak) && !doneLinks.has(bk)) {
                        doneLinks.add(ak);
                        doneLinks.add(bk);

                        linkVal = makeLinkCb(x, y);
                        if (linkVal) links.push(linkVal);
                    }
                });
            }
        });

        return links;
    };

    Directed.prototype.getLinksFrom = function (from, makeLinkCb) {
        let links = [], linkVal;

        if (!makeLinkCb) throw "callback missing";

        if (this._linksFrom[from] != null) {
            this._linksFrom[from].forEach((to) => {

                // Handles deleted links
                if (this._linksFrom[to] === null) {
                    this._linksFrom[to].remove(to);
                    return;
                }

                linkVal = makeLinkCb(from, to);
                if (linkVal) links.push(linkVal);
            });
        }

        return links;
    };

    Undirected.prototype.getLinksFrom = function (a, makeLinkCb) {
        let links = [], linkVal;

        if (!makeLinkCb) throw "callback missing";

        if (this._linksFrom[a]) {
            this._linksFrom[a].forEach((y) => {
                if (this._linksFrom[y] === null)
                    this._linksFrom[a].remove(y);
                else {
                    linkVal = makeLinkCb(a, y);
                    if (linkVal) links.push(linkVal);
                }
            });
        }

        return links;
    };

    Directed.prototype.addLink = function (from, to) {
        if (!this._linksFrom[from])
            this._linksFrom[from] = d3.set();

        this._linksFrom[from].add(to);

        this.trigger("linkadded", from, to);
    };

    Undirected.prototype.addLink = function (a, b) {
        if (!this._linksFrom[a])
            this._linksFrom[a] = d3.set();

        if (!this._linksFrom[b])
            this._linksFrom[b] = d3.set();

        this._linksFrom[a].add(b);
        this._linksFrom[b].add(a);

        this.trigger("linkadded", a, b);
    };

    Undirected.prototype.removeAll = function (a) {
        let oldLinks;

        if (this._linksFrom[a]) {
            oldLinks = this._linksFrom[a];
            this._linksFrom[a] = null;

            oldLinks.forEach((b) => {
                this.trigger("linkremoved", a, b);
            });
        }
    };

    return {
        Undirected: Undirected,
        Directed: Directed
    };
});
