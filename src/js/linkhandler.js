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

define(function (require) {
    "use strict";

    const _ = require("underscore");
    const Backbone = require("backbone");

    class UndirectedLink {
        constructor(a, b) {
            if (!a) throw "cannot add invalid element in 'a'";
            if (!b) throw "cannot add invalid element in 'b'";

            this.a = a;
            this.b = b;
        }
    }

    class DirectedLink {
        constructor(from, to) {
            this.from = from;
            this.to = to;
        }
    }

    const Directed = function () {
        this._linksFrom = new Map();
        this._linksTo = new Map();
        _.extend(this, Backbone.Events);
    };

    const Undirected = function () {
        this._linksFrom = new Map();
        _.extend(this, Backbone.Events);
    };

    Directed.prototype.getLinks = function (makeLink) {
        let links = [], linkVal;

        if (!makeLink) throw "callback missing";

        for (let fromId of this._linksFrom.keys()) {
            for (let toId of this._linksFrom.get(fromId).keys()) {
                let link = this._linksFrom.get(fromId).get(toId);

                linkVal = makeLink(link.from, link.to);
                if (linkVal) links.push(linkVal);
            }
        }

        return links;
    };

    Undirected.prototype.getLinks = function (makeLink) {
        let links = [], linkVal;
        let doneLinks = new Set();

        if (!makeLink) throw "'makeLink' function missing";

        for (let aId of this._linksFrom.keys()) {
            for (let bId of this._linksFrom.get(aId).keys()) {
                let ak = aId + "@@" + bId,
                    bk = bId + "@@" + aId;

                // Handles deleted links.
                if (!this._linksFrom.has(bId)) {
                    this._linksFrom.get(aId).delete(bId);
                    continue;
                }

                if (!doneLinks.has(ak) && !doneLinks.has(bk)) {
                    doneLinks.add(ak);
                    doneLinks.add(bk);

                    let a = this._linksFrom.get(aId).get(bId).a;
                    let b = this._linksFrom.get(aId).get(bId).b;

                    linkVal = makeLink(a, b);
                    if (linkVal) links.push(linkVal);
                }
            }
        }

        return links;
    };

    Directed.prototype.getLinksFrom = function (from, id, makeLink) {
        let fromId, links = [], linkVal;

        if (!id) throw "'id' function missing";
        if (!makeLink) throw "'makeLink' function missing";

        fromId = id(from);

        if (this._linksFrom.get(fromId) != null) {
            for (let toId of this._linksFrom.get(fromId).keys()) {

                let from = this._linksFrom.get(fromId).get(toId).from;
                let to = this._linksFrom.get(fromId).get(toId).to;

                linkVal = makeLink(from, to);
                if (linkVal) links.push(linkVal);
            }
        }

        return links;
    };

    Undirected.prototype.getLinksFrom = function (a, id, makeLink) {
        let aId, bId, links = [], linkVal;

        if (!id) throw "'id' function missing";
        if (!makeLink) throw "'makeLink' function missing";

        aId = id(a);

        if (this._linksFrom.has(aId)) {
            for (bId of this._linksFrom.get(aId).keys()) {
                if (!this._linksFrom.has(bId))
                    this._linksFrom.get(aId).delete(bId);
                else {
                    let b = this._linksFrom.get(aId).get(bId).b;
                    linkVal = makeLink(a, b);
                    if (linkVal) links.push(linkVal);
                }
            }
        }

        return links;
    };

    Directed.prototype.addLink = function (from, to, id) {
        let fromId, toId;

        if (!id) throw "Id function missing";

        fromId = id(from);
        toId = id(to);

        if (!this._linksFrom.has(fromId))
            this._linksFrom.set(fromId, new Map());
        if (!this._linksTo.has(toId))
            this._linksTo.set(toId, new Map());

        this._linksFrom.get(fromId).set(toId, new DirectedLink(from, to));
        this._linksTo.get(toId).set(fromId, new DirectedLink(from, to));

        this.trigger("linkadded", from, to);
    };

    Undirected.prototype.addLink = function (a, b, id) {
        let aId, bId;

        if (!id) throw "Id function missing";

        aId = id(a);
        bId = id(b);

        if (!this._linksFrom.has(aId))
            this._linksFrom.set(aId, new Map());

        if (!this._linksFrom.has(bId))
            this._linksFrom.set(bId, new Map());

        let linkA = new UndirectedLink(a, b);
        let linkB = new UndirectedLink(b, a);

        this._linksFrom.get(aId).set(bId, linkA);
        this._linksFrom.get(bId).set(aId, linkB);

        this.trigger("linkadded", a, b);
    };

    Undirected.prototype.removeAll = function (a, id) {
        let oldLinks, aId;

        if (!id) throw "Id function missing";

        aId = id(a);

        if (this._linksFrom.has(aId)) {
            oldLinks = this._linksFrom.get(aId);
            this._linksFrom.delete(aId);

            for (let bId in oldLinks.keys())
                this.trigger("linkremoved", a, oldLinks.get(bId).b);
        }
    };

    return {
        Undirected: Undirected,
        Directed: Directed
    };
});
