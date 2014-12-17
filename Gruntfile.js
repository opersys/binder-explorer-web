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

    var projectName = "binder-explorer";
    var packFile = projectName + ".zip";
    var md5File = packFile + ".md5sum";

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

        chmod: {
            options: {
                mode: "755"
            },
            node: {
                src: ["dist/node"]
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
                command: [
                    "md5sum", path.join("out", packFile),
                    "|",
                    "cut -f 1 -d ' ' > " + path.join("out", md5File)].join(" ")
            }
        },

        compress: {
            dist: {
                options: {
                    archive: path.join("out", packFile),
                    mode: 0
                },
                files: [
                    { expand: true, cwd: "./dist", src: ["./**"] }
                ]
            }
        }
    });

    grunt.registerTask("dev_bin", "Pick the right binaries for development", function (arch) {
        var selArch, defArch = os.arch();

        if (!arch)
            selArch = defArch;
        else
            selArch = arch;

        var files = fs.readdirSync("./dist/_bin");
        var r = new RegExp(selArch + "$");

        _.each(files, function (file) {
            var f = path.join("./dist/_bin", file);
            var e = new RegExp("\\.{0,1}_{0,1}" + selArch);

            if (r.test(file)) {
                grunt.file.copy(f, "./dist/" + file.replace(e, ""));
                grunt.log.writeln("Using " + file);
            }
        });
    });

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-bower");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-auto-install");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-chmod");

    grunt.registerTask("default", ["mkdir", "bower", "copy", "auto_install"]);
    grunt.registerTask("pack", ["default", "chmod", "compress", "exec:md5sum"]);
};

