/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/9/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */


define(['exports', 'd3', 'underscore', './vials-gui', '../caleydo_core/event', 'vials-helper'], function (exports, d3, _, gui, event, helper) {
    /**
     * a simple template class of a visualization. Up to now there is no additional logic required.
     * @param data
     * @param parent
     * @constructor
     */
    function VialsJunctionVis(data, parent) {
        this.data = data;
        this.parent = parent;
        this.node = this.build(d3.select(parent));
    }

    /**
     * factory method of this module
     * @param data the data to show
     * @param parent the parent dom element to append
     * @returns {VialsJunctionVis} the visualization
     */
    function create(data, parent) {
        return new VialsJunctionVis(data, parent);
    }

    // GLOBAL VARIABLES & STATUS
    var margin = {top: 40, right: 150, bottom: 20, left: 150};
    var fullHeight = 370;
    var height = fullHeight - margin.top - margin.bottom;

    var abundancePlot = {
        height: 200,
        prefix: "jxn_weight",
        y: 0,
        panels: {
            panelGapsize: 4,
            prefix: "jxn_weight_panel",

            mini: {
                //boxPlotWidth:3,
                boxPlotOffset: 0,
                //width:5,
                currentWidth: 5 // STATIC !!
            },
            std: {
                minWidth: 15,
                boxPlotWidth: 7,
                boxPlotOffset: 0,
                currentWidth: -1 // dynamic
            },
            scatter: {
                minWidth: 100,
                maxWidth: 200,
                boxPlotOffset: 0,
                currentWidth: 100 // dynamic
            },
            groupX: {
                minWidth: 100,
                maxWidth: 200,
                boxPlotOffset: 5,
                currentWidth: 100 // dynamic
            },


            //scatterWidth:100,
            //dynamic paramters:

        }

    }

    var connectorPlot = {
        height: 100,
        prefix: "jxn_con",
        y: abundancePlot.height,
        frozenHighlight: null, // dynamic
        upperConnectors: {
            height: 60,
            prefix: "jxn_con_upper",
            y: 0
        },
        triangles: {
            height: 8,
            y: 60,
            prefix: "jxn_con_triangle"
        }
        ,
        lowerConnectors: {
            height: 100 - (60 + 8),
            prefix: "jxn_con_lower",
            y: 60 + 8
        }
    }

    var heatmapPlot = {
        height: 15,
        prefix: "jxn_heat",
        y: abundancePlot.height + connectorPlot.height
    }


    /**
     * build the vis and return node
     * @param $parent - the d3 selection of parent node
     * @returns {Node} the node
     */
    VialsJunctionVis.prototype.build = function ($parent) {

        /*
         ================= INIT =====================
         */


        //-- initial parametrization:
        var that = this;
        var axis = that.data.genomeAxis;
        var width = axis.getWidth();

        // data var:
        var allData = {}; // api data
        var triangleData = []; // data to draw triangles
        var allJxns = {}; // juncntion information as map
        var allExons = [];
        var jxnGroups = []; // end positions of jxn groups for connector drawing
        var sampleOrder = {definedSize: 0, order: [], valid: false, sortByKey: null}; // sort order for elements in scatterplot view (abundance)

        var groupings = []; // hold grouping information
        var groupingsMeta = [] // separate grouping meta information

        var isSelectedIsoForm = false;

        //visual variables:
        var weightScale = d3.scale.linear().range([abundancePlot.height - 10, 10]);
        var endOfPanels = 10; // whats the final width of all panels


        //--  create the outer DOM structure:
        var head = $parent.append("div").attr({
            "class": "gv"
        })
        var svg = head.append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style({
                "left": "20px",
                "position": "relative"
            })

        //--  create textLabel and retrieve its width
        var textLabelPadding = helper.drawSideLabel(svg, height, margin, 'center');

        //--  create a group offset by the label
        var svgMain = svg.append("g").attr({
            "class": "jxnMain",
            "transform": "translate(" + textLabelPadding + ",0)"
        });

        abundancePlot.g = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + abundancePlot.y + ")",
            "class": abundancePlot.prefix + "_group"
        });


        heatmapPlot.g = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + heatmapPlot.y + ")",
            "class": heatmapPlot.prefix + "_group"
        });

        var crosshairGroup = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + heatmapPlot.y + ")",
            "class": "crosshair_group"
        });

        connectorPlot.g = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + connectorPlot.y + ")",
            "class": connectorPlot.prefix + "_group"
        });

        ["triangles", "upperConnectors", "lowerConnectors"].forEach(function (subGroup) {
            connectorPlot[subGroup].g = connectorPlot.g.append("g").attr({
                "transform": "translate(" + 0 + "," + connectorPlot[subGroup].y + ")",
                "class": connectorPlot[subGroup].prefix + "_group"
            });
        });


        function initView() {

            // create crosshair
            crosshairGroup.append("line").attr({
                "class": "crosshair",
                "x1": 0,
                "y1": 0,
                "x2": 0,
                "y2": fullHeight - heatmapPlot.y
            }).style({
                "stroke-width": "1",
                "stroke": "black",
                "pointer-events": "none"
            });

            crosshairGroup.append("text").attr("class", "crosshairPos")

            var currentX = 0;
            heatmapPlot.g.on("mousemove", function () {
                currentX = d3.mouse(this)[0];
                event.fire("crosshair", currentX);

            })


            initEventHandlers();
        }


        function initEventHandlers() {

            // -- global Events
            event.on("newDataLoaded", dataUpdate);
            event.on("crosshair", updateCrosshair);
            event.on("updateVis", updateVis);
            event.on("axisChange", updateVis);

            // -- highlight a Junction
            event.on("highlightJxn", function (e, key, highlight) {

                //======== FLAGs =======

                //TODO: potential cause for errors
                if (connectorPlot.frozenHighlight != null) {
                    var clean = connectorPlot.frozenHighlight;
                    connectorPlot.frozenHighlight = null;
                    event.fire("highlightFlag", clean, false);
                }

                var triangles = connectorPlot.triangles.g.selectAll(".triangle")
                var highlightTriangles = triangles.filter(function (d) {
                    // TODO: the location could be only a substring of a real location (unlikely but maybe)
                    if (key.indexOf(d.loc) > -1) return true;
                    else return false;
                })
                highlightTriangles.classed("highlighted", highlight);

                //========= CONNECTORS ====

                var lowerConnector = connectorPlot.lowerConnectors.g.selectAll(".con");
                lowerConnector.filter(function (d) {
                    // TODO: the location could be only a substring of a real location (unlikely but maybe)
                    if (key.indexOf(d.loc) > -1) return true;
                    else return false;
                }).classed("highlighted", highlight);

                var directNeighbors = connectorPlot.upperConnectors.g.selectAll(".neighborCon");
                directNeighbors.filter(function (d) {
                    return key == (d.jxns[0].start + ":" + d.jxns[0].end); // if start and end assemble to the key
                }).classed("highlighted", highlight);

                var donorConnectors = connectorPlot.upperConnectors.g.selectAll(".donorCon");
                donorConnectors.filter(function (d) {
                    return d.key == key;
                }).classed("highlighted", highlight);

                var accConnectors = connectorPlot.upperConnectors.g.selectAll(".accCon");
                accConnectors.filter(function (d) {
                    return d.key == key;
                }).classed("highlighted", highlight);


                // ========= Panels =====
                var panels = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix);
                var keyPanel = panels.filter(function (d) {
                    return d.key == key;
                })
                keyPanel.select(".panelIndicator").style("opacity", highlight ? 1 : null);
                keyPanel.select(".panelBG").classed("highlighted", highlight)//.style("fill-opacity",highlight?.1 :null);


            })

            // -- hover over a flag
            event.on("highlightFlag", function (e, loc, highlight) {
                //console.log("allJxns",allJxns);

                _.keys(allJxns).forEach(function (key) {
                    var obj = allJxns[key];
                    if (obj.start == loc || obj.end == loc) {
                        event.fire("highlightJxn", key, highlight);
                    }
                })


            })

            // *****************
            // ******** External Data Events: highlights & selections
            // *****************

            event.on("sampleHighlight", function (e, sample, highlight) {
                var panels = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix);
                var hDots = panels.selectAll(".dots").filter(function (d) {
                    return d.w.sample == sample;
                })
                hDots.classed("highlighted", highlight);
            });

            event.on("groupHighlight", function (e, groupID, highlight) {
                var alldots = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix).selectAll(".dots");
                alldots.filter(function (d) {
                    return groupID.samples.indexOf(d.w.sample) > -1
                }).classed("highlighted", highlight);
            })

            event.on('sampleSelect', function (e, sample, isSelected) {
                var alldots = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix).selectAll(".dots");
                if (isSelected) {
                    alldots.filter(function (d) {
                        return d.w.sample == sample;
                    }).style({
                        fill: gui.current.getColorForSelection(sample)
                    })
                } else {
                    alldots.filter(function (d) {
                        return d.w.sample == sample;
                    }).style({
                        fill: null
                    })
                }
            })

            event.on("groupSelect", function (e, groupID, isSelected) {
                var alldots = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix).selectAll(".dots");
                if (isSelected) {
                    alldots.filter(function (d) {
                        return groupID.samples.indexOf(d.w.sample) > -1
                    }).style({
                        fill: gui.current.getColorForSelection(JSON.stringify(groupID))
                    })
                } else {
                    alldots.filter(function (d) {
                        return groupID.samples.indexOf(d.w.sample) > -1
                    }).style({
                        fill: null
                    })
                }
            })

            event.on("isoFormSelect", function (e, isoInfo) {
                //{isoform: d.id, index:-1}

                if (isoInfo.index > -1) {
                    isSelectedIsoForm = true;
                    //var exonIDs = allData.gene.isoforms[isoInfo.isoform].exons;
                    var selectedExons = _.sortBy(allExons.filter(function(d){return d.isoformID == isoInfo.isoform;}), 'start');


                    // all JXNs to std:
                    _.values(allJxns).forEach(function (jxn) {
                        jxn.state = 'mini';
                        jxn.selectedIsoform = false;
                    })


                    //var jxnIDs =[];
                    //var matchingJxn = [];
                    var lastExon = null;

                    selectedExons.forEach(function (exon) {
                        if (lastExon != null) {
                            //jxnIDs.push(lastExon.end+'_'+exon.start);

                            var match = allJxns[lastExon.end + ':' + exon.start];
                            if (match != null) {
                                match.state = 'scatter' // TODO: modify default behavior
                                match.selectedIsoform = true; // needed for decoration
                                //matchingJxn.push(match);
                            }
                            lastExon = exon;
                        } else {
                            lastExon = exon;
                        }
                    })


                } else {
                    isSelectedIsoForm = false;
                    // all JXNs to std:
                    _.values(allJxns).forEach(function (jxn) {
                        jxn.state = 'std';
                        jxn.selectedIsoform = false;
                    })

                }

                updateVis();

            })


            event.on("groupingChanged", function (e, a, b, c) {
                console.log(a, '\n', '-- new --');
                console.log(b, '\n', '-- old --');

                if (a.length == 1) {
                    groupings.push(a[0]);
                    //a[0].samples

                    var samples = a[0].samples;


                    var allBoxPlots = {};
                    _.keys(allJxns).forEach(function (jkey) {
                        var jxn = allJxns[jkey];


                        var allWeights = _.pluck(jxn.weights.filter(function (d) {
                            return _.contains(samples, d.sample);
                        }), 'weight');
                        if (allWeights.length > 2) allBoxPlots[jkey] = {boxplot: helper.computeBoxPlot(allWeights)};
                    })

                    groupingsMeta.push(allBoxPlots);

                    //console.log(allData,'\n-- allData --');
                    //console.log(allJxns,'\n-- allJxns --');


                    computeAbundanceLayout();
                    updateAbundanceView();

                } else if (b.length == 1) {
                    var index = groupings.indexOf(b[0]);
                    if (index > -1) {
                        groupings.splice(index, 1);
                        groupingsMeta.splice(index, 1);
                    }

                    computeAbundanceLayout();
                    updateAbundanceView();

                }

                console.log(groupingsMeta, '\n-- groupingsMeta --');


            })


        }


        /*
         ================= DRAW METHODS =====================
         */

        function updateCrosshair(event, x) {
            var visible = (x < 0 || x > axis.getWidth()) ? "hidden" : "visible";

            crosshairGroup.selectAll(".crosshair").attr({
                "x1": x,
                "x2": x,
                "visibility": visible
            })

            d3.selectAll(".crosshairPos")
                .text(function (d) {
                    return axis.screenPosToGenePos(x)
                })
                .each(function () {
                    var self = d3.select(this),
                        bb = self.node().getBBox();
                    self.attr({
                        "x": x + 10,
                        "y": fullHeight - heatmapPlot.y - bb.height / 2,
                        "visibility": visible
                    });
                })
        }

        // -- HEATMAP PLOT --
        function updateHeatmap() {
            // bind local data
            var heatMapGroup = heatmapPlot.g;

            var startField = axis.ascending ? 'start' : 'end';
            var endField = axis.ascending ? 'end' : 'start';

            // --- D3 update cycle
            var exonHeat = heatMapGroup.selectAll(".exon").data(allExons);
            exonHeat.exit().remove();

            // --- adding Element to class exon
            var exonHeatEnter = exonHeat.enter().append("rect").attr({
                "class": heatmapPlot.prefix + " exon",
                y: 0,
                height: heatmapPlot.height
            })

            // --- changing attr for exon
            exonHeat.transition().attr({
                x: function (d) {
                    return axis.genePosToScreenPos(d[startField]);
                },
                width: function (d) {
                    return axis.genePosToScreenPos(d[endField]) - axis.genePosToScreenPos(d[startField]);
                }
            })


            function updateReverseButton() {
                var directionToggleGroup = heatMapGroup.selectAll(".directionToggleGroup").data([1])
                var directionToggleGroupEnter = directionToggleGroup.enter().append("g").attr({
                    "class": "directionToggleGroup"
                })
                directionToggleGroupEnter.append("rect").attr({
                    "class": "directionToggle",
                    "width": 125,
                    "height": 20,
                    "rx": 10,
                    "ry": 10
                }).on("click", function () {
                    axis.reverse();
                    d3.select(this).classed("selected", !axis.ascending);
                    event.fire("axisChange");
                })

                directionToggleGroupEnter.append("line").attr({
                    "x1": 20,
                    "x2": 50,
                    "y1": 10,
                    "y2": 10,
                    //"stroke": "black",
                    "stroke-width": 5,
                    "marker-end": "url(\#scaleArrow)",
                    "marker-start": "url(\#scaleArrow)",
                }).style("pointer-events", "none");
                var directionToggleText = directionToggleGroupEnter.append("text").attr({}).text("reverse");
                directionToggleText.attr("transform", "translate(65, 14)");
                directionToggleText.style("pointer-events", "none");

                directionToggleGroup.attr({
                    "transform": "translate(" + (axis.width + 10) + ",0)"
                });


            }

            updateReverseButton();


        }

        /**
         * update flag drawing
         * hidden option is boolean for animation = false
         */
        function updateFlags() {

            var animate = arguments[0] || false;
            var triangleLength = connectorPlot.triangles.height;
            var positiveStrand = allData.gene.strand === '+';

            var triangles = connectorPlot.triangles.g.selectAll(".triangle").data(triangleData);
            triangles.exit().remove();

            triangles.enter().append("polygon").attr({
                "transform": function (d, i) {
                    return "translate(" + d.xStart + ",0)"
                },
                "class": connectorPlot.triangles.prefix + " triangle "
            }).on({
                "mouseover": function (d) {
                    event.fire("crosshair", axis.genePosToScreenPos(d.loc));
                    event.fire("highlightFlag", +d.loc, true);
                },
                "mouseout": function (d) {
                    if (connectorPlot.frozenHighlight == null) event.fire("highlightFlag", +d.loc, false);
                },
                "click": function (d) {
                    if (connectorPlot.frozenHighlight == null) connectorPlot.frozenHighlight = +d.loc;
                    else connectorPlot.frozenHighlight = null;
                }
            })

            triangles.classed("donor", function (d) {
                return d.type == 'donor' ? true : null;
            })
            triangles.classed("receptor", function (d) {
                return d.type == 'receptor' ? true : null;
            })

            triangles.attr({
                //+ d.type;},
                "points": function (d, i) {
                    return isLeftArrow(d.type, positiveStrand) ?
                        [
                            0, triangleLength / 2,
                            triangleLength, 0,
                            triangleLength, triangleLength
                        ] : [
                        triangleLength, triangleLength / 2,
                        0, 0,
                        0, triangleLength
                    ]
                }
            })

            var trans = triangles;
            if (animate) trans = triangles.transition();

            //TODO: remove one transition
            trans.transition().attr({
                "transform": function (d, i) {
                    return "translate(" + d.xStart + ",0)"
                }
            })

        }

        function updateConnectors() {
            var triangleLength = connectorPlot.triangles.height;
            var positiveStrand = allData.gene.strand === '+';


            var startField = axis.ascending ? 'start' : 'end';
            var endField = axis.ascending ? 'end' : 'start';


            /* -- update lower connectors - D3 circle -- */
            var lowerConnector = connectorPlot.lowerConnectors.g.selectAll(".con").data(triangleData);
            lowerConnector.exit().remove();

            lowerConnector.enter().append("polyline").attr({
                "class": connectorPlot.lowerConnectors.prefix + " con"
            })

            lowerConnector.transition().attr({
                "points": function (d, i) {
                    return [
                        d.anchor, 0,
                        d.anchor, triangleLength / 2,
                        axis.genePosToScreenPos(d.loc), connectorPlot.lowerConnectors.height
                    ]
                }
            })

            // draw direct neighbors
            var directNeighbors = connectorPlot.upperConnectors.g.selectAll(".neighborCon").data(jxnGroups.filter(function (d) {
                return d.directNeighbor;
            }))
            directNeighbors.exit().remove();

            directNeighbors.enter().append("polygon").attr({
                "class": "neighborCon areaCon"
            }).on({
                "mouseover": function (d) {
                    event.fire("highlightJxn", (d.jxns[0].start + ":" + d.jxns[0].end), true)
                },
                "mouseout": function (d) {
                    event.fire("highlightJxn", (d.jxns[0].start + ":" + d.jxns[0].end), false)
                }
            })

            var h = connectorPlot.upperConnectors.height;
            directNeighbors.transition().attr({
                points: function (d) {
                    var jxn = d.jxns[0];
                    return [
                        jxn.x, 0,
                        jxn.x + jxn.w, 0,
                        jxn[endField + "Triangle"].anchor, h,
                        jxn[startField + "Triangle"].anchor, h
                    ]

                }
            })
            // isoformselection
            directNeighbors.classed('hiddenCon', function (d) {
                return (isSelectedIsoForm && !d.jxns[0].selectedIsoform) ? true : null;
            })


            var allDonors = _.flatten(jxnGroups.filter(function (d) {
                return !d.directNeighbor;
            }).map(function (d) {
                return d.jxns.map(function (jxn) {
                    return {endX: jxn.x + jxn.w, jxns: [jxn], key: (jxn.start + ':' + jxn.end)}
                })
            }))


            // -- draw donor connectors
            var donorConnectors = connectorPlot.upperConnectors.g.selectAll(".donorCon")
                .data(allDonors, function (d) {
                    return d.key
                }) //jxnGroups.filter(function(d){return !d.directNeighbor;}) TODO: decide for a strategy: allgroup or single select
            donorConnectors.exit().remove();

            donorConnectors.enter().append("polygon").attr({
                "class": "donorCon areaCon"
            }).on({
                "mouseover": function (d) {
                    event.fire("highlightJxn", d.key, true)
                },
                "mouseout": function (d) {
                    event.fire("highlightJxn", d.key, false)
                }
            })


            var h = connectorPlot.upperConnectors.height;
            var connector = (positiveStrand/*==axis.ascending*/) ? 'startTriangle' : 'endTriangle'
            var antiConnector = (positiveStrand/*==axis.ascending*/) ? 'endTriangle' : 'startTriangle'

            donorConnectors.transition().attr({
                points: function (d) {
                    var jxn = d.jxns[0];
                    return [
                        jxn.x, 0,
                        d.endX, 0,
                        jxn[connector].anchor, h
                    ]

                }
            })

            donorConnectors.classed('hiddenCon', function (d) {
                return (isSelectedIsoForm && !d.jxns[0].selectedIsoform) ? true : null;
            })


            // -- Retrieve Connector Lines
            var allConLines = _.flatten(jxnGroups.filter(function (d) {
                return !d.directNeighbor;
            }).map(function (d) {
                return d.jxns.map(function (jxn) {
                    return {
                        startX: (jxn.x + jxn.w / 2),
                        endX: jxn[antiConnector].anchor,
                        key: (jxn.start + ':' + jxn.end),
                        jxn: jxn
                    }
                })
            }))

            //--- plot connector lines
            var accConnectors = connectorPlot.upperConnectors.g.selectAll(".accCon").data(allConLines)
            accConnectors.exit().remove();

            accConnectors.enter().append("line").attr({
                "class": "accCon lineCon"
            })

            accConnectors.transition().attr({
                x1: function (d) {
                    return d.startX;
                },
                x2: function (d) {
                    return d.endX;
                },
                y1: 0,
                y2: h
            })

            //isoformselction
            accConnectors.classed('hiddenCon', function (d) {
                return (isSelectedIsoForm && !d.jxn.selectedIsoform) ? true : null;
            })


        }

        function updateAbundanceView() {
            var allJxnArray = Object.keys(allJxns).map(function (key) {
                return {
                    key: key, jxn: allJxns[key]
                };
            })


            // --  PANELS
            var panels = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix)
                .data(allJxnArray, function (d) {
                    return d.key;
                })
            panels.exit().remove();

            // --- Enter:
            var panelsEnter = panels.enter().append("g").attr({
                class: abundancePlot.panels.prefix + " panel"
            })
            panelsEnter.append("rect").attr({
                class: "panelBG",
                height: abundancePlot.height
            }).on({
                "click": function (d) {
                    if (d.jxn.state == 'std') d.jxn.state = 'scatter';
                    else d.jxn.state = 'std';
                    event.fire("updateVis")
                },
                "mouseover": function (d) {
                    event.fire("highlightJxn", d.key, true);

                    //d3.select(this).style({stroke:"grey"});
                },
                "mouseout": function (d) {
                    event.fire("highlightJxn", d.key, false)
                    //d3.select(this).style({stroke:"none"});
                }
            })
            panelsEnter.append("rect").attr({
                class: "panelIndicator",
                height: 5,
                x: 3,
                y: abundancePlot.height - 6
            })


            // --- Updates:
            panels.transition().attr({
                "transform": function (d) {
                    return "translate(" + d.jxn.x + "," + 0 + ")";
                }
            })
            panelBG = panels.select(".panelBG")
            panelBG.transition().attr({
                width: function (d) {
                    return d.jxn.w;
                }
            })
            panelBG.classed("scatter", function (d) {
                return (d.jxn.state == 'scatter' || d.jxn.state == 'groupX') ? true : null;
            })

            panels.select(".panelIndicator").transition().attr({
                width: function (d) {
                    if (d.jxn.state == 'mini') return 1;
                    return d.jxn.w - 6;
                }
            })


            var allSampleLength = Object.keys(allData.samples).length;

            /**
             * Update Cycle for the abundance/weight dots per panel
             */
            function updateDots() {

                // precalculations for state 'groupX':
                var gLength = groupings.length;
                var groupingOffset = 12;
                var groupInc = (abundancePlot.panels.groupX.currentWidth - groupingOffset) / (gLength + 1);


                var alldots = panels.selectAll(".dots").data(function (d) {
                    if (d.jxn.state == 'std') {
                        var randomizer = helper.getPseudoRandom()
                        res = d.jxn.weights.map(function (w) {
                            return {x: (d.jxn.w * 3 / 8 + randomizer() * d.jxn.w / 4), w: w}
                        })
                        return res;

                    }
                    else if (d.jxn.state == 'scatter') {
                        var res = [];
                        if (!sampleOrder.valid) {
                            res = d.jxn.weights.map(function (w, i) {
                                return {
                                    x: 6 + (i / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)),
                                    w: w
                                }
                            })
                        } else {
                            res = d.jxn.weights.map(function (w, i) {
                                return {
                                    x: 6 + (sampleOrder.order.indexOf(w.sample) / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)),
                                    w: w
                                }
                            })
                        }

                        return res;

                    }
                    else if (d.jxn.state == 'mini') {
                        res = d.jxn.weights.map(function (w) {
                            return {x: abundancePlot.panels.mini.currentWidth / 2, w: w}
                        })
                        return res;
                    }
                    else if (d.jxn.state == 'groupX') {

                        if (groupings.length > 0) {

                            var mapIDtoI = {}
                            groupings.forEach(function (group, i) {
                                group.samples.forEach(function (sample) {
                                    mapIDtoI[sample] = i;
                                });
                            })


                            res = d.jxn.weights.map(function (w) {
                                var x = mapIDtoI[w.sample];
                                if (x == null) x = groupings.length;
                                return {
                                    x: (groupingOffset + (x + .5) * groupInc + abundancePlot.panels.std.boxPlotWidth / 2),
                                    w: w
                                }
                            })
                        } else {
                            res = d.jxn.weights.map(function (w) {
                                return {x: (d.jxn.w / 2), w: w}
                            })
                        }

                        return res;

                    }

                }, function (d) {
                    return d.w.sample;
                })

                alldots.exit().remove();

                alldots.enter().append("circle").attr({
                    class: "dots",
                    r: 2
                }).on({
                    "mouseover": function (d) {
                        event.fire("sampleHighlight", d.w.sample, true);
                        //console.log(d3.select(this.parentNode).data()[0].key);
                        event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, true);
                    },
                    "mouseout": function (d) {
                        event.fire("sampleHighlight", d.w.sample, false);
                        event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, false);
                    },
                    'click': function (d) {
                        if (d3.select(this).classed("selected")) {
                            //deselect
                            d3.select(this).classed("selected", null);
                            event.fire("sampleSelect", d.w.sample, false)
                        } else {
                            //select
                            d3.select(this).classed("selected", true);
                            event.fire("sampleSelect", d.w.sample, true)
                        }

                    }

                })

                alldots.transition().attr({
                    cx: function (d) {
                        return d.x;
                    },
                    cy: function (d) {
                        return weightScale(d.w.weight);
                    }
                })


            }

            updateDots();


            // --- SORT DIVIDER to indicate what is valid sorting and what is random

            var sortDevider = panels.selectAll(".sortDivider")
                .data(function (d) {
                    return (sampleOrder.valid && d.jxn.state == 'scatter') ?
                        [Math.ceil(6 + ((sampleOrder.definedSize - 1) / allSampleLength * (abundancePlot.panels.scatter.currentWidth - 12)))]
                        : []
                }
            );
            sortDevider.exit().remove();
            sortDevider.enter().append("line").attr({
                class: "sortDivider",
                x1: function (d) {
                    return 0;
                },
                x2: function (d) {
                    return 0;
                },
                y1: weightScale.range()[0],
                y2: weightScale.range()[1]
            })
            sortDevider.transition().attr({
                x1: function (d) {
                    return d;
                },
                x2: function (d) {
                    return d;
                }
            })


            function updateBoxPlots() {
                //console.log("allData",allData);
                //console.log(allJxns,'-- allJxns --');


                //TODO: copied from isoforms.. maybe externalizing ?!

                var height = abundancePlot.panels.std.boxPlotWidth;
                var offsetStd = Math.max(abundancePlot.panels.std.boxPlotOffset,
                    Math.floor((abundancePlot.panels.std.currentWidth - height) / 2));

                var gLength = groupings.length;
                var groupingOffset = 12;
                var groupInc = (abundancePlot.panels.groupX.currentWidth - groupingOffset) / (gLength + 1);

                var boxPlots = panels.selectAll(".boxplot").data(function (d) {
                    var res = [];
                    if (d.jxn.weights.length > 3 && !(d.jxn.state == 'mini')) {
                        if (d.jxn.state == 'groupX') {

                            res.push({
                                boxPlot: d.jxn.boxPlotData,
                                state: d.jxn.state,
                                x: abundancePlot.panels.groupX.boxPlotOffset
                            });

                            groupingsMeta.forEach(function (gMeta, gmIndex) {
                                var gm = gMeta[d.key];
                                if (gm != null)res.push({
                                    boxPlot: gm.boxplot,
                                    state: d.jxn.state,
                                    x: (groupingOffset + (gmIndex + .5) * groupInc)
                                });
                                console.log("xxx", {
                                    boxPlot: gm.boxplot,
                                    state: d.jxn.state,
                                    x: (groupingOffset + (gmIndex + .5) * groupInc)
                                });

                            })


                            // tODO HEREE
                        } else {


                            if (d.jxn.state === 'scatter') res.push({
                                boxPlot: d.jxn.boxPlotData,
                                state: d.jxn.state,
                                x: abundancePlot.panels.scatter.boxPlotOffset
                            });

                            else res.push({
                                boxPlot: d.jxn.boxPlotData,
                                state: d.jxn.state,
                                x: offsetStd
                            });


                        }


                    }


                    return res;

                })
                boxPlots.exit().remove();

                var scaleXScatter = d3.scale.linear().domain(weightScale.domain()).rangeRound(weightScale.range());


                var boxPlotGroup = boxPlots.enter().append("g")
                    .attr({
                        "class": "boxplot",
                        "transform": "translate(" + offsetStd + "," + 0 + ")"
                    }
                );
                //boxPlotGroup.attr({"transform":"rotate(90)"});
                boxPlotGroup.selectAll(".vticks").data(function (d) {
                    //console.log(d,'-- d --');
                    return [
                        d.boxPlot.whiskerDown,
                        d.boxPlot.Q[1],
                        d.boxPlot.Q[2],
                        d.boxPlot.Q[3],
                        d.boxPlot.whiskerTop]
                }).enter().append("line").attr({
                    class: "vticks",
                    y1: function (d) {
                        return scaleXScatter(d);
                    },
                    y2: scaleXScatter,
                    x1: 0,
                    x2: height
                })

                boxPlotGroup.selectAll(".hticks").data(function (d) {
                    return [
                        [0, d.boxPlot.Q[1], d.boxPlot.Q[3]],
                        [height, d.boxPlot.Q[1], d.boxPlot.Q[3]]
                    ];
                }).enter().append("line").attr({
                    class: "hticks",
                    y1: function (d) {
                        return scaleXScatter(d[1]);
                    },
                    y2: function (d) {
                        return scaleXScatter(d[2]);
                    },
                    x1: function (d) {
                        return d[0];
                    },
                    x2: function (d) {
                        return d[0];
                    }
                })

                boxPlotGroup.selectAll(".wticks").data(function (d) {
                    return [
                        [d.boxPlot.whiskerDown, d.boxPlot.Q[1]],
                        [d.boxPlot.Q[3], d.boxPlot.whiskerTop]
                    ];
                }).enter().append("line").attr({
                    class: "wticks",
                    y1: function (d) {
                        return scaleXScatter(d[0]);
                    },
                    y2: function (d) {
                        return scaleXScatter(d[1]);
                    },
                    x1: Math.round(height / 2),
                    x2: Math.round(height / 2)
                })


                //UPDATE POSITION:
                boxPlots.transition().attr({
                    "transform": function (d) {
                        return "translate(" + d.x + "," + 0 + ")";
                    }
                })


            }

            updateBoxPlots();


            /**
             * ===== update the menu decoration for each panel ===
             *
             */
            function updateDeco() {
                // --- Decoration gets in here


                var decoLeft = panels.selectAll(".decoration.left").data(function (d) {
                    if (d.jxn.state == 'scatter' || d.jxn.state == 'groupX') {
                        return [
                            {
                                icon: "\uf012",
                                callOnClick: function () {
                                    sortByJxn(d.key);
                                },
                                description: "sort by weight",
                                d: d,
                                isSelected: (d.key == sampleOrder.sortByKey && sampleOrder.valid)
                            },
                            {
                                icon: "\uf24d", callOnClick: function () {
                                switchGroupState(d.key);
                            }, description: "compare groups", d: d, isSelected: (d.jxn.state == 'groupX')
                            },
                            {
                                icon: "\uf259", callOnClick: function () {
                            }, description: "Live long and prosper.", d: d, isSelected: false
                            }
                        ]
                    } else {
                        return []
                    }
                })
                decoLeft.exit().remove();
                decoLeft.enter().append("text").attr({
                    class: "decoration left",
                    "transform": function (d, i) {
                        return "translate(" + (i * 15 + 2) + "," + 15 + ")";
                    }
                })
                    .text(function (d) {
                        return d.icon;
                    })
                    .on({
                        'mouseover': function (d) {
                            event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, true);
                        },
                        'mouseout': function (d) {
                            event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, false);
                        },
                        'click': function (d) {
                            d.callOnClick();
                        }

                    })
                    .append("title").text(function (d) {
                        return d.description;
                    })
                decoLeft.classed("selected", function (d) {
                    return d.isSelected ? true : null;
                })


                // right indicators
                var decoRight = panels.selectAll(".decoration.right").data(function (d) {
                    if (d.jxn.state == 'scatter' || d.jxn.state == 'std' || d.jxn.state == 'groupX') {
                        if (d.jxn.selectedIsoform) {
                            return [{
                                icon: "\uf02e",
                                callOnClick: function () {
                                },
                                description: "in selected Isoform",
                                class: 'inIsoformIndicator',
                                d: d,
                                isSelected: false
                            }]
                        }
                    }

                    return []

                })
                decoRight.exit().remove();

                decoRight.enter().append("text").attr({
                    class: function (d) {
                        return "decoration right " + d.class;
                    },
                    "transform": function (d, i) {
                        var w = d.d.jxn.state == 'std' ? abundancePlot.panels.std.currentWidth : abundancePlot.panels.scatter.currentWidth;
                        return "translate(" + (w - (i * 15 + 2)) + "," + 15 + ")";
                    }
                })
                    .text(function (d) {
                        return d.icon;
                    })
                    .on({
                        'mouseover': function (d) {
                            event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, true);
                        },
                        'mouseout': function (d) {
                            event.fire("highlightJxn", d3.select(this.parentNode).data()[0].key, false);
                        },
                        'click': function (d) {
                            d.callOnClick();
                        }

                    })
                    .append("title").text(function (d) {
                        return d.description;
                    })

                decoRight.transition().attr({
                    "transform": function (d, i) {
                        var w = d.d.jxn.state == 'std' ? abundancePlot.panels.std.currentWidth : abundancePlot.panels.scatter.currentWidth;
                        return "translate(" + (w - 15 - 2 - (i * 15)) + "," + 15 + ")";
                    }
                })
                decoRight.classed("selected", function (d) {
                    return d.isSelected ? true : null;
                })


            }

            updateDeco();


            function sortByJxn(key) {
                //console.log("key",key);
                //console.log("allData",allData);
                //console.log("allJxns",allJxns);

                var allKeys = Object.keys(allData.samples)

                if (key in allJxns) {

                    var sortedWeights =
                        _.pluck(
                            _.sortBy(
                                allJxns[key].weights
                                    .filter(function (d) {
                                        return d.weight > 0;
                                    })
                                , 'weight')
                            , 'sample'
                        )

                    var allNull = _.difference(allKeys, sortedWeights)


                    sampleOrder.definedSize = sortedWeights.length;
                    sampleOrder.order = sortedWeights.concat(allNull);
                    sampleOrder.sortByKey = key;
                    sampleOrder.valid = true;
                    console.log("sampleOrder", sampleOrder);

                    updateAbundanceView();//TODO: can be done more subtle / only update dots!
                }


            }

            function switchGroupState(key) {

                console.log(allJxnArray, '\n-- allJxnArray --');


                var jxnList = allJxnArray.filter(function (d) {
                    return d.key == key
                });
                if (jxnList.length == 1) {
                    var jxn = jxnList[0];

                    if (jxn.jxn.state !== 'groupX') {
                        jxn.jxn.state = 'groupX';
                    } else {
                        jxn.jxn.state = 'scatter';
                    }
                }


                computeAbundanceLayout();
                updateAbundanceView();

            }


            function updateLegend() {
                var dotAxisDef = d3.svg.axis()
                    .scale(weightScale)
                    .orient("right");

                var dotAxis = abundancePlot.g.selectAll(".axis").data([1]);
                dotAxis.exit().remove();

                // --- adding Element to class dotAxis
                dotAxis.enter().append("g").attr({
                    "class": "axis"
                }).call(dotAxisDef)

                // --- changing nodes for dotAxis
                dotAxis.transition()
                    .attr({
                        "transform": "translate(" + (endOfPanels + 5) + ",0)"
                    })

            }

            updateLegend();


        }


        /*
         ================= LAYOUT METHODS =====================
         */


        function computeFlagPositions() {

            var triangleLength = connectorPlot.triangles.height;
            var sitePadding = triangleLength / 3;

            var positiveStrand = allData.gene.strand === '+';

            // compute desired positions
            triangleData.forEach(function (triangle, i) {
                var axisLoc = axis.genePosToScreenPos(triangle.loc);

                if (isLeftArrow(triangle.type, positiveStrand)) {
                    triangle.xStart = triangle.xStartDesired = axisLoc - triangleLength;
                    triangle.xEnd = triangle.xEndDesired = axisLoc;
                } else { // right arrow:
                    triangle.xStart = triangle.xStartDesired = axisLoc;
                    triangle.xEnd = triangle.xEndDesired = axisLoc + triangleLength;
                }

            })

            var bucketsCopy = triangleData.slice();

            if (!axis.ascending)
                bucketsCopy.reverse();

            // important to initialize this, as we start from i = 1
            bucketsCopy[0].firstGroupBucket = 0;

            for (var i = 1; i < bucketsCopy.length; ++i) {
                bucketsCopy[i].firstGroupBucket = i;
                var ind = i;
                var shift = -1;
                while (shift < 0 && ind > 0 && (bucketsCopy[ind].xStart < bucketsCopy[ind - 1].xEnd + sitePadding)) {
                    var firstInd = bucketsCopy[ind - 1].firstGroupBucket;
                    var overlap = bucketsCopy[ind - 1].xEnd + sitePadding - bucketsCopy[ind].xStart;
                    for (var j = ind; j <= i; ++j) {
                        bucketsCopy[j].xStart += overlap
                        bucketsCopy[j].xEnd += overlap
                        bucketsCopy[j].firstGroupBucket = firstInd
                    }
                    var leftGap = bucketsCopy[firstInd].xStartDesired - bucketsCopy[firstInd].xStart;
                    var rightGap = bucketsCopy[i].xStart - bucketsCopy[i].xStartDesired;
                    shift = (leftGap - rightGap) / 2;
                    shift = Math.min(shift, axis.getWidth() - bucketsCopy[i].xStart)
                    shift = Math.max(shift, -bucketsCopy[firstInd].xStart)
                    for (var j = firstInd; j <= i; ++j) {
                        bucketsCopy[j].xStart += shift
                        bucketsCopy[j].xEnd += shift
                    }
                    ind = firstInd;
                }
            }

            triangleData.forEach(function (b) {
                b.xStart = Math.floor(b.xStart);
                b.xEnd = Math.floor(b.xEnd);
                b.anchor = isLeftArrow(b.type, positiveStrand) ? b.xEnd : b.xStart;
            })
        }

        function computeAbundanceLayout() {

            var gapSize = abundancePlot.panels.panelGapsize;
            var w = axis.getWidth();
            var positiveStrand = allData.gene.strand == '+'
            var allJXNsorted = Object.keys(allJxns).map(function (d) {
                return allJxns[d];
            });


            var elementWidth = Math.floor(Math.max(w / allJXNsorted.length, abundancePlot.panels.std.minWidth));
            abundancePlot.panels.std.currentWidth = elementWidth;


            // start the layout here:
            var groupBy, groupBySecond;
            if (positiveStrand) {
                groupBy = 'start';
                groupBySecond = 'end';
            } else {
                groupBy = 'end';
                groupBySecond = 'start';
            }

            // -- first sort the elements by start or end
            allJXNsorted.sort(function (a, b) {
                    var res = d3.ascending(a[groupBy], b[groupBy]);
                    if (res == 0) res = d3.ascending(a[groupBySecond], b[groupBySecond]);
                    if (res == 0) res = d3.ascending(a.weight, b.weight)
                    return res;
                }
            )


            if (!axis.ascending)
                allJXNsorted.reverse();

            var currentGroupCriterion = -1;
            var lastAddedJxn = null;
            var currentXPos = 0;
            jxnGroups = []; // clean the list
            var currentGroup = [];


            allJXNsorted.forEach(function (jxn) {

                if (currentGroupCriterion == -1 || currentGroupCriterion == jxn[groupBy]) {
                    jxn.x = currentXPos;
                    currentGroup.push(jxn);
                } else {
                    jxnGroups.push({
                        endX: currentXPos,
                        directNeighbor: (lastAddedJxn.directNeighbor && currentGroup.length == 1),
                        jxns: currentGroup
                    });
                    currentXPos += gapSize;
                    jxn.x = currentXPos
                    currentGroup = [jxn];
                }

                if (jxn.state == 'std') {
                    jxn.w = elementWidth;
                } else if (jxn.state == 'scatter') {
                    jxn.w = abundancePlot.panels.scatter.currentWidth;
                } else if (jxn.state == 'mini') {
                    jxn.w = abundancePlot.panels.mini.currentWidth;
                } else if (jxn.state == 'groupX') {
                    jxn.w = abundancePlot.panels.groupX.currentWidth;
                }

                currentXPos += jxn.w;
                currentGroupCriterion = jxn[groupBy];

                lastAddedJxn = jxn;

            });

            // set start parameters// dont forget the last one :)
            jxnGroups.push({
                endX: currentXPos,
                directNeighbor: (lastAddedJxn.directNeighbor && currentGroup.length == 1),
                jxns: currentGroup
            });

            //TODO: find better solution for that
            svg.transition().attr("width", currentXPos + 300);

            endOfPanels = currentXPos

        }

        /*
         ================= HELPERMETHODS =====================
         */

        /**
         * a centralized method to decide if a flag is pointing left based on conditions
         * @param type - the site type (donor or receptor)
         * @param positiveStrand - boolean if on a positive strand
         * @returns {boolean}
         */
        function isLeftArrow(type, positiveStrand) {
            return type == ((positiveStrand == axis.ascending ) ? "donor" : "receptor");
        }

        /*
         ================= GENERAL METHODS =====================
         */

        //var exploreArea = svgMain.append("g").attr("transform", "translate(0, 5)").attr("id","exploreArea");
        //jxnArea = exploreArea.append("g").attr("id", "jxnArea");


        function updateVis() {

            updateHeatmap();

            computeFlagPositions();
            updateFlags();

            computeAbundanceLayout();
            updateAbundanceView();
            //
            updateConnectors();
        }

        function dataUpdate() {

            axis = that.data.genomeAxis;
            width = axis.getWidth();
            svg.attr("width", width + margin.left + margin.right + textLabelPadding)

            var curGene = gui.current.getSelectedGene();
            var curProject = gui.current.getSelectedProject();

            that.data.getGeneData(curProject, curGene).then(function (sampleData) {

                console.time("dataLoading");
                allData = sampleData;

                var positiveStrand = (sampleData.gene.strand === '+');

                allExons = [];
                _.values(sampleData.gene.isoforms).forEach(function (isoform) {
                    var exonNames = isoform.exonNames.split('_');
                    var exonEnds = isoform.exonEnds.split('_');
                    var exonStarts = isoform.exonStarts.split('_');

                    //console.log(isoform,'\n-- isoform --');
                    //console.log(exonNames, exonEnds, exonStarts,'\n-- exon --');
                    
                    if ((exonNames.length == exonEnds.length) && (exonNames.length == exonStarts.length)){

                        exonNames.forEach(function(exon, index){
                            allExons.push({
                                id: exon,
                                end: +exonEnds[index],
                                start: +exonStarts[index],
                                isoformID:isoform.isoformID
                            })
                        })
                    }

                });


                triangleData = [];
                //var triangleDataSet = {}
                var allJxnPos = [];
                var exonCounter = 0;
                weightScale.domain([0, 1]);

                allJxns = {};

                sampleData.measures.jxns.forEach(function (sample) {
                    _.keys(sample.data).forEach(function (jxnKey) {
                        var start_end = jxnKey.split(":").map(function (d) {
                            return +d;
                        }); //returns start and end

                        // take care of the triangle order
                        triangleData.push({
                            "type": positiveStrand ? "donor" : "receptor",
                            "loc": start_end[0],
                            "xStart": 0,
                            "xEnd": 0,
                            "anchor": 0,
                            "xStartDesired": 0,
                            "xEndDesired": 0,
                            "firstGroupBucket": exonCounter,
                            "lastGroupBucket": exonCounter
                        });

                        triangleData.push({
                            "type": positiveStrand ? "receptor" : "donor",
                            "loc": start_end[1],
                            "xStart": 0,
                            "xEnd": 0,
                            "anchor": 0,
                            "xStartDesired": 0,
                            "xEndDesired": 0,
                            "firstGroupBucket": 0
                        });

                        // create 'set' of all JXN positions
                        allJxnPos.push(start_end[0]);
                        allJxnPos.push(start_end[1]);

                        // set max
                        var jxnWeight = sample.data[jxnKey];
                        if (weightScale.domain()[1] < jxnWeight) weightScale.domain([0, jxnWeight]);

                        var currentPos = allJxns[jxnKey];
                        if (currentPos) currentPos.weights.push({weight: jxnWeight, sample:sample.sample});
                        else {
                            allJxns[jxnKey] =
                            {
                                start: start_end[0],
                                end: start_end[1],
                                weights: [{weight: jxnWeight, sample:sample.sample}],
                                state: 'std', // or points, groups
                                directNeighbor: false, // for now -- see later code
                                startTriangle: null, // later
                                endTriangle: null, // later
                                boxPlotData: null,
                                selectedIsoform: false
                            };
                        }

                        exonCounter++;

                    })

                })

                // SORT and REMOVE DUPLICATES
                triangleData.sort(function (a, b) {
                    return a.loc < b.loc ? -1 : a.loc == b.loc ? 0 : 1
                });
                triangleData = _.uniq(triangleData, function(item){return item.loc+item.type})

                console.log(triangleData,'\n-- triangleData --');
                
                // SORT and REMOVE DUPLICATES
                allJxnPos.sort();
                allJxnPos = _.uniq(allJxnPos, true);

                console.log(allJxnPos,'\n-- allJxnPos --');

                var allSamplesCount = Object.keys(allData.samples).length;

                // add some global knowledge to each junction
                _.keys(allJxns).map(function(jxnKey){
                    var jxn = allJxns[jxnKey]

                    jxn.directNeighbor= jxn.end == allJxnPos[allJxnPos.indexOf(jxn.start) + 1]; //  is it the special case ?
                    jxn.startTriangle= triangleData[allJxnPos.indexOf(jxn.start)];
                    jxn.endTriangle= triangleData[allJxnPos.indexOf(jxn.end)];



                    // number of zero values:
                    var zerocount = allSamplesCount - jxn.weights.length;

                    if (zerocount > 0) { // add zerocount times 0 at the end
                        jxn.boxPlotData = helper.computeBoxPlot(
                            _.pluck(jxn.weights, 'weight')
                                .concat(Array.apply(null, Array(zerocount)).map(Number.prototype.valueOf, 0)));

                    } else {
                        jxn.boxPlotData = helper.computeBoxPlot(_.pluck(jxn.weights, 'weight'));
                    }
                })

                //cleanup
                sampleOrder.valid = false;

                console.timeEnd("dataLoading");

                console.time("updatevis");
                updateVis();
                console.timeEnd("updatevis");
            });


        }


        // start the whole thing:
        initView();

        return head.node();
    }


    exports.VialsJunctionVis = VialsJunctionVis;
    exports.create = create;

});


