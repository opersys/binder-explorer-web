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

/*
 * This is a test for the LinkHandler class, which is a bit difficult
 * to debug from within the browser.
 *
 * You can run in in node.js with mocha.
 */

'use strict';

const requirejs = require("requirejs");
const jsdom = require("jsdom");
const assert = require("assert");

/* Setup a "fake browser" so that JQuery is happy. Backbone depends on
 * JQuery. */
let dom = new jsdom.JSDOM(
    '<!DOCTYPE html data-debug=1>' +
        '<head></head>' +
        '<body>' +
        '<div id="mocha-fixture"></div>' +
        '</body>' +
        '</html>'
);

global.window = dom.window;
global.document = dom.window.document;

requirejs.config({
    paths: {
        backbone: "../bower_components/backbone/backbone",
        d3: "../bower_components/d3/d3",
        jquery: "../bower_components/jquery/dist/jquery",
        underscore: "../bower_components/underscore/underscore",
    },

    baseUrl: __dirname,
    nodeRequire: require
});

/*
 * Our LinkHandler class is unfortunately an AMD module, but requirejs
 * works fine in Node.js.
 */
const LinkHandler = requirejs("./src/js/linkhandler.js");

function id(obj) {
    assert.ok(obj);
    return obj.id;
}

function retB(a, b) {
    assert.ok(a);
    assert.ok(b);
    return b;
}

function retBoth(a, b) {
    assert.ok(a);
    assert.ok(b);
    return [a, b];
}

let a, b, c, z, U1, U2, D1, D2;

describe("Undirected Links", () => {
    beforeEach(() => {
        U1 = new LinkHandler.Undirected();
        a = {id: "a"};
        b = {id: "b"};
        c = {id: "c"};
        z = {id: "z"};
    });

    it("should allow adding links", () => {
        U1.addLink(a, b, id);
    });

    it("should allow getting links", () => {
        U1.addLink(a, b, id);
        assert.deepEqual(U1.getLinksFrom(a, id, retB), [b]);
    });

    it("show allow getting more than one link", () => {
        U1.addLink(a, b, id);
        U1.addLink(a, c, id);
        assert.deepEqual(U1.getLinksFrom(a, id, retB), [b, c]);
    });

    it("should return link in both directions", () => {
        U1.addLink(a, b, id);
        U1.addLink(a, c, id);
        assert.deepEqual(U1.getLinksFrom(b, id, retB), [a]);
        assert.deepEqual(U1.getLinksFrom(c, id, retB), [a]);
    });

    it("should not return links where there is none", () => {
        U1.addLink(a, b, id);
        assert.deepEqual(U1.getLinksFrom(z, id, retB), []);
    });

    it("should allow mixing link direction when fetching links from A", () => {
        U1.addLink(a, b, id);
        U1.addLink(c, a, id);
        assert.deepEqual(U1.getLinksFrom(a, id, retB), [b, c]);
        assert.deepEqual(U1.getLinksFrom(c, id, retB), [a]);
    });

    it("should allow removing all links", () => {
        U1.addLink(a, b, id);
        U1.addLink(a, c, id);
        U1.removeAll(a, id);
        assert.deepEqual(U1.getLinksFrom(a, id, retB), []);
        assert.deepEqual(U1.getLinksFrom(b, id, retB), []);
    });

    it("should allow returning all links", () => {
        U1.addLink(a, b, id);
        U1.addLink(a, c, id);
        assert.deepEqual(U1.getLinks(retBoth), [[a, b], [a, c]]);
    });

    it("should not return any links after removal", () => {
        U1.addLink(a, b, id);
        U1.addLink(a, c, id);
        U1.removeAll(a, id);
        assert.deepEqual(U1.getLinks(retBoth), []);
    });
});

describe("Directed Links", () => {
    beforeEach(() => {
        D1 = new LinkHandler.Directed();
        a = {id: "a"};
        b = {id: "b"};
        c = {id: "c"};
        z = {id: "z"};
    });

    it("should allow adding links", () => {
        D1.addLink(a, b, id);
    });

    it("should allow getting links", () => {
        D1.addLink(a, b, id);
        assert.deepEqual(D1.getLinksFrom(a, id, retB), [b]);
    });

    it("should allow getting all links", () => {
        D1.addLink(a, b, id);
        D1.addLink(a, c, id);
        D1.addLink(c, a, id);
        assert.deepEqual(D1.getLinks(retBoth), [[a, b], [a, c], [c, a]]);
    });

    it("links should not go both ways", () => {
        D1.addLink(a, b, id);
        assert.deepEqual(D1.getLinksFrom(a, id, retB), [b]);
        assert.deepEqual(D1.getLinksFrom(b, id, retB), []);
    });

    it("should support more than one link", () => {
        D1.addLink(a, b, id);
        D1.addLink(a, c, id);
        assert.deepEqual(D1.getLinksFrom(a, id, retB), [b, c]);
    });

    it("should not return links where there is none", () => {
        D1.addLink(a, b, id);
        assert.deepEqual(D1.getLinksFrom(z, id, retB), []);
    });

    it("should allow returning all links, and order matters", () => {
        D1.addLink(a, b, id);
        D1.addLink(a, c, id);
        assert.deepEqual(D1.getLinksFrom(a, id, retBoth), [[a, b], [a, c]]);
        assert.deepEqual(D1.getLinksFrom(b, id, retBoth), []);
        assert.deepEqual(D1.getLinksFrom(c, id, retBoth), []);
    });
});
