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

const path = require("path");
const util = require("util");

module.exports = function (grunt) {

    var mkdir_config = {},
        bower_config = {},
        copy_config = {},
        exec_config = {},
        chmod_config = {},
        compress_config = {},
        handlebars_config = {},
        has_config = false;

    grunt.config.init({
        pkg: grunt.file.readJSON("package.json")
    });

    ["arm", "arm64", "ia32", "x86_64"].forEach((arch) => {

        let mkdist = function (arch) {
            return function () {
                var args = Array.prototype.slice.call(arguments);
                return path.join.apply(this, ["dist_" + arch].concat(args));
            };
        }(arch);

        mkdir_config["dist_" + arch] = {
            options: {
                create: [
                    mkdist("_bin"),
                    mkdist("public", "css"),
                    mkdist("public", "js"),
                    mkdist("public", "fonts"),
                    "prebuilt_" + arch
                ]
            }
        };

        bower_config["dist_" + arch] = {
            dest: mkdist("public", "js"),
            css_dest: mkdist("public", "css"),
            options: {
                expand: true,
                packageSpecific: {
                    "jquery": {
                        keepExpandedHierarchy: false
                    },
                }
            }
        };

        handlebars_config["dist_" + arch] = {
            options: {
                namespace: "JST",
                amd: true
            },
            files: {}
        };
        handlebars_config["dist_" + arch].files[mkdist("public", "js", "templates.js")] = [
            "./src/templates/template-aidl-dialog.hbs",
            "./src/templates/template-services.hbs",
            "./src/templates/template-services-dialog.hbs",
            "./src/templates/template-processes.hbs",
            "./src/templates/template-processes-dialog.hbs",
            "./src/templates/template-procservices.hbs"
        ];

        copy_config["dist_" + arch] = {
            files: [
                { src: ["package.json"], dest: mkdist("/") },
                { src: ["bower.json"], dest: mkdist("/") },
                { expand: true, cwd: '.', src: ["run"], dest: mkdist("") },
                { expand: true, cwd: `bin/${arch}`, src: ["**"], dest: mkdist("_bin") },
                { expand: true, cwd: "images", src: ["**"], dest: mkdist("public", "images") },
                { expand: true, cwd: "src/css", src: ["*"], dest: mkdist("public", "css") },
                { expand: true, cwd: "src/html", src: ["*"], dest: mkdist("public") },
                { expand: true, cwd: "src/jslib", src: ["*"], dest: mkdist("public", "js") },
                { expand: true, cwd: "src/js", src: ["**"], dest: mkdist("public", "js") },
                { expand: true, cwd: "src/", src: ["*"], dest: mkdist() },
                { expand: true, cwd: "fonts/", src: ["*"], dest: mkdist("public/fonts") }
            ]
        };

        exec_config["dist_npm_" + arch] = {
            command: function() {
                return "npm --production --prefix=" + mkdist("/") + " install";
            }
        };

        exec_config["dist_md5sum_" + arch] = {
            command: [
                "md5sum", path.join("out", [grunt.config("pkg.name"), "_", arch, ".tar.gz"].join("")),
                "|",
                "cut -f 1 -d ' ' > " + path.join("out", [grunt.config("pkg.name"), "_", arch, ".tar.gz.md5sum"].join(""))].join(" ")
        };

        chmod_config["dist_" + arch] = {
            options: {mode: '755'},
            files: {
                src: [mkdist("run"),
                      mkdist("_bin/node"),
                      mkdist("_bin/grabservice"),
                      mkdist("_bin/grabservice-hw"),
                      mkdist("_bin/grabservice-vnd")]
            }
        };

        compress_config["dist_" + arch] = {
            options: {
                archive: path.join("out", [grunt.config("pkg.name"), "_", arch, ".tar.gz"].join("")),
            },
            files: [{ expand: true, cwd: "./dist_" + arch, src: ["./**"] }]
        };

        grunt.registerTask("dist_" + arch, [
            "mkdir:dist_" + arch,
            "bower:dist_" + arch,
            "copy:dist_" + arch,
            "chmod:dist_" + arch,
            "exec:dist_npm_" + arch,
            "handlebars:dist_" + arch
        ]);

        grunt.registerTask("out_" + arch, [
            "dist_" + arch,
            "compress:dist_" + arch,
            "exec:dist_md5sum_" + arch
        ]);
    });

    grunt.config("mkdir", mkdir_config);
    grunt.config("bower", bower_config);
    grunt.config("copy", copy_config);
    grunt.config("exec", exec_config);
    grunt.config("chmod", chmod_config);
    grunt.config("compress", compress_config);
    grunt.config("handlebars", handlebars_config);

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-bower");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-auto-install");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-handlebars");
    grunt.loadNpmTasks("grunt-chmod");

    grunt.registerTask("x86_64", ["dist_x86_64"]);
    grunt.registerTask("ia32", ["dist_ia32"]);
    grunt.registerTask("arm", ["dist_arm"]);
    grunt.registerTask("arm64", ["dist_arm64"]);
};
