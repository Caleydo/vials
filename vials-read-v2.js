/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 9/17/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */


define(['exports', 'd3', 'underscore', './vials-gui', '../caleydo_core/event', 'vials-helper'], function (exports, d3, _, gui, event, helper) {
    /**
     * a simple template class of a visualization. Up to now there is no additional logic required.
     * @param data
     * @param parent
     * @constructor
     */
    function VialsReadVis(data, parent) {
        this.data = data;
        this.parent = parent;
        this.node = this.build(d3.select(parent));
    }

    /**
     * factory method of this module
     * @param data the data to show
     * @param parent the parent dom element to append
     * @returns {VialsReadVis} the visualization
     */
    function create(data, parent) {
        return new VialsReadVis(data, parent);
    }

    // GLOBAL VARIABLES & STATUS
    var margin = {top: 40, right: 150, bottom: 20, left: 150};
    var fullHeight = 370;
    var height = fullHeight - margin.top - margin.bottom;

    var readsPlot = {
        height: 200,
        prefix: "reads_plot",
        y: 0,
        labelWidth:300,
        panels: {
            prefix: "reads_plot_panel",
            std: {
                height: 35,
                xDiff: 40
            },

        }
    }


    /**
     * build the vis and return node
     * @param $parent - the d3 selection of parent node
     * @returns {Node} the node
     */
    VialsReadVis.prototype.build = function ($parent) {

        /*
         ================= INIT =====================
         */


        //-- initial parametrization:
        var that = this;
        var axis = that.data.genomeAxis;
        var width = axis.getWidth();

        // data var:
        var allData = {}; // api data
        var dataExtent = [0, 1] // data extent
        var textLabelPadding = 0

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
        textLabelPadding = 40;
        helper.drawSideLabel(svg, height, margin, 'right', 'reads');


        //--  create a group offset by the label
        var svgMain = svg.append("g").attr({
            "class": "readsMain",
            "transform": "translate(" + textLabelPadding + ",0)"
        });

        readsPlot.g = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + readsPlot.y + ")",
            "class": readsPlot.prefix + "_group"
        });

        var crosshairGroup = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + 0 + ")",
            "class": "crosshair_group"
        });


        function initView() {

            // create crosshair
            crosshairGroup.append("line").attr({
                "class": "crosshair",
                "x1": 0,
                "y1": 0,
                "x2": 0,
                "y2": fullHeight
            }).style({
                "stroke-width": "1",
                "stroke": "black",
                "pointer-events": "none"
            });

            crosshairGroup.append("text").attr("class", "crosshairPos")

            var currentX = 0;
            svg.on("mousemove", function () {
                currentX = d3.mouse(this)[0] - 40;
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


            // *****************
            // ******** External Data Events: highlights & selections
            // *****************

            // -- highlight a Junction
            event.on("highlightJxn", function (e, key, highlight) {

                //TODO: maybe del

            })

            // -- hover over a flag
            event.on("highlightFlag", function (e, loc, highlight) {
                //TODO: mayb del
            })

            event.on("sampleHighlight", function (e, sample, highlight) {
                //TODO
            });

            event.on("groupHighlight", function (e, groupID, highlight) {
                //TODO
            })

            event.on('sampleSelect', function (e, sample, isSelected) {
                //TODO
                //var alldots = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix).selectAll(".dots");
                //if (isSelected) {
                //    alldots.filter(function (d) {
                //        return d.w.sample == sample;
                //    }).style({
                //        fill: gui.current.getColorForSelection(sample)
                //    })
                //} else {
                //    alldots.filter(function (d) {
                //        return d.w.sample == sample;
                //    }).style({
                //        fill: null
                //    })
                //}
            })

            event.on("groupSelect", function (e, groupID, isSelected) {
                //TODO
                //var alldots = abundancePlot.g.selectAll("." + abundancePlot.panels.prefix).selectAll(".dots");
                //if (isSelected) {
                //    alldots.filter(function (d) {
                //        return groupID.samples.indexOf(d.w.sample) > -1
                //    }).style({
                //        fill: gui.current.getColorForSelection(JSON.stringify(groupID))
                //    })
                //} else {
                //    alldots.filter(function (d) {
                //        return groupID.samples.indexOf(d.w.sample) > -1
                //    }).style({
                //        fill: null
                //    })
                //}
            })

            event.on("isoFormSelect", function (e, isoInfo) {
                //TODO maybe del
            })


            event.on("groupingChanged", function (e, a, b, c) {
                //TODO

                //if (a.length == 1) {
                //    groupings.push(a[0]);
                //    //a[0].samples
                //
                //    var samples = a[0].samples;
                //
                //
                //    var allBoxPlots = {};
                //    _.keys(allJxns).forEach(function (jkey) {
                //        var jxn = allJxns[jkey];
                //
                //
                //        var allWeights = _.pluck(jxn.weights.filter(function (d) {
                //            return _.contains(samples, d.sample);
                //        }), 'weight');
                //        if (allWeights.length > 2) allBoxPlots[jkey] = {boxplot: helper.computeBoxPlot(allWeights)};
                //    })
                //
                //    groupingsMeta.push(allBoxPlots);
                //
                //    //console.log(allData,'\n-- allData --');
                //    //console.log(allJxns,'\n-- allJxns --');
                //
                //
                //    computeAbundanceLayout();
                //    updateAbundanceView();
                //
                //} else if (b.length == 1) {
                //    var index = groupings.indexOf(b[0]);
                //    if (index > -1) {
                //        groupings.splice(index, 1);
                //        groupingsMeta.splice(index, 1);
                //    }
                //
                //    computeAbundanceLayout();
                //    updateAbundanceView();
                //
                //}
                //
                //console.log(groupingsMeta, '\n-- groupingsMeta --');


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
                        "y": 0,//fullHeight - heatmapPlot.y - bb.height / 2,
                        "visibility": visible
                    });
                })
        }


        function updateWiggles() {
            allWiggles = allData.measures.wiggles
            axis.setArrayWidth(allData.measures['wiggle_sample_size'] - 1)

            console.log(dataExtent, '\n-- dataExtent --');
            var areaScale = d3.scale.linear().domain([0, dataExtent[1]]).range([readsPlot.panels.std.height, 0])

            var area = d3.svg.area()
                .x(function (d, i) {
                    return axis.arrayPosToScreenPos(i)
                })
                .y0(readsPlot.panels.std.height)
                .y1(function (d) {
                    //console.log(areaScale(d))
                    return areaScale(d);
                })


            var sampleGroup = readsPlot.g.selectAll(".sampleGroup").data(allWiggles);
            sampleGroup.exit().remove();

            // --- adding Element to class sampleGroup
            var sampleGroupEnter = sampleGroup.enter().append("g").attr({
                "class": "sampleGroup"
            })

            // draw BG rect
            sampleGroupEnter.append("rect").attr({
                "class": "sampleGroupBG",
                x: 0,
                y: 0,
                height: readsPlot.panels.std.height,
                width: axis.getWidth()
            }).on({
                "mouseenter": function (d) {
                    event.fire("sampleHighlight", d.sample, true)

                    d3.select(this.parentNode).classed("highlighted", true)
                },
                "mouseout": function (d) {
                    event.fire("sampleHighlight", d.sample, false);
                    d3.select(this.parentNode).classed("highlighted", false)
                },
                "click":function(d){
                    var isSelected = d3.select(this.parentNode).classed("selected");
                    d3.select(this.parentNode).classed("selected", !isSelected);
                    event.fire('sampleSelect', d.sample,!isSelected);

                }
            })

            sampleGroupEnter.append("rect").attr({
                "class": "sampleGroupLabelBG",
                x: axis.getWidth()+5,
                y: 0,
                height: readsPlot.panels.std.height,
                width: readsPlot.labelWidth
            }).on({
                "mouseenter": function (d) {
                    event.fire("sampleHighlight", d.sample, true)

                    d3.select(this.parentNode).classed("highlighted", true)
                },
                "mouseout": function (d) {
                    event.fire("sampleHighlight", d.sample, false);
                    d3.select(this.parentNode).classed("highlighted", false)
                },
                "click":function(d){
                    var isSelected = d3.select(this.parentNode).classed("selected");
                    d3.select(this.parentNode).classed("selected", !isSelected);
                    
                    event.fire('sampleSelect', d.sample,!isSelected);

                }
            })


            // --- changing nodes for sampleGroup
            sampleGroup.attr({
                "transform": function (d, i) {
                    return "translate(" + 0 + "," + i * readsPlot.panels.std.xDiff + ")";
                }
            })

            sampleGroup.select(".sampleGroupBG").attr({
                width: axis.getWidth()
            })


            var sampleGraph = sampleGroup.selectAll(".sampleGraph").data(function (data) {
                return [data.data]

            });
            sampleGraph.exit().remove();

            // --- adding Element to class sampleGraph
            var sampleLineEnter = sampleGraph.enter().append("path").attr({
                "class": "sampleGraph",
                'd': area
            })

            // --- changing nodes for sampleGraph
            sampleGraph.attr({
                'd': area
            })


        }


        /*
         ================= LAYOUT METHODS =====================
         */


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
            //TODO
            svg.attr("height", allData.measures.wiggles.length * readsPlot.panels.std.xDiff)


            updateWiggles();


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


                var extents = []
                sampleData.measures.wiggles.forEach(function (wig) {
                    extentX = d3.extent(wig.data);
                    extents.push(extentX[0]);
                    extents.push(extentX[1]);
                })
                dataExtent = d3.extent(extents)


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


    exports.VialsReadVis = VialsReadVis;
    exports.create = create;

});


