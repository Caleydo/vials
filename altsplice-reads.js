/**
 * Created by Hendrik Strobelt 10/10/14
 */

/**
 * a simple template for a visualization module
 */
define(['exports', 'd3'], function (exports, d3) {
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
        var serverOffset = this.data.serveradress;
        var that = this;


        var head = $parent.append("div").attr({
                "class":"gv"
        })

        var ta = head.append("textarea").style({
                "width":"800px",
                "height":"300px",
                "top":"920px",
                "left":"20px",
                "position":"relative"
        })

        var $inputOuterDiv = head.append("div").style({
                "top":"1340px",
                "left":"20px",
                "width":"600px",
                "position":"relative"
        })

        var $queryDiv = $inputOuterDiv.append("div").text("chromosome ID:");

        var $geneDiv = $inputOuterDiv.append("div");

        var geneSelector = $inputOuterDiv.append("select");

        var chromID = $queryDiv.append("input").attr({
                    type: "text",
                    value: "chr17"
        })

        var $queryDiv = $inputOuterDiv.append("div").text("startpos:");

        var startPos = $queryDiv.append("input").attr({
                    type:"text",
                    value:""
        })

        function getCurRNAs(pos, baseWidth) {
            var curRNAs = [];
            var curExons = [];
            for (var j in gene.exons) {
                var exon = gene.exons[j];
                // will return empty list if exon not present in view
                var exonMin = Math.max(exon[0], pos);
                var exonMax = Math.min(exon[1], pos+baseWidth);
                if (exonMax > exonMin) {
                    curExons.push([exonMin, exonMax]);
                }
            }
            for (var j in gene.mRNAs) {
                var curRNA = [];
                var RNA = gene.mRNAs[j];
                for (var k in RNA) {
                    exonID = RNA[k]
                    if (curExons[exonID]) {
                        curRNA.push(curExons[exonID]);
                    }
                }
                curRNAs.push({'exons': curRNA, 'RNASpan': [Math.max(gene.tx_start, pos), Math.min(gene.tx_end, pos+baseWidth-1)]});
            }
            return curRNAs;
        }

        function getCurExons(curRNAs) {
            return curRNAs.map(function(RNA) {return RNA.exons})
                                        .reduce(function(a, b) {
                                                            if (a.length > b.length) {return a;}
                                                            else {return b;}
                                        })
        }

        function getAxisRanges(curExons, startPosVal, baseWidth, showIntrons) {
            curExons = curExons.sort(function(a, b) {return a[0] > b[0] ? 1 : -1});
            if (showIntrons) {
                var ranges = [];
                var prevExon;
                curExons.forEach(function(exon, i) {
                    if (prevExon) {
                        ranges.push([prevExon[1], exon[0]])
                    }
                    else if (!prevExon && exon[0] > startPosVal) {
                        ranges.push([startPosVal, exon[0]])
                    }
                    ranges.push(exon);
                    prevExon = exon;
                })
                if (prevExon[1] < startPosVal+baseWidth) {
                    ranges.push([prevExon[1], startPosVal+baseWidth])
                }
                return ranges;
            }
            return curExons;
        }

        var requestButton = $queryDiv.append("button").attr({
                    type:"button",
                    class:"btn"
            }).text("request")


        var backwardButton =  $queryDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("-375")

        var forwardButton =  $queryDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("+375")

        var $baseWidthDiv = $inputOuterDiv.append("div").text("zoom:");

        var baseWidthInput = $baseWidthDiv.append("input").attr({
                    type:"text",
                    value:""
        }).attr("style", "display: none");

        var zoomInButton = $baseWidthDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("+")

        var zoomOutButton = $baseWidthDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("-")

        this.data.getBamHeader().then(function (data) {
                ta.text(JSON.stringify(data, undefined, 2));
        });

        var $toggleDiv = $inputOuterDiv.append("div").text("toggle:");

        var toggleIntronButton = $toggleDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("introns")

        var toggleHorizonsButton = $toggleDiv.append("button").attr({
                type:"button",
                class:"btn"
        }).text("horizons")

        var margin = {top: 40, right: 10, bottom: 20, left: 10},
                width = 800 - margin.left - margin.right,
                height = 2000 - margin.top - margin.bottom;

        var svg = head.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .style({
                        "top":"500px",
                        "left":"20px",
                        "position":"absolute"
                })
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        function BrokenAxis(options) {
                this.scaleList = [];
                this.width = width - styles["horizAxisPadding"] * 4;
                this.options = options;

                this.splitXData = function(data) {
                    var ranges    = this.ranges,
                        splitData = ranges.map(function() {return []});
                    data.forEach(function(d) {
                        ranges.forEach(function(range, rangeIdx) {
                            if (range[0] <= d.pos && d.pos <= range[1]) {
                                splitData[rangeIdx].push(d);
                            }
                        })
                    })
                    return splitData;
                }

                this.update = function(geneInfo, pos, baseWidth) {
                    this.curExons = geneInfo["curExons"];

                    this.ranges = getAxisRanges(geneInfo.curExons, pos, baseWidth, this.options.showIntrons);

                    var ranges = this.ranges,
                        axisPos = 0,
                        axisPadding = this.options.showIntrons ? 0 : 60,
                        totalAxisWidth = ranges.reduce(function(a, b) {return a + b[1] - b[0] + 1}, 0),
                        scaleList = [],
                        graphWidth = this.width,
                        pixelWidth = graphWidth - axisPadding*(ranges.length - 1);

                    this.ranges.forEach(function(range, i) {
                        var axisWidth = (range[1] - range[0] + 1)/totalAxisWidth * pixelWidth;
                        var xScale = d3.scale.ordinal().domain(d3.range(range[0]-1, range[1]+1)).rangeBands([axisPos,axisPos+axisWidth-1]);
                        scaleList.push(xScale);
                        axisPos = axisPos + axisWidth + axisPadding;
                    });

                    this.scaleList = scaleList;

                    if (this.g) {
                        this.draw(this.g);
                    }
                }

                this.draw = function() {
                    // shouldn't have to remove each time, need to clean up
                    this.g.selectAll(".x.axis").remove();

                    this.scaleList.forEach(function(scale, i) {
                        var rangeExtent = scale.rangeExtent(),
                            scaleDomain = scale.domain(),
                            domainExtent = [scaleDomain[0], scaleDomain[scaleDomain.length - 1]],
                            xScaleCont = d3.scale.linear().domain(domainExtent).range(rangeExtent);

                        var xAxis = d3.svg.axis()
                                    .orient("bottom")
                                    .scale(xScaleCont)
                                    .outerTickSize(0)

                        this.options.showIntrons ? xAxis.ticks((rangeExtent[1]-rangeExtent[0])/width*5)
                                                 : xAxis.tickValues(domainExtent);

                        this.g.append("g").attr({
                                            "class": "x axis",
                                            "transform": "translate(0," + this.g.attr("height") +")"
                                          })
                                     .call(xAxis);
                    }.bind(this));
                }

                this.rangeBand = function() {
                    // should change to just calculate this in this.update
                    return this.scaleList.length ? this.scaleList[0].rangeBand() : 0;
                }

                this.getXPos = function(pos) {
                    var xPos;
                    this.scaleList.forEach(function(axis, i) {
                        if (axis(pos)) {
                            xPos = axis(pos);
                        }
                    })
                    return xPos;
                }
        }

        function DataBar(id, axis, options) {
            this.id = id;
            this.axis = axis;
            this.options = options;


            this.update = function(data) {
                this.data = data;
                this.splitData = this.axis.splitXData(this.data)
                this.options.showHorizons ? this.drawHorizons() : this.drawLines();
                this.drawBoxes();
            }

            this.drawLines = function() {
                var axis = this.axis;
                this.g.selectAll(".dataHorizon").remove();
                var avgFunc = d3.svg.line().x(function(d) {return axis.getXPos(d.pos) + 0.5*axis.rangeBand();})
                                            .y(function(d) {return styles["sampleBarHeight"]*(1-(d3.mean(d.wiggle)|| d.wiggle));})
                                            .interpolate('step');

                var avgLines = this.g.selectAll(".avgLine").data(this.splitData);
                avgLines.exit().remove();
                avgLines.enter().append("svg:path").attr({
                                                       d: function(d) {return avgFunc(d)},
                                                       fill: "none",
                                                       stroke: "red",
                                                       class: "avgLine",
                                                     })
                avgLines.attr("d", function(d) {return avgFunc(d)});
            }

            this.drawHorizons = function() {
                var g    = this.g,
                    axis = this.axis;

                g.selectAll(".avgLine").remove();

                var horizonChart = function(rangeWidth) {
                    return d3.horizon()
                             .width(rangeWidth)
                             .height(g.attr("height"))
                             .bands(2)
                             .mode("mirror")
                             .interpolate("basis");
                }

                var dataHorizons = g.selectAll(".dataHorizon")
                                       .data(this.splitData.map(function(reads) {
                                                                   return reads.map(function(d) {
                                                                       return [d.pos, d3.mean(d.wiggle) || d.wiggle]
                                                                   })
                                                               }))

                dataHorizons.exit().remove();
                dataHorizons.enter().append("g").attr({
                    "class": "dataHorizon",
                    "transform": function(d, i) {return "translate(" + axis.getXPos(axis.ranges[i][0]) + ",0)"}
                })

                dataHorizons.each(function(splitReads, i) {
                    d3.select(this).call(horizonChart(axis.getXPos(axis.ranges[i][1]) - axis.getXPos(axis.ranges[i][0]) + 1));
                });

                dataHorizons.transition().attr({
                    "transform": function(d, i) {return "translate(" + axis.getXPos(axis.ranges[i][0]) + ",0)"}
                });
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
            this.aggBar = new DataBar("agg", axis, options);
            this.axis = axis;
            this.options = options;

            this.getSampleGroups = function() {
                return d3.selectAll(this.collections.map(function (s) {return s.g}));
            }

            this.update = function(data) {
                var samples = this.samples;

                this.sampleBars.forEach(function(s) {s.update(data["samples"][s.id]["positions"])})

                if (samples.length > 1) {
                    var aggData = data["samples"][samples[0]]["positions"].map(function(d, i) {
                        return {
                                "pos": d.pos,
                                "wiggle": samples.map(function(sample) {return data["samples"][sample]["positions"][i].wiggle}),
                            };
                    })
                    this.aggBar.update(aggData);
                }
            }

            this.draw = function() {
                this.drawSamples();

                if (this.samples.length > 1) {
                    this.drawLinesGroup()
                }
                else {
                    this.g.selectAll(".linesGroup").remove();
                }
            }

            this.drawSamples = function() {
                var aggGroup = this.g.selectAll(".sampleAgg");
                if (aggGroup.empty()) {
                    aggGroup = this.g.append("g").attr({
                        "class": "sampleAgg",
                        "height": styles["sampleBarHeight"],
                        "width": this.axis.width,
                        "transform": function(c, i) {return "translate(" + styles["horizAxisPadding"] + "," + (i*(styles["sampleBarHeight"]+styles["sampleBarMargin"])+styles["collectionMargin"]/2) + ")"},
                    });
                }
                this.aggBar.g = aggGroup;

                var sampleGroups = this.g.selectAll(".sample").data(this.sampleBars, function(d) {return d.id});
                sampleGroups.exit().remove();
                sampleGroups.enter()
                            .append("g")
                            .attr({
                                "class": "sample",
                                "height": styles["sampleBarHeight"],
                                "width": this.axis.width,
                                "transform": function(c, i) {return "translate(" + styles["horizAxisPadding"] + "," + (i*(styles["sampleBarHeight"]+styles["sampleBarMargin"])+styles["collectionMargin"]/2) + ")"},
                            })
                sampleGroups.each(function(s) {s.g = d3.select(this);})

                if (this.aggregate) {
                    if (this.options.showHorizons) {
                        sampleGroups.transition().attr("opacity", 0);
                    }
                    else {
                        sampleGroups.transition().attr("opacity", 0.2);
                    }
                    aggGroup.transition().attr("opacity", 1);
                }
                else {
                    aggGroup.transition().attr("opacity", 0);
                    sampleGroups.transition().attr("opacity", 1);
                }
            }

            this.drawLinesGroup = function() {
                var linesGroup = this.g.selectAll(".linesGroup");
                if (linesGroup.empty()) {
                    linesGroup = this.g.append("g").attr("class", "linesGroup")

                    linesGroup.append("line")
                                   .attr({
                                       "class": "v",
                                       "x1": width - styles["horizAxisPadding"],
                                       "x2": width - styles["horizAxisPadding"],
                                       "y1": 0,
                                       "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "stroke": "black",
                                    });

                    linesGroup.append("line")
                                    .attr({
                                       "class": "top",
                                       "x1": width - styles["horizAxisPadding"] - 10,
                                       "x2": width - styles["horizAxisPadding"],
                                       "y1": 0,
                                       "y2": 0,
                                       "stroke": "black",
                                    });

                    linesGroup.append("line")
                                    .attr({
                                       "class": "bottom",
                                       "x1": width - styles["horizAxisPadding"] - 10,
                                       "x2": width - styles["horizAxisPadding"],
                                       "y1": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                                       "stroke": "black",
                                    });

                    collapseButton = linesGroup.append("rect")
                                             .attr({
                                                 "class": "collapseButton",
                                                 "fill": this.collapse ? "black" : "white",
                                                 "stroke": "black",
                                                 "width": 10,
                                                 "height": 10,
                                                 "x": -5 + width - styles["horizAxisPadding"],
                                                 "y": -5 + (this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"])+styles["collectionMargin"]/4)/2,
                                             })
                                             .on("click", this.toggleExpand);

                    aggregateButton = linesGroup.append("rect")
                                                .attr({
                                                    "class": "aggregateButton",
                                                    "fill": this.aggregate ? "black" : "white",
                                                    "stroke": "black",
                                                    "width": 10,
                                                    "height": 10,
                                                    "x": 15 + width - styles["horizAxisPadding"],
                                                    "y": -5 + (this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"])+styles["collectionMargin"]/4)/2,
                                                }).on("click", this.toggleAgg)
                }
                linesGroup.selectAll(".v").attr({
                   "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                })
                linesGroup.selectAll(".bottom").attr({
                   "y1": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                   "y2": this.samples.length*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + styles["collectionMargin"]/4,
                })
            }

            this.toggleExpand = function() {
                this.collapse = !this.collapse;
                var samplePos = function(i) {
                    i = this.collapse ? i : 0;
                    return i * (styles["sampleBarHeight"] + styles["sampleBarMargin"]) + styles["collectionMargin"]/2;
                }.bind(this);
                this.g.selectAll(".collapseButton").transition().attr({
                    "fill": this.collapse ? "white" : "black",
                })
                this.g.selectAll(".sample").transition().attr({
                    "transform": function(c, i) {return "translate(" + styles["horizAxisPadding"] + "," + samplePos(i) + ")"},
                })
            }.bind(this);

            this.toggleAgg = function() {
                this.aggregate = !this.aggregate;
                this.drawSamples();
            }.bind(this);
        }

        Collection.join = function(collections) {
            var joinedSamples = [];
            collections.forEach(function(c) {
                joinedSamples += c.samples;
            })
            return new Collection(joinedSamples);
        };

        function SampleView(g, data) {
            this.curGene = undefined;
            this.g = g;
            this.data = data;
            this.options = {"showIntrons": false, "showHorizons": false};
            this.axis = new BrokenAxis(this.options);
            var that = this;

            this.getCollectionGroups = function() {
                return d3.selectAll(this.collections.map(function (c) {return c.g}));
            }


            this.update = function() {
                var geneName     = $(geneSelector.node()).val(),
                    // chromID_val = $(chromID.node()).val(),
                    pos         = parseInt($(startPos.node()).val()),
                    baseWidth   = parseInt($(baseWidthInput.node()).val());

                //var url = serverOffset + "/pileup?geneName=" + encodeURIComponent(geneName);
                //if (geneName === this.curGene) {
                //    url += "&pos=" + encodeURIComponent(pos) +
                //           "&baseWidth=" + encodeURIComponent(baseWidth)
                //    this.curGene = geneName;
                //}
              //console.log("UPDATE:", geneName, this.curGene, pos, baseWidth, that, this);
              if (geneName === this.curGene){
                that.data.getSamples(geneName,pos,baseWidth)
                  .then(function (data) {
                    that.axis.update(data["geneInfo"], pos, baseWidth);
                    that.draw(data);
                  })
              }else{
                that.data.getSamples(geneName,null,null)
                  .then(function (data) {
                    that.axis.update(data["geneInfo"], pos, baseWidth);
                    that.draw(data);
                  })
              }

            }

            this.draw = function(data) {
                var chromID_val   = $(chromID.node()).val(),
                    pos       = parseInt($(startPos.node()).val()),
                    baseWidth = parseInt($(baseWidthInput.node()).val()),
                    data      = data || this.data,
                    samples   = d3.keys(data["samples"]);

                this.data = data;

                var sampleBarGraphHeight = samples.length * (styles["sampleBarHeight"] + styles["sampleBarMargin"]);

                var sampleObjs;

                samples = [[samples[0]], [samples[1]], [samples[2], samples[3]]];
                // this.collections = this.collections || samples.map(function (sample) {return new Collection([sample], this.axis, this.options)}.bind(this));
                this.collections = this.collections || samples.map(function (sample) {return new Collection(sample, this.axis, this.options)}.bind(this));

                var axisGroup = this.g.selectAll(".genomeAxis");
                if (axisGroup.empty()) {
                    axisGroup = this.g.append("g").attr({
                        "class": "genomeAxis",
                        "transform": "translate(" + styles["horizAxisPadding"] + "," + (samples.reduce(function(memo, num) {return memo + num.length}, 0) * (styles["sampleBarHeight"] + styles["sampleBarMargin"]) + this.collections.length * styles["collectionMargin"]) + ")",
                    });
                }
                this.axis.g = axisGroup;
                this.axis.update(data["geneInfo"], pos, baseWidth);

                var collectionGroups = this.g.selectAll(".collection").data(this.collections);
                collectionGroups.exit().remove();
                var samplesBefore = 0;
                collectionGroups.enter().append("g")
                                        .attr({
                                                "class": "collection",
                                                "transform": function(c, i) {var height = samplesBefore*(styles["sampleBarHeight"]+styles["sampleBarMargin"]) + i*styles["collectionMargin"];
                                                                             samplesBefore += c.samples.length;
                                                                             return "translate(0," + height + ")"},
                                            });
                collectionGroups.each(function(c) {c.g = d3.select(this); c.draw(); c.update(data)});
            }
        }

        styles = {"sampleBarHeight": 40, "sampleBarMargin": 5, "collectionMargin": 0, "horizAxisPadding": 20};
        var sampleGroup = svg.append("g");
        this.data.getAllGenes().then(function(genes) {
          //console.log("genes:", genes);
            Object.keys(genes).forEach(function(gene) {
                geneSelector.append("option").attr('value', gene).text(gene);
            });
            var sampleView = new SampleView(sampleGroup, that.data);
            geneSelector.on({
                "change": sampleView.update
            });

            requestButton.on({
                "click": sampleView.update
            });
            forwardButton.on({
                "click":function(d){
                        var v = +$(startPos.node()).val();
                        var w = +$(baseWidthInput.node()).val();
                        $(startPos.node()).val(v+Math.round(w/4));

                        sampleView.update();
                }
            })
            backwardButton.on({
                "click":function(d){
                        var v = +$(startPos.node()).val();
                        var w = +$(baseWidthInput.node()).val();
                        $(startPos.node()).val(Math.max(v-Math.round(w/4), 1));

                        sampleView.update();
                }
            })

            zoomOutButton.on({
                "click":function(d){
                        var newWidth = +Math.round($(baseWidthInput.node()).val() * 2);
                        $(baseWidthInput.node()).val(newWidth);
                        backwardButton.text("-" + Math.round(newWidth/4))
                        forwardButton.text("+" + Math.round(newWidth/4))

                        sampleView.update();
                }
            })

            zoomInButton.on({
                "click":function(d){
                        var newWidth = +Math.round($(baseWidthInput.node()).val() / 2);
                        if (newWidth > 0) {
                            $(baseWidthInput.node()).val(newWidth);
                            backwardButton.text("-" + Math.round(newWidth/4))
                            forwardButton.text("+" + Math.round(newWidth/4))

                            sampleView.update();
                        }
                }
            })

            toggleIntronButton.on({
                "click": function(d) {
                                        sampleView.options.showIntrons = !sampleView.options.showIntrons;
                                        sampleView.draw();
                                     }
            })

            toggleHorizonsButton.on({
                "click": function(d) {
                                        sampleView.options.showHorizons = !sampleView.options.showHorizons;
                                        sampleView.draw();
                                     }
            })

            sampleView.update();
        });
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


// d3 horizon plugin (need to include with requirejs)
(function() {
  d3.horizon = function() {
    var bands = 1, // between 1 and 5, typically
        mode = "offset", // or mirror
        area = d3.svg.area(),
        defined,
        x = d3_horizonX,
        y = d3_horizonY,
        width = 960,
        height = 40;

    var color = d3.scale.linear()
        .domain([-1, 0, 1])
        .range(["#d62728", "#fff", "#1f77b4"]);

    // For each small multiple…
    function horizon(g) {
      g.each(function(d) {
        var g = d3.select(this),
            xMin = Infinity,
            xMax = -Infinity,
            yMax = -Infinity,
            x0, // old x-scale
            y0, // old y-scale
            t0,
            id; // unique id for paths

        // Compute x- and y-values along with extents.
        var data = d.map(function(d, i) {
          var xv = x.call(this, d, i),
              yv = y.call(this, d, i);
          if (xv < xMin) xMin = xv;
          if (xv > xMax) xMax = xv;
          if (-yv > yMax) yMax = -yv;
          if (yv > yMax) yMax = yv;
          return [xv, yv];
        });

        // Compute the new x- and y-scales, and transform.
        var x1 = d3.scale.linear().domain([xMin, xMax]).range([0, width]),
            y1 = d3.scale.linear().domain([0, yMax]).range([0, height * bands]),
            t1 = d3_horizonTransform(bands, height, mode);

        // Retrieve the old scales, if this is an update.
        if (this.__chart__) {
          x0 = this.__chart__.x;
          y0 = this.__chart__.y;
          t0 = this.__chart__.t;
          id = this.__chart__.id;
        } else {
          x0 = x1.copy();
          y0 = y1.copy();
          t0 = t1;
          id = ++d3_horizonId;
        }

        // We'll use a defs to store the area path and the clip path.
        var defs = g.selectAll("defs")
            .data([null]);

        // The clip path is a simple rect.
        defs.enter().append("defs").append("clipPath")
            .attr("id", "d3_horizon_clip" + id)
          .append("rect")
            .attr("width", width)
            .attr("height", height);

        d3.transition(defs.select("rect"))
            .attr("width", width)
            .attr("height", height);

        // We'll use a container to clip all horizon layers at once.
        g.selectAll("g")
            .data([null])
          .enter().append("g")
            .attr("clip-path", "url(#d3_horizon_clip" + id + ")");

        // Instantiate each copy of the path with different transforms.
        var path = g.select("g").selectAll("path")
            .data(d3.range(-1, -bands - 1, -1).concat(d3.range(1, bands + 1)), Number);

        if (defined) area.defined(function(_, i) { return defined.call(this, d[i], i); });

        var d0 = area
            .x(function(d) { return x0(d[0]); })
            .y0(height * bands)
            .y1(function(d) { return height * bands - y0(d[1]); })
            (data);

        var d1 = area
            .x(function(d) { return x1(d[0]); })
            .y1(function(d) { return height * bands - y1(d[1]); })
            (data);

        path.enter().append("path")
            .style("fill", color)
            .attr("transform", t0)
            .attr("d", d0);

        d3.transition(path)
            .style("fill", color)
            .attr("transform", t1)
            .attr("d", d1);

        d3.transition(path.exit())
            .attr("transform", t1)
            .attr("d", d1)
            .remove();

        // Stash the new scales.
        this.__chart__ = {x: x1, y: y1, t: t1, id: id};
      });
    }

    horizon.bands = function(_) {
      if (!arguments.length) return bands;
      bands = +_;
      color.domain([-bands, 0, bands]);
      return horizon;
    };

    horizon.mode = function(_) {
      if (!arguments.length) return mode;
      mode = _ + "";
      return horizon;
    };

    horizon.colors = function(_) {
      if (!arguments.length) return color.range();
      color.range(_);
      return horizon;
    };

    horizon.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return horizon;
    };

    horizon.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return horizon;
    };

    horizon.width = function(_) {
      if (!arguments.length) return width;
      width = +_;
      return horizon;
    };

    horizon.height = function(_) {
      if (!arguments.length) return height;
      height = +_;
      return horizon;
    };

    horizon.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return horizon;
    };

    return d3.rebind(horizon, area, "interpolate", "tension");
  };

  var d3_horizonId = 0;

  function d3_horizonX(d) { return d[0]; }
  function d3_horizonY(d) { return d[1]; }

  function d3_horizonTransform(bands, h, mode) {
    return mode == "offset"
        ? function(d) { return "translate(0," + (d + (d < 0) - bands) * h + ")"; }
        : function(d) { return (d < 0 ? "scale(1,-1)" : "") + "translate(0," + (d - bands) * h + ")"; };
  }
})();
