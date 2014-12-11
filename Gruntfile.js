/*
 * Copyright (C) 2014 Opersys inc.
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

var os = require("os");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),

        mkdir: {
            dist: {
                options: {
                    create: [
                        "dist/_bin/",
                        "dist/public/css",
                        "dist/public/js",
                        "out"
                    ]
                }
            }
        },

        auto_install: {
            dist: {
                options: {
                    cwd: 'dist',
                    stdout: true,
                    stderr: true,
                    failOnError: true,
                    production: true
                }
            }
        },

        bower: {
            dist: {
                dest: "dist/public/js",
                css_dest: "dist/public/css",
                options: {
                    expand: true,
                    packageSpecific: {
                        "jquery": {
                            keepExpandedHierarchy: false
                        },
                        "sigma.js": {
                            files: [
                                "sigma.min.js",
                                "plugins/*"
                            ]
                        }
                    }
                }
            }
        },

        copy: {
            dist: {
                files: [
                    { src: ["package.json"], dest: "dist/" },
                    { expand: true, cwd: "src/css", src: ["*"], dest: "dist/public/css" },
                    { expand: true, cwd: "src/html", src: ["*"], dest: "dist/public" },
                    { expand: true, cwd: "src/jslib", src: ["*"], dest: "dist/public/js" },
                    { expand: true, cwd: "src/js", src: ["**"], dest: "dist/public/js" },
                    { expand: true, cwd: "src/", src: ["*"], dest: "dist/" }
                ]
            }
        },

        exec: {
            npm_install: {
                command: "npm --production install",
                stdout: false,
                stderr: false,
                cwd: "dist"
            },
            md5sum: {
                command: "md5sum out/binder-explorer.zip | cut -f 1 -d ' ' > out/binder-explorer.zip.md5sum"
            }
        },

        compress: {
            dist: {
                options: {
                    archive: "out/binder-explorer.zip",
                    mode: 0
                },
                files: [
                    { expand: true, cwd: "./dist", src: ["./**"] }
                ]
            }
        }
    });

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-bower");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-auto-install");

    grunt.registerTask("default", ["mkdir", "bower", "copy", "auto_install"]);
};

