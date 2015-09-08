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

requirejs.config({
    shim: {
        "w2ui": {
            deps: ["jquery"],
            exports: "w2ui"
        },
        "jquery-timer/jquery.timer": {
            deps: ["jquery"]
        },
        "socketio": {
            exports: "io"
        },
        jquery: {
            exports: "$"
        },
        underscore: {
            exports: "_"
        },
        backbone: {
            deps: ["underscore"]
        },
        "backbone-relational": {
            deps: ["underscore", "backbone"]
        }
    },
    paths: {
        w2ui: "w2ui/w2ui-1.4.2.min",
        underscore: "underscore/underscore",
        backbone: "backbone/backbone",
        jquery: "jquery/jquery",
        d3: "d3/d3",
        socketio: "../socket.io/socket.io",
        handlebars: "handlebars/handlebars",
        highlightjs: "highlightjs/highlight.pack"
    },
    packages: []
});

requirejs(["app"]);