'use strict';

//noinspection Annotator
define(['exports', '../caleydo/main', '../caleydo/datatype', 'd3', '../bower_components/js-lru/lru.js'], function(exports, C, datatypes, d3, lru) {
        function BrokenAxis(width, options) {
                this.scaleList = [];
                this.width = width;
                this.options = options;

                this.getAxisRanges = function(curExons, startPosVal, baseWidth, showIntrons) {
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
                    }
                    else {
                        ranges = curExons;
                    }
                    return ranges;
                }

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

                this.update = function(geneInfo, pos, baseWidth, g) {
                    this.curExons = geneInfo["curExons"];

                    this.ranges = this.getAxisRanges(this.curExons, pos, baseWidth, this.options.showIntrons);

                    var ranges = this.ranges,
                        axisPos = 0,
                        axisPadding = this.options.showIntrons ? 0 : 60,
                        totalAxisWidth = ranges.reduce(function(a, b) {return a + b[1] - b[0] + 1}, 0),
                        scaleList = [],
                        graphWidth = width,
                        pixelWidth = graphWidth - axisPadding*(ranges.length - 1);

                    this.ranges.forEach(function(range, i) {
                        var axisWidth = (range[1] - range[0] + 1)/totalAxisWidth * pixelWidth;
                        var xScale = d3.scale.ordinal().domain(d3.range(range[0]-1, range[1]+1)).rangeBands([axisPos,axisPos+axisWidth-1]);
                        scaleList.push(xScale);
                        axisPos = axisPos + axisWidth + axisPadding;
                    });

                    this.scaleList = scaleList;

                    if (g) {
                        this.draw(g);
                    }
                }

                this.draw = function(g) {
                    // shouldn't have to remove each time, need to clean up
                    g.selectAll(".x.axis").remove();

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

                        g.append("g").attr({
                                            "class": "x axis",
                                            "transform": "translate(0," + g.attr("height") +")"
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

    exports.GenomeDataLink = datatypes.defineDataType('GenomeDataLink', {
      init: function (desc) {
        this.serveradress = desc.serveradress;
        this.sampleCache = new LRUCache(5); // create a cache of size 5
        this.allGenes=null;
        this.bamHeader=null;
        this.options={"showIntrons": false};
        this.genomeAxis=new BrokenAxis(600, this.options);
      },

      getSamples:function (gene, startPos, baseWidth){
        var res = this.sampleCache.get(gene+"-"+startPos+"-"+ baseWidth);

        /* cache fail */
        if (!res){
          //console.log("cahce miss");
          var parameters = ["geneName="+encodeURIComponent(gene)];
          if (startPos) parameters.push("pos="+encodeURIComponent(startPos));
          if (baseWidth) parameters.push("baseWidth="+encodeURIComponent(baseWidth))

          res = $.getJSON(this.serveradress+ "/pileup?"+parameters.join("&"));

          this.sampleCache.put(gene+"-"+startPos+"-"+ baseWidth, res);
        }
        //else{
        //  console.log("cahce hit");
        //}

        /* return a (fullfilled) promise */
        return res;
      },

      getAllGenes:function(){
        if (this.allGenes === null)
          this.allGenes = $.getJSON(this.serveradress + "/genes");

        return this.allGenes;
      },

      getBamHeader:function(){
        if (this.bamHeader == null)
          this.bamHeader = $.getJSON(this.serveradress+"/header");
        return this.bamHeader;
      },
    });

    exports.create = function(desc) {
      return new exports.GenomeDataLink(desc);
    };
});

/*
 !! this file makes use of the js-lru implementation from https://github.com/rsms/js-lru

License:
 Copyright (c) 2010 Rasmus Andersson http://hunch.se/

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

