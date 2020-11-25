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

requirejs.config({
    shim: {
        "w2ui": {
            deps: ["jquery"],
            exports: "w2ui"
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
        "d3-tip": {
            deps: ["d3"]
        },
        d3: {
            exports: "d3"
        },
        backbone: {
            deps: ["underscore"]
        }
    },
    paths: {
        w2ui: "/app/js/w2ui/w2ui-1.4.2.min",
        underscore: "/app/js/underscore/underscore",
        backbone: "/app/js/backbone/backbone",
        jquery: "/app/js/jquery/jquery",
        d3: "/app/js/d3/d3",
        "d3-tip": "/app/js/d3-tip/d3-tip",
        socketio: "/socket.io/socket.io",
        handlebars: "/app/js/handlebars/handlebars",
        highlightjs: "/app/js/highlightjs/highlight.pack"
    },
    packages: []
});

requirejs(["app"]);
