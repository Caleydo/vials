/**
 * Created by Bilal Alsallakh 02/01/14
 * Based on work by Joseph Botros
 */

/**
 * Isoform + Frequency Visualization
 */

define(['exports', 'd3', 'altsplice-gui', '../caleydo/event'], function (exports, d3, gui, event) {
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
    //gui.allVisUpdates.push(function(){
    //  console.log("argh", this);
    //})

  }

  /**
   * factory method of this module
   * @param data the data to show
   * @param parent the parent dom element to append
   * @returns {GenomeVis} the visualization
   */
  function create(data, parent) {
    return new GenomeVis(data, parent);
  }

  var margin = {top: 40, right: 10, bottom: 20, left: 10},
    width = 750 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;
  var dotRadius = 4;
  var defaultDotColor = "rgba(0,0,0,0.6)";
  var dehighlightedDotColor = "rgba(0,0,0,0.2)";
  var highlightedDotColor = "red";
  var weightAxisCaptionWidth = 25;

  var jxnWrapperPadding = 15;
  var jxnWrapperHeight = 300;
  var miniExonSpacing = 10;
  var miniExonHeight = 7;
  var jxnCircleRadius = 5;
  var hoveredEdgeColor = "orange";
  var jxnBBoxWidth = jxnCircleRadius * 2.5;

  var RNAHeight = 30;
  var RNAMargin = 30;
  var isoformEdgePadding = 9;

  var curGene;
  var curRNAs;
  var curExons;
  var expandedIsoform = -1;
  var selectedIsoform = -1;

  var serverOffset;
  var geneData;


  var jxnArea;
  var yScaleContJxn;
  var cellRadius = 14;
  var cellMargin = 2;
  var cellWidth = cellRadius*2 + cellMargin;
  var isoformSelector;

  GenomeVis.prototype.build = function ($parent) {
    serverOffset = this.data.serveradress;

    var that = this;
    that.axis = that.data.genomeAxis;

    //var selectIsoformDiv = $parent.append("div");
    //selectIsoformDiv.text("Select isoform: ")
    //isoformSelector = selectIsoformDiv.append("select");
    //isoformSelector.append("option").attr('value', null).text("<none>");
    //isoformSelector.on({
    //  "change": function(){
    //    var index = this.selectedIndex - 1;
    //    if (expandedIsoform != index && expandedIsoform != -1) {
    //        collapseIsoform(expandedIsoform, function() {
    //          selectIsoform(index);
    //        })
    //    }
    //    else
    //      selectIsoform(index)
    //  }
    //})

    event.on("isoFormSelect", function(ev,data){
      var index  = data.index;

      if (expandedIsoform != index && expandedIsoform != -1) {
          collapseIsoform(expandedIsoform, function() {
            selectIsoform(index);
          })
       }
       else{
        selectIsoform(index)
      }

    });


    var head = $parent.append("div").attr({
      "class":"gv"
    })

    // SETUP THE GUI Controls
    createGenDefControls(head);

    // SETUP THE VIS

    var svg = head.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({
        //"top":"10px",
        "left":"20px",
        "position":"relative"

      })
      //.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var exploreArea = svg.append("g").attr("transform", "translate(20, 20)");
    jxnArea = exploreArea.append("g").attr("id", "jxnArea");



    function updateVisualization() {
      var startPos = gui.current.getStartPos()
      var baseWidth =gui.current.getBaseWidth()

      curGene = getCurGene(startPos, baseWidth);
      curRNAs = getCurRNAs(curGene, startPos, baseWidth);

      //curRNAs.forEach(function (rna, index) {
      //  var span = curRNAs[0].RNASpan;
      //  isoformSelector.append("option").text("isoform" + index);
      //});

      curExons = getCurExons(curRNAs);


      // ==========================
      // BIND DATA TO VISUALIZATION
      // ==========================

      that.data.getSamples(curGene,startPos,baseWidth).then(function(sampleData) {
        samples = d3.keys(sampleData.samples);
        var geneInfo = sampleData["geneInfo"];
        that.axis.update(geneInfo,
                         startPos || geneInfo["geneSpan"][0],
                         baseWidth || (geneInfo["geneSpan"][1] - geneInfo["geneSpan"][0] + 1));

        var RNAHeight = 30;
        var RNAMargin = 30;
        var RNAArea = jxnArea.append("g").attr({
          "id": "RNAArea",
          "transform": "translate(0," + (jxnWrapperHeight+RNAMargin) + ")"
        });
        drawRNA(curRNAs.reduce(function(memo, num) {
            if (memo.length > num.length) {return memo}
            else {return num}
          }),
          RNAArea, that.axis, RNAHeight, RNAMargin);


        drawJxnsLegend();



        var maxJxnReads = 0;
        for (sample in sampleData.samples) {
          maxJxnReads = Math.max(sampleData.samples[sample]["jxns"].reduce(function(a, b) {return Math.max(a, b[1])}, 0), maxJxnReads);
        }
        var exonWeightsAreaHeight = jxnWrapperHeight - 4 * miniExonHeight; // the lower part is the mini exon legend
        yScaleContJxn = d3.scale.linear().domain([0, maxJxnReads]).range([exonWeightsAreaHeight- jxnCircleRadius, 2 * jxnCircleRadius]);
        var yAxisJxn = d3.svg.axis()
          .orient("left")
          .scale(yScaleContJxn);
        var edgeAxisGroup = jxnArea.append("g")
          .attr("class", "axis")
          .call(yAxisJxn)
          .attr("transform", "translate(" + weightAxisCaptionWidth + " 0)");
        edgeAxisGroup.append("text")      // text label for the x axis
          .attr("x", -20)
          .attr("y", exonWeightsAreaHeight / 2)
          .attr("font-size", 12)
          .style("text-anchor", "middle")
          .text("Edge Weight")
          .attr("transform", "rotate(-90, " + (-weightAxisCaptionWidth) + " " + exonWeightsAreaHeight / 2 + ")");

        var overlay = jxnArea.append("g");

        drawJxns(overlay, sampleData, yScaleContJxn)

      });
      //// should trigger a cache hit
      //that.data.getSamples(chromID,startPos,baseWidth);

    }


    function jxnWrapperWidth(i) {
      return (curExons.length - i) * (miniExonWidth() + miniExonSpacing) + miniExonSpacing
    }

    function miniExonWidth() {
      return  (width - weightAxisCaptionWidth - (curExons.length + 1) * (jxnWrapperPadding + miniExonSpacing))
        / (curExons.length * (curExons.length));
    }

    function getWrapperStartX(i) {
      var shift = jxnWrapperPadding + weightAxisCaptionWidth;
      for (var j = 0; j < i; j++)
        shift += jxnWrapperWidth(j)+jxnWrapperPadding
      return shift;
    }

    function getJxnGroupX(i) {
      return i*(miniExonSpacing+miniExonWidth())+miniExonSpacing
    }

    function getBoxPlotXPos(srcExonInd, targetExonInd) {
      return getWrapperStartX(srcExonInd) +getJxnGroupX(targetExonInd - srcExonInd) + miniExonWidth() / 2;
    }



    function drawRNA(RNA, RNAArea, axis, RNAHeight, RNAMargin) {

      RNAArea.append("line").attr({
        "x1": axis.getXPos(RNA.RNASpan[0]),
        "x2": axis.getXPos(RNA.RNASpan[1]),
        "y1": RNAHeight/2,
        "y2": RNAHeight/2,
        "class": "RNALine",
        "stroke": "#666"
      });

      exons = RNAArea.selectAll(".exon")
        .data(RNA.exons)
      exons.exit().remove();
      exons.enter().append("rect").attr({
        "class": "exon",
        "fill": "black",
        "x": function(d) {return axis.getXPos(d[0]);},
        "y": 0,
        "width": function(d) {return (d[1] - d[0]) * axis.rangeBand();},
        "height": RNAHeight
      })

      exons.enter().append("polygon").attr({
        "points" : function(d, i) {
          var x1 = axis.getXPos(d[0]);
          var x2 = axis.getXPos(d[1]);
          var x3 = getWrapperStartX(i) + miniExonWidth() + miniExonSpacing;
          var x4 = getWrapperStartX(i) + miniExonSpacing;
          return [
            x1, 0,
            x2, 0,
            x3, -RNAMargin,
            x4, -RNAMargin
          ]},
        "class": "JXNAreaConnector",
        "stroke": "#ccc",
        "fill":"#ccc"
      })

      var RNAEdges = RNAArea.append("g").style({
      });

      for (var i = 0; i < curExons.length - 1; i++) {
        var srcExon = curExons[i];
        for (var j = i + 1; j < curExons.length; j++) {
          var destExon = curExons[j];
          var x1 = (axis.getXPos(srcExon[0]) + axis.getXPos(srcExon[1])) / 2;
          var x2 = (axis.getXPos(destExon[0]) + axis.getXPos(destExon[1])) / 2;
          var y1 = RNAHeight;
          var y2 = RNAHeight + RNAMargin;
          RNAEdges.append("polyline").attr({
            "groupId": "RNA",
            "startExonInd": i,
            "endExonInd": j,
            "points" : function(d, i) {
              return [
                x1, y1,
                x1, y2,
                x2, y2,
                x2, y1
              ]},
            "class": "edgeConnector",
            "stroke": hoveredEdgeColor,
            "fill":"none",
            "stroke-width":2,
            "visibility": "hidden"
          });
        }
      }
    }



    function drawJxnsLegend() {

      var jxnWrappers = jxnArea.selectAll(".jxnWrapper").data(curExons);
      jxnWrappers.exit().remove();
      var jxnWrappersEnter = jxnWrappers.enter().append("g").attr({
        "class": "jxnWrapper",
        "transform": function(exon, i) {return "translate("+ getWrapperStartX(i)+",0)"}
      });
      jxnWrappersEnter.append("rect").attr({
        "class": "jxnWrapperBox",
        "fill": "#ccc",
        "height": jxnWrapperHeight,
        "width": function(exon, i) {return jxnWrapperWidth(i)}
      })


      jxnWrappers.each(function(curExon, curExonIdx) {
        var jxnWrapper = d3.select(this);
        var definingExonX = 0.5 * (miniExonSpacing+miniExonWidth());
        for (var groupExonInd  = curExonIdx; groupExonInd  < curExons.length; groupExonInd ++) {
          jxnWrapper.append("rect").attr({
            "class": "miniExonBox",
            "width": miniExonWidth(),
            "sourceExonInd": curExonIdx,
            "targetExonInd": groupExonInd,
            "height": miniExonHeight,
            "stroke": "black",
            "fill": "black", // function(exon, i) {return i == curExonIdx ? "white" : "black"},
            "transform": function (exon, i) {
              var shiftY = jxnWrapperHeight - miniExonHeight;
              if (groupExonInd != curExonIdx)
                shiftY -= 3 * miniExonHeight;
              return "translate(" + getJxnGroupX(groupExonInd  - curExonIdx) + "," + shiftY + ")"
            }
          }).on('mouseover', function () {
            if (selectedIsoform == -1) {
              var miniExonInd = this.getAttribute("targetExonInd");
              var miniExonSrcInd = this.getAttribute("srcExonInd");
              d3.selectAll(".boxplotWithDots, .miniExonBox").each(function () {
                var srcExonInd = this.getAttribute("sourceExonInd");
                var targetExonInd = this.getAttribute("targetExonInd");
                var groupNode = d3.select(this);
                groupNode.style({
                  "opacity": srcExonInd == miniExonInd || targetExonInd == miniExonInd ||
                  srcExonInd == miniExonSrcInd || targetExonInd == miniExonSrcInd ? 1 : 0.1,
                  "fill": targetExonInd == miniExonInd ? "orange" : "black"
                })
                d3.selectAll(".miniExonEdge").style({
                  "opacity": 0.1
                })
              })
            }
          }).on('mouseout', function () {
            if (selectedIsoform == -1) {
              d3.selectAll(".boxplotWithDots").style({
                "opacity": 1,
                "fill": "white"
              })
              d3.selectAll(".miniExonBox, .miniExonEdge").style({
                "opacity": 1,
                "fill": "black"
              })
            }
          });

          if (groupExonInd  > curExonIdx) {
          jxnWrapper.append("line").attr({
            "class": "miniExonEdge",
            "stroke": "black",
            "x1": function (exon, i) {
              if (groupExonInd == curExonIdx) return 0;
              return definingExonX;
            },
            "x2": getJxnGroupX(groupExonInd  - curExonIdx) + miniExonWidth() / 2,
            "y1": jxnWrapperHeight - miniExonHeight,
            "y2": jxnWrapperHeight - 3 * miniExonHeight
          })
          }
        }
      });
    }

    function drawJxns(exonJxnGroup, data,yScaleContJxn) {

      function getExonIdx(exon) {
        var idx;
        curExons.forEach(function(curExon, i) {if (curExon[0] == exon[0] && curExon[1] == exon[1]) {idx = i}});
        return idx;
      }


      function getJxnsFromSpan(curExon, otherExon) {
        var jxns = [];
        for (var sample in data.samples) {
          data.samples[sample]["jxns"].forEach(function(jxn, i) {
            if ((curExon[1] == jxn[0][0] && otherExon[0] == jxn[0][1]) ||
              (otherExon[1] == jxn[0][0] && curExon[0] == jxn[0][1])) {
              jxns.push(jxn[1]);
            }
          });
        }
        return jxns
      }
      for (var curExonIdx = 0; curExonIdx < curExons.length - 1; curExonIdx++) {
        var curExon = curExons[curExonIdx];
        for (var groupExonInd = curExonIdx + 1; groupExonInd < curExons.length; groupExonInd++) {
          var exon = curExons[groupExonInd];

          var exonGroupJxns = getJxnsFromSpan(curExon, exon);
          var sortedJxns = exonGroupJxns.slice().sort(d3.ascending);
          var firstQuartile = d3.quantile(sortedJxns, 0.25);
          var secondQuartile = d3.quantile(sortedJxns, 0.5);
          var thirdQuartile = d3.quantile(sortedJxns, 0.75);
          var minVal = d3.min(sortedJxns);
          var maxVal = d3.max(sortedJxns);
          var iqr = 1.5 * (thirdQuartile - firstQuartile);
          var whiskerTop, whiskerDown;
          {
            var i = -1;
            var j = sortedJxns.length;
            while ((sortedJxns[++i] < firstQuartile - iqr));
            while (sortedJxns[--j] > thirdQuartile + iqr);
            whiskerTop = j == sortedJxns.length - 1 ? sortedJxns[j] : thirdQuartile + iqr;
            whiskerDown = i == 0 ? sortedJxns[i] : firstQuartile - iqr;
          }

          var x1 = (that.axis.getXPos(curExon[0]) + that.axis.getXPos(curExon[1])) / 2;
          var x2 = (that.axis.getXPos(exon[0]) + that.axis.getXPos(exon[1])) / 2;
          var y1 = jxnWrapperHeight + RNAMargin
          var y2 = yScaleContJxn(secondQuartile);
          polyLine = exonJxnGroup.append("polyline").attr({
            "startExonInd": curExonIdx,
            "endExonInd": groupExonInd,
            "points": function (d, i) {
              return [
                x1 + isoformEdgePadding, y1,
                x1 + isoformEdgePadding, y2,
                x2 - isoformEdgePadding, y2,
                x2 - isoformEdgePadding, y1
              ]
            },
            "class": "isoformEdge",
            "stroke": "black",
            "fill": "none",
            "stroke-width": 2,
            "visibility": "hidden"
          });


          var boxplotWithDots = exonJxnGroup.append("g").attr({
            "class": "boxplotWithDots",
            "sourceExonInd": curExonIdx,
            "targetExonInd": groupExonInd,
            "transform": "translate(" + getBoxPlotXPos(curExonIdx, groupExonInd) + ",0)"
          })

          boxplotWithDots.append("line").attr({
            "class": "boxPlotLine",
            "stroke": "black",
            "stroke-dasharray": "5,5",
            "x1": 0,
            "x2": 0,
            "y1": yScaleContJxn(whiskerDown),
            "y2": yScaleContJxn(whiskerTop)
          })

          boxplotWithDots.append("rect").attr({
            "ContainingExon": curExon,
            "GroupExon": exon,
            "class": "jxnBBox",
            "sourceExonInd": curExonIdx,
            "targetExonInd": groupExonInd,
            "minVal" : minVal,
            "firstQuartile": firstQuartile,
            "secondQuartile": secondQuartile,
            "thirdQuartile": thirdQuartile,
            "vector-effect": "non-scaling-stroke",
            "maxVal" : maxVal,
            "ActiveIsoform": -1,
            "fill": "white",
            "height": Math.abs(yScaleContJxn(thirdQuartile) - yScaleContJxn(firstQuartile)),
            "width": jxnBBoxWidth,
            "transform": "translate(" + (-jxnBBoxWidth / 2) + "," + yScaleContJxn(thirdQuartile) + ")"
          }).on('mouseover', function () {
            d3.select(this).attr({"fill": hoveredEdgeColor})
            var srcExon = this.getAttribute("sourceExonInd");
            var targetExon = this.getAttribute("targetExonInd");

            if (selectedIsoform < 0) {
              d3.selectAll(".edgeConnector").filter(function () {
                if ((this.getAttribute("groupId") == "average" || this.getAttribute("groupId") == "RNA")
                  && this.getAttribute("startExonInd") == d3.min([srcExon, targetExon])
                  && this.getAttribute("endExonInd") == d3.max([srcExon, targetExon])) {
                  return true;
                }
                return false;
              }).style({"visibility": "visible"});
            }

          }).on('mouseout', function () {
            d3.selectAll(".jxnBBox").attr({"fill": "white"})
            d3.selectAll(".edgeConnector").filter(function () {
              return this.getAttribute("groupId") == "average" || this.getAttribute("groupId") == "RNA"
            }).style({"visibility": "hidden"});
          }).on("dblclick", function () {
            var activeIsoform = this.getAttribute("ActiveIsoform");
            if (expandedIsoform >= 0 && activeIsoform == expandedIsoform) {
              collapseIsoform(expandedIsoform)
            }
            else if (activeIsoform >= 0) {
              d3.selectAll(".jxnBBox").each(function () {
                if (this.getAttribute("ActiveIsoform") == activeIsoform) {
                  expandJxn(this)
                }
              })
              expandedIsoform = activeIsoform;
            }
          })

          boxplotWithDots.append("line").attr({
            "class": "boxPlotLine",
            "x1": -jxnBBoxWidth / 2,
            "x2": jxnBBoxWidth / 2,
            "y1": yScaleContJxn(secondQuartile),
            "y2": yScaleContJxn(secondQuartile),
            "stroke": "#666"
          })

          boxplotWithDots.append("line").attr({
            "class": "boxPlotLine",
            "x1": - jxnBBoxWidth / 2,
            "x2": jxnBBoxWidth / 2,
            "y1": yScaleContJxn(whiskerTop),
            "y2": yScaleContJxn(whiskerTop),
            "stroke": "#666"
          })

          boxplotWithDots.append("line").attr({
            "class": "boxPlotLine",
            "x1": - jxnBBoxWidth / 2,
            "x2": + jxnBBoxWidth / 2,
            "y1": yScaleContJxn(whiskerDown),
            "y2": yScaleContJxn(whiskerDown),
            "stroke": "#666"
          })

          var jxnCircles = boxplotWithDots
            .selectAll(".jxnCircle")
            .data(exonGroupJxns)
          jxnCircles.exit().remove();
          jxnCircles.enter().append("circle").attr({
            "class": "jxnCircle",
            "sourceExonInd": curExonIdx,
            "targetExonInd": groupExonInd,
            "data-sample": function (d, i) {
              return samples[i]
            },
            "r": jxnCircleRadius,
            "cx": 0,
            "cy": function (d) {
              return yScaleContJxn(d)
            },
            "fill": function (d, i) {
              return defaultDotColor
            }
          });

          jxnCircles.on('mouseover', function (val, nodeInd) {
            var hoveredSample = this.getAttribute("data-sample");

            d3.selectAll('.jxnCircle').style('fill', function (val2, nodeInd2) {
              var sample = this.getAttribute("data-sample");
              return (sample == hoveredSample) ? highlightedDotColor : dehighlightedDotColor;
            });


          }).on('mouseout', function (val, dotInd, plotInd) {
            d3.selectAll('.jxnCircle')
              .transition()
              .duration(100)
              .style('fill', defaultDotColor);

          });

          jxnCircles.append("svg:title")
            .text(function (d, i) {
              return samples[i] + ": " + d;
            })
        }
      }

    }

    function expandJxn(jxnBox, callback) {

      var boxPlotGroup = jxnBox.parentNode;
      boxPlotGroup.parentNode.appendChild(boxPlotGroup)

      var srcInd = jxnBox.getAttribute("sourceExonInd");
      var targetInd = jxnBox.getAttribute("targetExonInd");

      var minVal = jxnBox.getAttribute("minVal");
      var maxVal = jxnBox.getAttribute("maxVal");

      var boxPlotXPos = getBoxPlotXPos(srcInd, targetInd);

      var axis = that.axis;
      var srcMid = (axis.getXPos(curExons[srcInd][0]) + axis.getXPos(curExons[srcInd][1])) / 2;
      var targetMid = (axis.getXPos(curExons[targetInd][0]) + axis.getXPos(curExons[targetInd][1])) / 2;

      var oldWidth = jxnBBoxWidth;
      var oldHeight = jxnBox.getAttribute("height");
      var newWidth  = getExpandJxnWidth()
      var newHeight = yScaleContJxn(minVal) - yScaleContJxn(maxVal) + 2 * (jxnCircleRadius + 2)
      var xScale = newWidth / oldWidth;
      var yScale = newHeight / oldHeight;
      var xShift = srcMid + (targetMid - srcMid - newWidth) / 2 - boxPlotXPos;
      var yShift = yScaleContJxn(maxVal) - jxnCircleRadius - 2;


      d3.select(jxnBox).attr({
      }).transition().duration(400).attr({
        "transform": "translate(" + xShift + ", " + yShift + ") scale(" + xScale + ", " + yScale + ")"
      }).style({
        "stroke" : "black",
        "fill-opacity": 1
      }).each("end", callback);

      var parentNode = d3.select(boxPlotGroup);
      parentNode.selectAll(".boxPlotLine").style({
        "visibility": "hidden"
      });
      parentNode.selectAll(".jxnCircle").transition().duration(400).attr({
        "cx": (srcMid + targetMid) / 2 - boxPlotXPos
      })
    }

    function collapseJxn(jxnBox, callback) {

      var xShift =  -jxnBBoxWidth / 2;
      var yShift = yScaleContJxn(jxnBox.getAttribute("thirdQuartile"));

      d3.select(jxnBox).attr({
      }).transition().duration(400).attr({
        "transform": "translate(" + xShift + ", " + yShift + ") scale(1, 1)"
      }).style({
        "stroke" : "black",
        "fill-opacity": 1
      }).each("end", callback);

      var parentNode = d3.select(jxnBox.parentNode);
      parentNode.selectAll(".jxnCircle").transition().duration(400).attr({
        "cx": 0
      })
      parentNode.transition().delay(400).selectAll(".boxPlotLine").style({
        "visibility": "visible"
      });

    }

    function collapseIsoform(index, callback) {
      var selection = d3.selectAll(".jxnBBox").filter(function (d, i) {
        return (this.getAttribute("ActiveIsoform") == index);
      })
      var size = 0;
      selection.each(function() { size++; });
      selection.each(function (d, i) {
        if (i == size - 1)
          collapseJxn(this, callback)
        else
          collapseJxn(this)
      })
      expandedIsoform = -1;
    }

    function getExpandJxnWidth() {
      var axis = that.axis;
      var jxnWidth = width;
      var x1 = (axis.getXPos(curExons[0][0]) + axis.getXPos(curExons[0][1])) / 2;

      for (i = 1; i < curExons.length; i++) {
        var x2 = (axis.getXPos(curExons[i][0]) + axis.getXPos(curExons[i][1])) / 2;
        if (x2 - x1 < jxnWidth)
          jxnWidth = x2 - x1;
        x1 = x2;
      }
      return jxnWidth - 4 * isoformEdgePadding;
    }

    function selectIsoform(index) {
      if (index == -1){
        d3.selectAll(".JXNAreaConnector, .jxnWrapperBox, .miniExonBox, .miniExonEdge").
          transition().duration(200).style({
            "opacity" : 1
          })
        jxnArea.selectAll(".isoformEdge").style({"visibility":  "hidden"});

        d3.selectAll(".boxplotWithDots").style({
          "opacity" : "1"
        })
        jxnArea.selectAll(".jxnBBox").transition().duration(200).style({
          "fill" : "white",
          "ActiveIsoform" : -1
        })

      }
      else {
        d3.selectAll(".JXNAreaConnector, .jxnWrapperBox, .miniExonBox, .miniExonEdge").transition().
          duration(300).style({
            "opacity" : 0.1
          })

        var isoform = curRNAs[index];

        /*        d3.selectAll(".jxnWrapper").transition().duration(300).style({
         "opacity" : 0.1
         })
         d3.selectAll(".JXNAreaConnector").transition().duration(300).style({
         "opacity" : 0.1
         }) */

        d3.selectAll(".boxplotWithDots").each(function() {
          var srcExonInd = this.getAttribute("sourceExonInd");
          var targetExonInd = this.getAttribute("targetExonInd");
          var srcExon = curExons[srcExonInd ]
          var targetExon= curExons[targetExonInd]
          var ind = isoform.exons.indexOf(srcExon);
          var groupNode = d3.select(this);
          if (ind >= 0 && (ind < isoform.exons.length - 1) && isoform.exons[ind + 1] == targetExon) {
            groupNode.style({
              "opacity" : "1"
            })
            groupNode.selectAll(".jxnBBox").attr({
              "ActiveIsoform" : index,
              "stroke": "black"
            })

            jxnArea.selectAll(".isoformEdge").filter(function() {
              return this.getAttribute("startExonInd") == srcExonInd
                && this.getAttribute("endExonInd") ==  targetExonInd
            }).style({"visibility":  "visible"});
          }
          else {
            groupNode.style({
              "opacity" : "0.1"
            })
            groupNode.selectAll(".jxnBBox").attr({
              "ActiveIsoform" : -1

            }).transition().duration(300).style({
              "fill" : "white",
            })

              jxnArea.selectAll(".isoformEdge").filter(function() {
                return this.getAttribute("startExonInd") == srcExonInd
                && this.getAttribute("endExonInd") ==  targetExonInd
            }).style({"visibility":  "hidden"});

          }
        })
      }
      selectedIsoform = index;
    }

    //globalCallCount = 1;
    function getCurRNAs(geneName, pos, baseWidth) {
      if (!geneData) return [];
      //console.log(globalCallCount, geneName, geneData)
      //globalCallCount++;
      var gene = geneData[geneName];
      //console.log(gene);
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
        }, 0)
    }

    function getCurGene(pos, baseWidth) {

      for (var geneName in geneData) {
        geneInfo = geneData[geneName]
        if ((geneInfo.tx_start >= pos && geneInfo.tx_start <= pos + baseWidth) ||
          (geneInfo.tx_end >= pos && geneInfo.tx_end <= pos + baseWidth)) {
          return geneName;
        }
      }
    }

    function createGenDefControls(container) {

      // TODO: potential runtime conditions here
      that.data.getAllGenes().then( function(genes) {
        geneData = genes;
      });

      gui.current.addUpdateEvent(updateVisualization)

    }


    updateVisualization();
    return head.node();
  };

  exports.GenomeVis = GenomeVis;
  exports.create = create;
});
