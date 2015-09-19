/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 9/17/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */


define(['exports', 'd3', 'lodash', './vials-gui', '../caleydo_core/event', 'vials-helper'], function (exports, d3, _, gui, event, helper) {
    /**
     * a simple template class of a visualization. Up to now there is no additional logic required.
     * @param data
     * @param parent
     * @constructor
     */
    function VialsGenomeAxis(data, parent) {
        this.data = data;
        this.parent = parent;
        this.node = this.build(d3.select(parent));
    }

    /**
     * factory method of this module
     * @param data the data to show
     * @param parent the parent dom element to append
     * @returns {VialsGenomeAxis} the visualization
     */
    function create(data, parent) {
        return new VialsGenomeAxis(data, parent);
    }

    // GLOBAL VARIABLES & STATUS
    var margin = {top: 5, right: 150, bottom: 20, left: 150};
    var fullHeight = 30;
    var height = fullHeight - margin.top - margin.bottom;

    var guiPanel = {
        buttonHeight: 20,
        buttonPadding: 5,
        y: 5,
        //buttons: [
        //    {
        //        w: 150,
        //        label: 'group selected',
        //        event: 'buttonGroupSelected'
        //    },
        //    {
        //        w: 150,
        //        label: 'ungroup selected',
        //        event: 'buttonUnGroupSelected'
        //
        //    },
        //    {
        //        w: 150,
        //        label: 'unselect all',
        //        event: 'buttonUnselectAll'
        //
        //    },
        //    {
        //        w: 150,
        //        label: 'group by attribute',
        //        event: 'buttonGroupByAttribute'
        //    }
        //]


    }

    var axisPlot = {
        //height: 200,
        //prefix: "readsPlot",
        //y: guiPanel.buttonHeight + guiPanel.y + 5,
        //labelWidth: 300,
        //panels: {
        //    std: {
        //        height: 20,
        //        xDiff: 25
        //    }
        //}
    }


    /**
     * build the vis and return node
     * @param $parent - the d3 selection of parent node
     * @returns {Node} the node
     */
    VialsGenomeAxis.prototype.build = function ($parent) {

        /*
         ================= INIT =====================
         */


        //-- initial parametrization:
        var that = this;
        var axis = that.data.genomeAxis;
        var width = axis.getWidth();




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
        helper.drawSideLabel(svg, height, margin, 'center', 'x');


        //--  create a group offset by the label
        var svgMain = svg.append("g").attr({
            "class": "readsMain",
            "transform": "translate(" + textLabelPadding + ",0)"
        });

        var crosshairGroup = svgMain.append("g").attr({
            "transform": "translate(" + 0 + "," + 0 + ")",
            "class": "crosshair_group"
        });

        function reset() {
            //TODO: add avrs here

        }

        reset();

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

            //var offsetX = 0;
            //guiPanel.buttons.forEach(function (d) {
            //    d.x = offsetX;
            //    offsetX += d.w + guiPanel.buttonPadding;
            //    d.h = guiPanel.buttonHeight;
            //    d.y = 0;
            //
            //    drawButton(guiPanel.g, d)
            //
            //})


            initEventHandlers();
        }


        function initEventHandlers() {

            // -- global Events
            event.on("newDataLoaded", dataUpdate);
            event.on("crosshair", updateCrosshair);
            event.on("updateVis", updateVis);
            event.on("axisChange", updateVis);

            // *****************
            // ******** Internal Data Events: highlights & selections
            // *****************


            // *****************
            // ******** External Data Events: highlights & selections
            // *****************


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


            function drawAxis(){
                var ticks = svgMain.selectAll(".ticks").data(d3.range(0,100));
                ticks.exit().remove();

                // --- adding Element to class ticks
                var ticksEnter = ticks.enter().append("circle").attr({
                    "class":"ticks"
                })

                // --- changing nodes for ticks
                ticks.attr({
                    cx:function(d){return d*10;},
                    cy:height/2,
                    r:3
                })

            }
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

            //var drawButton = function (d3sel, options) {
            //    //x, y, w, h, label, event
            //    var buttonG = d3sel.append("g").attr('class', 'guiButton')
            //    buttonG.attr({
            //        "transform": "translate(" + options.x + "," + options.y + ")"
            //    });
            //
            //
            //    buttonG.append('rect').attr({
            //        class: 'guiButtonBG',
            //        width: options.w,
            //        height: options.h,
            //        rx: 3,
            //        ry: 3
            //    }).on({
            //        'click': function () {
            //            event.fire(options.event)
            //        }
            //    });
            //
            //    var buttonLabel = buttonG.append('text').text(options.label)
            //    var bb = buttonLabel.node().getBBox();
            //
            //
            //    buttonLabel.attr({
            //        class: 'guiButtonLabel',
            //        x: (options.w - bb.width) / 2,
            //        y: options.h - (options.h - bb.height) / 2 - 3
            //    })
            //
            //
            //}

            /*
             ================= GENERAL METHODS =====================
             */

            //var exploreArea = svgMain.append("g").attr("transform", "translate(0, 5)").attr("id","exploreArea");
            //jxnArea = exploreArea.append("g").attr("id", "jxnArea");


            function updateVis() {
                //TODO
                updateAxis();


            }

            function cleanVis() {
                //console.log(readsPlot.g,readsPlot.g.selectAll(""),'\n-- readsPlot.g,readsPlot.g.selectAll("") --');
                readsPlot.g.selectAll("*").remove();
            }

            function dataUpdate() {
                var curGene = gui.current.getSelectedGene();
                var curProject = gui.current.getSelectedProject();

                that.data.getGeneData(curProject, curGene).then(function (sampleData) {
                    reset();
                    axis = that.data.genomeAxis;
                    width = axis.getWidth();
                    svg.attr("width", width + margin.left + margin.right + textLabelPadding);
                });


            }


            // start the whole thing:
            initView();

            return head.node();
        }


        exports.VialsReadVis = VialsGenomeAxis;
        exports.create = create;

    }
    )
    ;


