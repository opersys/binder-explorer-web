/*
 * Copyright (C) 2015-2018 Opersys inc.
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

var util = require("util");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var tarball = require("tarball-extract");
var got = require("got");
var async = require("async");
var md5file = require("md5-file");
var URL = require("url").URL;

module.exports = function (grunt) {

    var mkdir_config = {},
        bower_config = {},
        copy_config = {},
        prebuilts_config = {},
        exec_config = {},
        compress_config = {},
        handlebars_config = {},
        has_config = false;

    grunt.config.init({
        pkg: grunt.file.readJSON("package.json")
    });

    _.each(["arm", "arm64", "ia32", "x86_64"], function (arch) {

        var mkdist = function (arch) {
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
            "./src/templates/template-userservices.hbs"
        ];

        copy_config["dist_" + arch] = {
            files: [
                { src: ["package.json"], dest: mkdist("/") },
                { src: ["bower.json"], dest: mkdist("/") },
                { expand: true, cwd: "bin", src: ["**"], dest: mkdist("_bin") },
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
                "md5sum", path.join("out", [grunt.config("pkg.name"), "_", arch, ".zip"].join("")),
                "|",
                "cut -f 1 -d ' ' > " + path.join("out", [grunt.config("pkg.name"), "_", arch, ".zip.md5sum"].join(""))].join(" ")
        };

        compress_config["dist_" + arch] = {
            options: {
                archive: path.join("out", [grunt.config("pkg.name"), "_", arch, ".zip"].join("")),
                mode: 0
            },
            files: [{ expand: true, cwd: "./dist_" + arch, src: ["./**"] }]
        };

        prebuilts_config["dist_" + arch] = _.map(grunt.config("pkg.prebuilts.modules." + arch), function (v) {
            return {
                url: v,
                arch: arch
            };
        });

        grunt.registerTask("dist_" + arch, [
            "mkdir:dist_" + arch,
            "bower:dist_" + arch,
            "copy:dist_" + arch,
            "exec:dist_npm_" + arch,
            "prebuilts:dist_" + arch,
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
    grunt.config("prebuilts", prebuilts_config);
    grunt.config("compress", compress_config);
    grunt.config("handlebars", handlebars_config);

    function extract(arch, dlfile, doneCb) {
        var exdest = path.join("dist_" + arch, "node_modules");
        grunt.log.writeln("Extracting: " + dlfile);
        tarball.extractTarball(dlfile, exdest, doneCb);
    }

    function downloadAndExtract(arch, dataUrl, doneCb) {
        var url = new URL(dataUrl);
        var dlfile = path.basename(url.pathname);
        var dldest = path.join("prebuilt_" + arch , dlfile);

        fs.exists(dldest, function (exists) {
            if (!exists) {
                var dlstream = got.stream(url.toString());

                grunt.log.writeln("Downloading: " + dataUrl);

                dlstream.on("end", function () {
                    extract(arch, dldest, doneCb);
                });
                dlstream.pipe(fs.createWriteStream(dldest));
            }
            else extract(arch, dldest, doneCb);
        });
    }

    grunt.registerTask("jsbinder_oreo", "Fetches JSBinder for Oreo", function (arch) {
        var done = this.async();

        if (!fs.existsSync("dist_" + arch + "/node_modules/jsbinder")) {
            downloadAndExtract(
                arch,
                "https://github.com/opersys/jsbinder/releases/download/0.4.0-Oreo/jsbinder-0.4.0_oreo_" + arch + ".tar.gz",
                done);
        }
    });

    grunt.registerMultiTask("prebuilts", "Download a prebuilt package from an URL", function () {
        var data = this.data;
        var done = this.async();

        async.each(data,
            function (dldata, callback) {
                downloadAndExtract(dldata.arch, dldata.url, callback);
            }, done
        );
    });

    grunt.loadNpmTasks("grunt-mkdir");
    grunt.loadNpmTasks("grunt-bower");
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-auto-install");
    grunt.loadNpmTasks("grunt-exec");
    grunt.loadNpmTasks("grunt-contrib-compress");
    grunt.loadNpmTasks("grunt-contrib-handlebars");
    grunt.loadNpmTasks("grunt-chmod");

    grunt.registerTask("x86_64", ["dist_x86_64", "jsbinder_oreo:x86_64"]);
    grunt.registerTask("ia32", ["dist_ia32"]);
    grunt.registerTask("arm", ["dist_arm"]);
    grunt.registerTask("arm64", ["dist_arm64", "jsbinder_oreo:arm64"]);
};
