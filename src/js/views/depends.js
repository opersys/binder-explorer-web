define(function (require) {
    var Backbone = require("backbone/backbone");
    var sigma = require("sigma");
    var $ = require("jquery/jquery");
    var _ = require("underscore/underscore");

    // Sigma plugins. Just needs to be imported.
    require("sigma.layout.forceAtlast2");
    require("sigma.plugins.dragNodes");

    // JQuery plugins
    require("jquery-timer/jquery.timer");

    return Backbone.View.extend({

        initialize: function () {
            var self = this;

            self.timer = $.timer(function () {
                self._s.stopForceAtlas2();
            });
            self.timer.set({ time: 10000 });

            // Let's first initialize sigma:
            self._s = new sigma({
                renderer: {
                    container: this.el,
                    type: "canvas"
                },
                settings: {
                    doubleClickEnabled: false,
                    minEdgeSize: 0.5,
                    maxEdgeSize: 4,
                    enableHovering: true,
                    enableEdgeHovering: true,
                    defaultEdgeHoverColor: "black",
                    edgeHoverExtremities: true,
                    verbose: true
                }
            });

            $.ajax({ url: "/binder" })
                .done(function (data) {
                    var edgeId = 0;
                    var cangle = 0.0, angle = Math.PI * 2 / data.nodes.length;
                    var centerNode;

                    // Find the ID of the node with the most links. It will be
                    // placed in the center.
                    centerNode = _.max(_.keys(data.nodeRefs), function (n) {
                        return data.nodeRefs[n].length;
                    });

                    // I place the nodes non-randomly around a circle to obtain
                    // a more consistant placement across refreshs.
                    _.each(data.nodes, function (node) {
                        var x, y;

                        if (node.pid == centerNode)
                            x = y = 0.0;
                        else {
                            x = 0.5 * Math.cos(cangle);
                            y = 0.5 * Math.sin(cangle);
                        }

                        self._s.graph.addNode({
                            id: node.pid,
                            label: node.name,
                            x: x,
                            y: y,
                            size: 1,
                            color: "red"
                        });

                        cangle += angle;
                    });

                    _.each(data.links, function (link) {
                        self._s.graph.addEdge({
                            id: "edge" + (++edgeId),
                            source: link.source,
                            target: link.target,
                            size: 10,
                            color: "#ccc"
                        });
                    });

                    self._s.startForceAtlas2({
                        linLogMode: true,
                        gravity: 10,
                        slowDown: 50,
                        edgeWeightInfluence: 10,
                        outboundAttractionDistribution: true,
                        worker: true
                    });
                    sigma.plugins.dragNodes(self._s, self._s.renderers[0]);

                    self.timer.play();
                }
            );
        },

        resize: function () {
            this._s.renderers[0].resize();
            this._s.refresh();
        },

        render: function () {
            this._s.refresh();
        }
    });
});