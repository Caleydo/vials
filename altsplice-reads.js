/**
 * Created by Hendrik Strobelt 10/10/14
 */

/**
 * a simple template for a visualization module
 */
define(['exports', 'd3', 'altsplice-gui'], function (exports, d3, gui) {
    /**
     * a simple template class of a visualization. Up to now there is no additional logic required.
     * @param data
     * @param parent
     * @constructor
     */
    function GenomeVis(data, parent) {
        this.data = data;
        this.parent = parent;
        this.node = this.build(d3.select(parent));
    }

    GenomeVis.prototype.build = function ($parent) {
        var that = this;

        var head = $parent.append("div").attr({
                "class":"gv"
        })

        //var ta = head.append("textarea").style({
        //        "width":"800px",
        //        "height":"300px",
        //        "top":"920px",
        //        "left":"20px",
        //        "position":"relative"
        //})
        //
        //this.data.getBamHeader().then(function (data) {
        //        ta.text(JSON.stringify(data, undefined, 2));
        //});


        var margin = {top: 10, right: 10, bottom: 20, left: 10},
                width = 800 - margin.left - margin.right,
                height = 300 - margin.top - margin.bottom;

        var svg = head.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style({
                        "top":"10px",
                        "left":"20px",
                        "position":"relative"
                })
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        function DataBar(id, axis, options, aggregate) {
            this.id = id;
            this.axis = axis;
            this.options = options;
            this.aggregate = aggregate;

            this.update = function(data) {
                this.data = data || this.data;
                this.splitData = this.axis.splitXData(this.data)
                this.drawLines();
                this.drawBoxes();
            }

            this.drawLines = function() {
                var axis = this.axis;
                var aggregate = this.aggregate;
                var avgFunc = d3.svg.line()
                                .x(function(d) {
                                    return axis.getXPos(d.pos) + 0.5*axis.rangeBand();
                                })
                                .y(function(d) {
                                    var wiggle = aggregate ? d3.mean(d.wiggle) : d.wiggle;
                                    return styles["sampleBarHeight"]*(1-wiggle);
                                })
                                .interpolate('step');

                var avgLines = this.g.selectAll(".avgLine").data(this.splitData);
                avgLines.exit().remove();
                avgLines.enter().append("svg:path").attr({
                                                       fill: "none",
                                                       stroke: "red",
                                                       class: "avgLine",
                                                     })
                avgLines.attr("d", function(d) {return avgFunc(d)});

                if (this.aggregate) {
                    // need to update d3 to use d3.deviation
                    function std(values){
                      var avg = d3.mean(values);
                      var squareDiffs = values.map(function(value){
                        var diff = value - avg;
                        var sqrDiff = diff * diff;
                        return sqrDiff;
                      });
                      var avgSquareDiff = d3.mean(squareDiffs);
                      var stdDev = Math.sqrt(avgSquareDiff);
                      return stdDev;
                    }

                    var stdAreaFunc = d3.svg.area()
                        .x(function(d) {
                            return axis.getXPos(d.pos) + 0.5*axis.rangeBand();
                        })
                        .y0(function(d) {
                            return styles["sampleBarHeight"]*(1-d3.mean(d.wiggle)-std(d.wiggle));
                        })
                        .y1(function(d) {
                            var val = d3.mean(d.wiggle) + std(d.wiggle);
                            return styles["sampleBarHeight"]*(1-d3.mean(d.wiggle)+std(d.wiggle));
                        });
                    var stdAreas = this.g.selectAll(".stdArea").data(this.splitData);
                    stdAreas.exit().remove();
                    stdAreas.enter().append("svg:path").attr({
                                                           fill: "red",
                                                           opacity: 0.3,
                                                           class: "stdArea",
                                                         })
                    stdAreas.attr("d", function(d) {return stdAreaFunc(d)});
                }
            }

            this.drawBoxes = function() {
                var axis        = this.axis,
                    curExons    = this.axis.curExons,
                    g           = this.g,
                    graphWidth  = g.attr("width"),
                    graphHeight = g.attr("height");

                var sampleBox = g.selectAll(".sampleBox").data([""])
                sampleBox.exit().remove();
                sampleBox.enter().append("rect")
                                .attr({
                                    "class": "sampleBox",
                                    "width": graphWidth,
                                    "height": graphHeight,
                                    "stroke": "black",
                                    "fill": "none",
                                });

                g.selectAll(".sampleBox").transition().attr("width", graphWidth);

                var exonBoxes = g.selectAll(".exonBox").data(curExons)
                exonBoxes.exit().remove();
                exonBoxes.enter().append("rect").attr({
                    "class": "exonBox",
                    "height": graphHeight,
                    "stroke": "black",
                    "fill": "none",
                });

                if (this.options.showIntrons) {
                    g.selectAll(".exonBox").attr("opacity", 0);
                    g.selectAll(".sampleBox").attr("opacity", 1);
                }
                else {
                    g.selectAll(".exonBox").attr("opacity", 1);
                    g.selectAll(".sampleBox").attr("opacity", 0);
                }

                g.selectAll(".exonBox").transition().attr({
                    "width": function(exon) {return axis.getXPos(exon[1]) - axis.getXPos(exon[0])},
                    "transform": function(exon) {return "translate("+axis.getXPos(exon[0])+",0)"}
                })
            }
        }

        function Collection(sampleNames, axis, options) {
            this.collapse = false;
            this.aggregate = false;
            this.samples = sampleNames;
            this.sampleBars = sampleNames.map(function(sampleName) {return new DataBar(sampleName, axis, options);});
            this.aggBar = new DataBar("Group", axis, options, true);
            this.axis = axis;
            this.options = options;

            this.set = function(property, value) {
                this[property] = value;
                this.sampleBars.forEach(function(s) {s[property] = value});
                this.aggBar[property] = value;
            }

            this.update = function(data) {
                this.data = data;
                var samples = this.samples;

                this.sampleBars.forEach(function(s) {s.update(data["samples"][s.id]["positions"])})
            }

            this.draw = function() {
                this.drawSamples();

                if (this.samples.length > 1) {
                    this.g.selectAll(".selectorGroup").remove();
                    this.drawLinesGroup()
                }
                else {
                    this.g.selectAll(".linesGroup").remove();
                    this.drawSelector();
                }
            }

            this.drawSamples = function() {
                var aggGroup = this.g.selectAll(".sampleAgg").data([this.aggBar]);
                aggGroup.exit().remove();
                var aggGroupEnter = aggGroup.enter().append("g").attr({
                    "class": "sampleAgg",
                    "height": styles["sampleBarHeight"],
                    "width": this.axis.width,
                    "transform": function(c) {return "translate(0," + styles["collectionMargin"]/2 + ")"},
                });
                aggGroupEnter.append("text").attr({
                    "class": "sampleLabel",
                    "transform": "translate(" + (this.axis.width + 10) + "," + (styles["sampleBarHeight"] + styles["sampleBarMargin"]) / 2 + ")"
                }).text(function(d) {return d.id})

                this.aggBar.g = aggGroup;

                var samplePos = function(i) {
                    i = this.collapse ? 0 : i;
                    return i * (styles["sampleBarHeight"] + styles["sampleBarMargin"]) + styles["collectionMargin"]/2;
                }.bind(this);
                var sampleGroups = this.g.selectAll(".sample").data(this.sampleBars, function(d) {return d.id});
                sampleGroups.exit().remove();
                var sampleGroupsEnter = sampleGroups.enter()
                            .append("g")
                            .attr({
                                "class": "sample",
                                "height": styles["sampleBarHeight"],
                            })

                // var yScale = d3.scale.linear().domain([0, 1]).range([0, styles["sampleBarHeight"]]);
                // var yAxis = d3.svg.axis()
                //               .orient("left")
                //               .scale(yScale)
                //               .tickValues([0, 1]);

                // sampleGroupsEnter.append("g").call(yAxis);

                sampleGroupsEnter.append("text").attr({
                    "class": "sampleLabel",
                    "transform": "translate(" + (this.axis.width + 10) + "," + (styles["sampleBarHeight"] + styles["sampleBarMargin"]) / 2 + ")"
                }).text(function(d) {return d.id})

                sampleGroups.attr({
                    "transform": function(s, i) {return "translate(0," + samplePos(i) + ")"},
                })

                sampleGroups.each(function(s) {s.g = d3.select(this);})

                this.aggBar.g.attr("visibility", "hidden")
                this.aggBar.g.selectAll(".sampleLabel").attr("visibility", "hidden")
                sampleGroups.selectAll(".sampleLabel").attr("visibility", "visible")
                sampleGroups.transition().attr("opacity", 1);
                if (this.data) {
                    var data = this.data;
                    var aggData = data["samples"][this.samples[0]]["positions"].map(function(d, i) {
                        return {
                                "pos": d.pos,
                                "wiggle": samples.map(function(sample) {return data["samples"][sample]["positions"][i].wiggle}),
                            }});
                    this.aggBar.update(aggData);
                }
                if (this.collapse) {
                    sampleGroups.selectAll(".sampleLabel").attr("visibility", "hidden")
                    this.aggBar.g.selectAll(".sampleLabel").attr("visibility", "visible")
                    if (this.aggregate) {
                        sampleGroups.transition().attr("opacity", 0.2);
                        this.aggBar.g.attr("visibility", "visible")
                    }
                }
            }

            this.drawSelector = function() {
                var selectorGroup = this.g.selectAll(".selectorGroup");
                if (selectorGroup.empty()) {
                    selectorGroup = this.g.append("g").attr({
                        "class": "selectorGroup",
                        "transform": "translate(" + (this.axis.width + styles["labelWidth"]) + ",0)"
                    })

                    selectorGroup.append("circle").attr({
                        "class": "selectorHandle",
                        "stroke": "red",
                        "fill": "white",
                        "r": 5,
                        "cx": 0,
                        "cy": styles["sampleBarHeight"]/2
                    })
                }
            }

            this.drawLinesGroup = function() {
                var linesGroup = this.g.selectAll(".linesGroup");
                if (linesGroup.empty()) {
                    linesGroup = this.g.append("g").attr({
                        "class": "linesGroup",
                        "transform": "translate(" + styles["labelWidth"] + ",0)"
                    });

                    linesGroup.append("line")
                                   .attr({
                                       "class": "v",
                                       "x1": this.axis.width + 20,
                                       "x2": this.axis.width + 20,
                                       "y1": 0,
                                       "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "stroke": "black",
                                    });

                    linesGroup.append("line")
                                    .attr({
                                       "class": "top",
                                       "x1": this.axis.width + 10,
                                       "x2": this.axis.width + 20,
                                       "y1": 0,
                                       "y2": 0,
                                       "stroke": "black",
                                    });

                    linesGroup.append("line")
                                    .attr({
                                       "class": "bottom",
                                       "x1": this.axis.width + 10,
                                       "x2": this.axis.width + 20,
                                       "y1": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "stroke": "black",
                                    });

                    var buttonGroup = linesGroup.append("g")
                                                .attr({
                                                    "class": "buttonGroup",
                                                });

                    var collapseButton = buttonGroup.append("rect")
                                             .attr({
                                                 "class": "collapseButton",
                                                 "stroke": "black",
                                                 "width": 10,
                                                 "height": 10,
                                                 "x": 0,
                                             })
                                             .on("click", this.toggleExpand);

                    var aggregateButton = buttonGroup.append("rect")
                                                .attr({
                                                    "class": "aggregateButton",
                                                    "fill": this.aggregate ? "black" : "white",
                                                    "stroke": "black",
                                                    "width": 10,
                                                    "height": 10,
                                                    "x": 20,
                                                }).on("click", this.toggleAgg)
                }
                linesGroup.selectAll(".buttonGroup").transition().attr({
                    "transform": "translate(" + (this.axis.width + 15) + "," + (-5 + 1/2 * ((this.collapse? 1 : this.samples.length)*(styles["sampleBarHeight"]+styles["sampleBarMargin"])+styles["collectionMargin"]/4)) + ")",
                });
                linesGroup.selectAll(".collapseButton").transition().attr({
                    "fill": this.collapse ? "black" : "white"
                });
                linesGroup.selectAll(".aggregateButton").transition().attr({
                    "visibility": this.collapse ? "visible" : "hidden",
                    "fill": this.aggregate ? "black" : "white"
                });
                linesGroup.selectAll(".v").transition().attr({
                   "y2": (this.collapse ? 1 : this.samples.length)*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                });
                linesGroup.selectAll(".bottom").transition().attr({
                   "y1": (this.collapse ? 1 : this.samples.length)*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                   "y2": (this.collapse ? 1 : this.samples.length)*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                });
            }

            this.toggleExpand = function() {
                this.collapse = !this.collapse;
                this.aggregate = this.collapse ? this.agg : false;
                this.sampleView.draw();
            }.bind(this);

            this.toggleAgg = function() {
                this.aggregate = !this.aggregate;
                this.drawSamples();
            }.bind(this);
        }

        function SampleView(g, data) {
            this.curGene = undefined;
            this.g = g;
            this.data = data;
            this.axis = this.data.genomeAxis;
            this.options = {"showIntrons": false};
            var that = this;

            this.set = function(property, value) {
                this.collections.forEach(function(c) {c.set(property, value)});
            }

            this.update = function() {
                var geneName     = gui.current.getSelectedGene(),
                    pos         = gui.current.getStartPos(),
                    baseWidth   = gui.current.getBaseWidth();

                if (geneName !== this.curGene){
                    pos = null
                    baseWidth = null
                }
                that.data.getSamples(geneName,pos,baseWidth)
                    .then(function (data) {
                        globalData = data;
                        var geneInfo = data["geneInfo"];
                        that.axis.update(geneInfo,
                                         pos || geneInfo["geneSpan"][0],
                                         baseWidth || (geneInfo["geneSpan"][1] - geneInfo["geneSpan"][0] + 1));
                        that.draw(data);
                    })
            }

            this.joinCollections = function() {
                var numSelected = this.collections.reduce(function(memo, num) {return memo + (num.selected ? 1 : 0)}, 0)
                if (numSelected > 1) {
                    var joinedSamples = [];
                    this.collections.forEach(function(c, i) {
                        if (c.selected) {
                            joinedSamples = joinedSamples.concat(c.samples);
                            c.g.remove();
                        }
                    })
                    this.collections = this.collections.filter(function(c, i) {return !c.selected})
                    this.collections.push(new Collection(joinedSamples, this.axis, this.options));
                    this.draw();
                }
            };

            this.draw = function(data) {
                var
                    data      = data || this.readData,
                    samples   = d3.keys(data["samples"]);

                this.readData = data;

                var sampleBarGraphHeight = samples.length * (styles["sampleBarHeight"] + styles["sampleBarMargin"]);

                var sampleObjs;

                this.collections = this.collections || samples.map(function (sample) {return new Collection([sample], this.axis, this.options)}.bind(this));
                // this.collections = this.collections || samples.map(function (sample) {return new Collection(sample, this.axis, this.options)}.bind(this));

                var axisGroup = this.g.selectAll(".genomeAxis");
                if (axisGroup.empty()) {
                    axisGroup = this.g.append("g").attr({
                        "class": "genomeAxis",
                    });
                }
                axisGroup.transition().attr({
                    "transform": "translate(0," + (this.collections.reduce(function(memo, c) {return memo + (c.collapse ? 1 : c.samples.length)}, 0) * (styles["sampleBarHeight"] + styles["sampleBarMargin"]) + this.collections.length * styles["collectionMargin"]) + ")",
                });
                this.axisGroup = axisGroup;
                this.axis.draw(axisGroup);

                var collectionGroups = this.g.selectAll(".collection").data(this.collections);
                collectionGroups.exit().remove();
                collectionGroups.enter().append("g").attr("class", "collection");

                var samplesBefore = 0;
                this.g.selectAll(".collection").transition().attr({
                    "transform": function(c, i) {var height = samplesBefore*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + i*styles["collectionMargin"];
                                                 samplesBefore += c.collapse ? 1 : c.samples.length;
                                                 return "translate(0," + height + ")"},
                });

                collectionGroups.each(function(c) {
                    c.g = d3.select(this);
                    console.log(c)
                    c.draw();
                    c.update(data)
                });

                var sampleView = this;
                var originY;
                var selectDrag = d3.behavior.drag()
                    .origin(function(d, i) {
                        var cyRel = parseInt(d3.select(this).attr("cy"));
                        originY = i*(styles["sampleBarHeight"]+styles["collectionMargin"] + styles["sampleBarMargin"])+cyRel;
                        return {"x": 0, "y": originY}
                    })
                    .on("dragstart", function(d, i) {
                        d3.select(this).attr("fill", "red");
                        var cyRel = parseInt(d3.select(this).attr("cy"));
                        sampleView.g.append("line").attr({
                            "class": "dragLine",
                            "stroke": "red",
                            "stroke-width": 2,
                            "x1": sampleView.axis.width + styles["labelWidth"],
                            "x2": sampleView.axis.width + styles["labelWidth"],
                            "y1": i*(styles["sampleBarHeight"]+styles["collectionMargin"] + styles["sampleBarMargin"])+cyRel,
                            "y2": i*(styles["sampleBarHeight"]+styles["collectionMargin"] + styles["sampleBarMargin"])+cyRel
                        });
                    })
                    .on("drag", function(dragSample) {
                        var dragY = d3.event.y;
                        var cyRel = parseInt(d3.select(this).attr("cy"));
                        sampleView.g.selectAll(".dragLine").attr({
                            "y2": dragY
                        })
                        sampleView.g.selectAll(".selectorHandle").each(function(collection, i) {
                            var cyRel = parseInt(d3.select(this).attr("cy"));
                            var r = parseInt(d3.select(this).attr("r"));
                            var vertCenter = i*(styles["sampleBarHeight"]+styles["collectionMargin"] + styles["sampleBarMargin"])+cyRel;
                            if (dragY > originY) {
                                // moving down
                                if (dragY >= vertCenter - r && originY <= vertCenter) {
                                    // pass top of circle
                                    d3.select(this).attr("fill", "red");
                                    collection.selected = true;
                                }
                                else {
                                    // pass bottom of circle
                                    d3.select(this).attr("fill", "white");
                                    collection.selected = false;
                                }
                            }
                            else if (dragY < originY) {
                                // moving up
                                if (dragY <= vertCenter + r && originY >= vertCenter) {
                                    // pass top of circle
                                    d3.select(this).attr("fill", "red");
                                    collection.selected = true;
                                }
                                else {
                                    // pass bottom of circle
                                    d3.select(this).attr("fill", "white");
                                    collection.selected = false;
                                }
                            }
                        })
                    })
                    .on("dragend", function(sample){
                        d3.selectAll(".selectorHandle").attr("fill", "white");
                        sampleView.g.selectAll(".dragLine").remove();
                        sampleView.joinCollections();
                    });

                this.g.selectAll(".selectorHandle").call(selectDrag);

                this.set("sampleView", this);
            }
        }

        styles = {"sampleBarHeight": 40, "sampleBarMargin": 5, "collectionMargin": 10, "labelWidth": 100};
        var sampleGroup = svg.append("g").attr({
            "transform": "translate(20,0)",
            "class": "sampleViewGroup"
        });
        var toggleIntronButton = svg.append("text").attr({
                type:"button",
                class:"btn"
        }).text("toggle introns")


        toggleIntronButton.on({

            "click": function(d) {
                sampleView.axis.options.showIntrons = !sampleView.axis.options.showIntrons;
                sampleView.update();
            }
        })

        var sampleView = new SampleView(sampleGroup, that.data);
        gui.current.addUpdateEvent(sampleView.update);

        //do the magic
        return head.node();
    };
    exports.GenomeVis = GenomeVis;

    /**
     * factory method of this module
     * @param data the data to show
     * @param parent the parent dom element to append
     * @returns {GenomeVis} the visualization
     */
    function create(data, parent) {
        return new GenomeVis(data, parent);
    }

    exports.create = create;
});
