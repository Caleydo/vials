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
  var exonWeightsAreaHeight;
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
  var xJxnBoxScale = d3.scale.linear();
  var cellRadius = 14;
  var cellMargin = 2;
  var cellWidth = cellRadius*2 + cellMargin;
  var showDotGroups = false;
  var groups = [{"samples": ["heartWT1", "heartWT2"], "color": "#a6cee3"},
    {"samples": ["heartKOa", "heartKOb"], "color": "#b2df8a"}];

  GenomeVis.prototype.build = function ($parent) {
    serverOffset = this.data.serveradress;

    var that = this;
    that.axis = that.data.genomeAxis;

    var viewOptionsDiv = $parent.append("div").style({
      "left": "20px"
    });

    $('<input />', { type: 'checkbox', id: 'cb', value: "showGroups" }).appendTo(viewOptionsDiv);
    $('<label />', { 'for': 'cb', text: "Show groups" }).appendTo(viewOptionsDiv);
    $('#cb').change(function() {
      showDotGroups = $(this).is(":checked")
      console.log(showDotGroups)
    });


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
        // that.data.getTestSamples("pileup ENSG00000150782.json").then(function(sampleData) {
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
        exonWeightsAreaHeight = jxnWrapperHeight - 4 * miniExonHeight; // the lower part is the mini exon legend
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

        drawJxns(overlay, sampleData)

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


    function getJxnsFromSpan(data, curExon, otherExon) {
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

    /*      function getExonIdx(exon) {
     var idx;
     curExons.forEach(function(curExon, i) {if (curExon[0] == exon[0] && curExon[1] == exon[1]) {idx = i}});
     return idx;
     }
     */

    function computeBoxPlot(values) {
      var sortedJxns = values.sort(d3.ascending);
      var Q = new Array(5);
      Q[0] = d3.min(sortedJxns);
      Q[4] = d3.max(sortedJxns);
      Q[1] = d3.quantile(sortedJxns, 0.25);
      Q[2] = d3.quantile(sortedJxns, 0.5);
      Q[3] = d3.quantile(sortedJxns, 0.75);
      var iqr = 1.5 * (Q[3] - Q[1]);
      var whiskerTop, whiskerDown;
      {
        var i = -1;
        var j = sortedJxns.length;
        while ((sortedJxns[++i] < Q[1] - iqr));
        while (sortedJxns[--j] > Q[3] + iqr);
        whiskerTop = j == sortedJxns.length - 1 ? sortedJxns[j] : Q[3] + iqr;
        whiskerDown = i == 0 ? sortedJxns[i] : Q[1] - iqr;
      }
      return {"whiskerTop": whiskerTop, "whiskerDown": whiskerDown, "Q": Q};
    }

    function drawJxns(exonJxnGroup, data) {
      var expandedWidth  = getExpandJxnWidth()

      for (var curExonIdx = 0; curExonIdx < curExons.length - 1; curExonIdx++) {
        var curExon = curExons[curExonIdx];
        for (var groupExonInd = curExonIdx + 1; groupExonInd < curExons.length; groupExonInd++) {
          var exon = curExons[groupExonInd];

          var exonGroupJxns = getJxnsFromSpan(data, curExon, exon);
          var boxplotData = computeBoxPlot(exonGroupJxns.slice());
          var Q = boxplotData.Q;

          // edge to show when an isoform is selected
          var x1 = (that.axis.getXPos(curExon[0]) + that.axis.getXPos(curExon[1])) / 2;
          var x2 = (that.axis.getXPos(exon[0]) + that.axis.getXPos(exon[1])) / 2;
          var y1 = jxnWrapperHeight + RNAMargin
          var y2 = yScaleContJxn(Q[2]);
          var polyLine = exonJxnGroup.append("polyline").attr({
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

          var boxPlotXPos = getBoxPlotXPos(curExonIdx, groupExonInd);
          var boxplotWithDots = exonJxnGroup.append("g").attr({
            "class": "boxplotWithDots",
            "sourceExonInd": curExonIdx,
            "targetExonInd": groupExonInd,
            "ActiveIsoform": -1,
            "ContainingExon": curExon,
            "GroupExon": exon,
            "minVal" : Q[0],
            "firstQuartile": Q[1],
            "secondQuartile": Q[2],
            "thirdQuartile": Q[3],
            "maxVal" : Q[4],
            "transform": "translate(" + boxPlotXPos + ",0)"
          })

          // expanded Box
          var axis = that.axis;
          var srcMid = (axis.getXPos(curExons[curExonIdx][0]) + axis.getXPos(curExons[curExonIdx][1])) / 2;
          var targetMid = (axis.getXPos(curExons[groupExonInd][0]) + axis.getXPos(curExons[groupExonInd][1])) / 2;
          var xShift = srcMid + (targetMid - srcMid - expandedWidth) / 2 - boxPlotXPos;
          boxplotWithDots.append("rect").attr({
            "class": "jxnContainer",
            "fill": "white",
            "vector-effect": "non-scaling-stroke",
            stroke: "black",
            "height": jxnWrapperHeight,
            "width": expandedWidth,
            "transform": "translate(" + xShift + ", 0)"
          }).style({
              "opacity": 0,
              "visibility": "hidden"
          }).on("click", function () {
            if (!showDotGroups)
              sortDots(data, this.parentNode);
          })

          boxplotWithDots.append("g").attr({
            "id": "subboxplots",
            "class": "subboxplots",
          })


          var boxplot = createBoxPlot(boxplotWithDots, "boxplot",boxplotData.whiskerDown, boxplotData.whiskerTop, Q);
          boxplot.select(".jxnBBox")
            .on('mouseover', function () {
            if (selectedIsoform < 0) {
              d3.select(this).style({"fill": hoveredEdgeColor})
              var srcExon = this.parentNode.parentNode.getAttribute("sourceExonInd");
              var targetExon = this.parentNode.parentNode.getAttribute("targetExonInd");
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
            if (selectedIsoform < 0) {
              d3.selectAll(".jxnBBox").style({"fill": "white"})
              d3.selectAll(".edgeConnector").filter(function () {
                return this.getAttribute("groupId") == "average" || this.getAttribute("groupId") == "RNA"
              }).style({"visibility": "hidden"});
            }
          }).on("dblclick", function () {
            var activeIsoform = this.parentNode.parentNode.getAttribute("ActiveIsoform");
            if (expandedIsoform >= 0 && activeIsoform == expandedIsoform) {
              collapseIsoform(expandedIsoform)
            }
            else if (activeIsoform >= 0) {
              expandIsoform(activeIsoform, data)
            }
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

    function createSubBoxPlots(parent, data, groups) {
      var transformation;
      var parentNode = d3.select(parent);
      parentNode.selectAll(".jxnContainer").each(function() {
          transformation = this.getAttribute("transform")
        })

      var effectiveWidth = getExpandJxnWidth() -  jxnBBoxWidth;
      var subplotsContainer = parentNode.select(".subboxplots");

      var curExon = curExons[parent.getAttribute("sourceExonInd")];
      var otherExon = curExons[parent.getAttribute("targetExonInd")];
      for (var gr = 0; gr < groups.length; gr++) {
        var jxns = []

        for (var sInd in groups[gr].samples) {
          var sample = groups[gr].samples[sInd];
          data.samples[sample]["jxns"].forEach(function(jxn, i) {
            if ((curExon[1] == jxn[0][0] && otherExon[0] == jxn[0][1]) ||
              (otherExon[1] == jxn[0][0] && curExon[0] == jxn[0][1])) {
              jxns.push(jxn[1]);
            }
          });
        }
        var boxplotData = computeBoxPlot(jxns);
        var xShift = jxnBBoxWidth / 2 + effectiveWidth * (gr + 1) / (groups.length + 1);
        var boxplot = createBoxPlot(subplotsContainer, "subboxplot",
          boxplotData.whiskerDown, boxplotData.whiskerTop, boxplotData.Q).attr({
          "transform": transformation +
          " translate(" + xShift + ", 0)"
        }).style({
            "opacity": 0
          });
        boxplot.selectAll(".jxnBBox").style({
          "fill" : groups[gr].color
        })
        boxplot.transition().duration(400).style({
            "opacity": 1
          });
        parentNode.selectAll(".jxnCircle").filter(function () {
          return groups[gr].samples.indexOf(this.getAttribute("data-sample")) >= 0
        }).transition().duration(400).attr({
          "cx": function(d, i) {
            return xShift
          },
          "transform" : transformation
        })

      }
    }

    function createBoxPlot(container, boxplotClass, whiskerDown, whiskerTop, Q) {
      var boxplot = container.append("g").attr({
        "class": boxplotClass
      });
      boxplot.append("line").attr({
        "class": "boxPlotLine",
        "stroke": "black",
        "stroke-dasharray": "5,5",
        "x1": 0,
        "x2": 0,
        "y1": yScaleContJxn(whiskerDown),
        "y2": yScaleContJxn(whiskerTop)
      })

      boxplot.append("rect").attr({
        "class": "jxnBBox",
        "fill": "white",
        stroke: "black",
        "height": Math.abs(yScaleContJxn(Q[3]) - yScaleContJxn(Q[1])),
        "width": jxnBBoxWidth,
        "transform": "translate(" + (-jxnBBoxWidth / 2) + "," + yScaleContJxn(Q[3]) + ")"
      })

      boxplot.append("line").attr({
        "class": "boxPlotQLine",
        "x1": -jxnBBoxWidth / 2,
        "x2": jxnBBoxWidth / 2,
        "y1": yScaleContJxn(Q[1]),
        "y2": yScaleContJxn(Q[1]),
        "stroke": "#666"
      })

      boxplot.append("line").attr({
        "class": "boxPlotQLine",
        "x1": -jxnBBoxWidth / 2,
        "x2": jxnBBoxWidth / 2,
        "y1": yScaleContJxn(Q[2]),
        "y2": yScaleContJxn(Q[2]),
        "stroke": "#666"
      })

      boxplot.append("line").attr({
        "class": "boxPlotQLine",
        "x1": -jxnBBoxWidth / 2,
        "x2": jxnBBoxWidth / 2,
        "y1": yScaleContJxn(Q[3]),
        "y2": yScaleContJxn(Q[3]),
        "stroke": "#666"
      })

      boxplot.append("line").attr({
        "class": "boxPlotQLine",
        "x1": - jxnBBoxWidth / 2,
        "x2": jxnBBoxWidth / 2,
        "y1": yScaleContJxn(whiskerTop),
        "y2": yScaleContJxn(whiskerTop),
        "stroke": "#666"
      })

      boxplot.append("line").attr({
        "class": "boxPlotQLine",
        "x1": - jxnBBoxWidth / 2,
        "x2": + jxnBBoxWidth / 2,
        "y1": yScaleContJxn(whiskerDown),
        "y2": yScaleContJxn(whiskerDown),
        "stroke": "#666"
      })

      return  boxplot;

    }

    function expandJxn(boxPlotGroup, callback) {

      var srcInd = boxPlotGroup.getAttribute("sourceExonInd");
      var targetInd = boxPlotGroup.getAttribute("targetExonInd");

      var minVal = boxPlotGroup.getAttribute("minVal");
      var maxVal = boxPlotGroup.getAttribute("maxVal");

      boxPlotGroup.parentNode.appendChild(boxPlotGroup);

      var parentNode = d3.select(boxPlotGroup);
      var transformation, containerWidth;
      parentNode.selectAll(".jxnContainer").style({"visibility": "visible"})
        .transition().duration(400).style({
        "opacity": 1,
        "visibility": "visible"
      }).each(function() {
          transformation = this.getAttribute("transform")
          containerWidth = this.getAttribute("width")
        }).each("end", callback);

      var boxplots = parentNode.selectAll(".boxplot");

      boxplots.transition().duration(400).attr({
        "transform": transformation,
      });
      boxplots.selectAll(".boxPlotQLine").
        style({"stroke-dasharray": "5,5"})
        .transition().duration(400).attr({"x2": containerWidth});


//      boxPlotGroup.selectAll(".boxPlotLine").style({
//        "visibility": "hidden"
//      });
    }

    function collapseJxn(parentNode, callback) {
      /*
      var xShift =  -jxnBBoxWidth / 2;
      var yShift = yScaleContJxn(boxPlotGroup.getAttribute("thirdQuartile"));
    .attr({
        "transform": "translate(" + xShift + ", " + yShift + ") scale(1, 1)"
      })
      */

      parentNode.selectAll(".jxnContainer").transition().duration(400).style({
        "opacity": 0,
      }).each("end", callback);


      var boxplots = parentNode.selectAll(".boxplot");

      parentNode.selectAll(".subboxplot").transition().duration(400).style({
        "opacity":0
      })
      .each("end", function() {
        d3.select(this).remove()
      })

      boxplots.transition().duration(400).attr({
        "transform": ""
      })
      boxplots.selectAll(".boxPlotQLine")
        .transition().duration(400).attr({"x2": jxnBBoxWidth / 2}).each("end", function() {
          d3.select(this).style({"stroke-dasharray": ""})
        });

      parentNode.selectAll(".jxnCircle").transition().duration(400).attr({
        "cx": 0,
        "transform": ""
      })
//      parentNode.transition().delay(400).selectAll(".boxPlotLine").style({
//        "visibility": "visible"
//      });

    }

  function expandIsoform(activeIsoform, data) {
    d3.selectAll(".boxplotWithDots").each(function () {
      if (this.getAttribute("ActiveIsoform") == activeIsoform) {
        expandJxn(this)
        if (showDotGroups) {

          var jxnGroup = d3.select(this);

          createSubBoxPlots(this, data, groups);

          jxnGroup.select(".subboxplots").transition()
            .duration(400).style({
              "opacity": 1
            })
        }
        else {
          sortDots(data, this)
        }
      }
    })
    expandedIsoform = activeIsoform;

  }

  function collapseIsoform(index, callback) {
      var selection = d3.selectAll(".boxplotWithDots").filter(function (d, i) {
        return (this.getAttribute("ActiveIsoform") == index);
      })
      var size = 0;
      selection.each(function() { size++; });
      selection.each(function (d, i) {
        var parentNode = d3.select(this)

        collapseJxn(parentNode, function () {
          parentNode.selectAll(".jxnContainer").style({
            "visibility": "hidden",
          })
          if ((i == size - 1)&& callback)
            callback()
        })
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
      return jxnWidth - 4 * isoformEdgePadding - jxnBBoxWidth;
    }

    function selectIsoform(index) {
      if (index == -1){
        d3.selectAll(".JXNAreaConnector, .jxnWrapperBox, .miniExonBox, .miniExonEdge").
          transition().duration(200).style({
            "opacity" : 1
          })
        jxnArea.selectAll(".isoformEdge").style({"visibility":  "hidden"});

        d3.selectAll(".boxplotWithDots").attr({
          "ActiveIsoform" : -1
        }).style({
          "opacity" : "1"
        })

        jxnArea.selectAll(".jxnBBox").transition().duration(200).style({
          "fill" : "white"
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
          this.setAttribute("ActiveIsoform", index);
          var srcExon = curExons[srcExonInd ]
          var targetExon= curExons[targetExonInd]
          var ind = isoform.exons.indexOf(srcExon);
          var groupNode = d3.select(this);
          if (ind >= 0 && (ind < isoform.exons.length - 1) && isoform.exons[ind + 1] == targetExon) {
            groupNode.transition().duration(300).style({
              "opacity" : "1"
            })
            groupNode.selectAll(".jxnBBox").transition().duration(300).style({
              "stroke": "black"
            })

            jxnArea.selectAll(".isoformEdge").filter(function() {
              return this.getAttribute("startExonInd") == srcExonInd
                && this.getAttribute("endExonInd") ==  targetExonInd
            }).style({"visibility":  "visible"});
          }
          else {
            this.setAttribute("ActiveIsoform", -1);
            groupNode.transition().duration(300).style({
              "opacity": "0.1"
            })
            jxnArea.selectAll(".isoformEdge").filter(function () {
              return this.getAttribute("startExonInd") == srcExonInd
                && this.getAttribute("endExonInd") == targetExonInd
            }).style({"visibility": "hidden"});
          }
        })
      }
      selectedIsoform = index;
    }

    function sortDots(data, parentNode) {

      var isoformInd = parentNode.getAttribute("ActiveIsoform");

      var srcExonInd = parentNode.getAttribute("sourceExonInd");
      var targetExonInd = parentNode.getAttribute("targetExonInd");

      var activeJxnWeights = getJxnsFromSpan(data, curExons[srcExonInd], curExons[targetExonInd])

      var indices = [];
      for (var i = 0; i < activeJxnWeights.length; ++i) indices.push(i);
        indices.sort(function (a, b) { return activeJxnWeights[a] < activeJxnWeights[b] ? -1 : 1; });

      var effectiveWidth = getExpandJxnWidth() - 3 * dotRadius - jxnBBoxWidth;

      d3.selectAll(".boxplotWithDots").filter(function() {
        return this.getAttribute("ActiveIsoform") == isoformInd;
      }).each(function() {

        var thisNode = d3.select(this);
        var transformation;
        thisNode.selectAll(".jxnContainer").each(function()
        {transformation = this.getAttribute("transform")});

        var srcExonInd = this.getAttribute("sourceExonInd");
        var targetExonInd = this.getAttribute("targetExonInd");

        xJxnBoxScale.domain([0, samples.length - 1]).range([jxnBBoxWidth + 3 * dotRadius, effectiveWidth])

        thisNode.selectAll(".jxnCircle").transition().duration(400).attr({
          "cx": function(d, i) {
            return xJxnBoxScale(indices[i])
          },
          "transform" : transformation
        })

/*        var axis = that.axis;
        var srcMid = (axis.getXPos(curExons[srcExonInd][0]) + axis.getXPos(curExons[srcExonInd][1])) / 2;
        var targetMid = (axis.getXPos(curExons[targetExonInd][0]) + axis.getXPos(curExons[targetExonInd][1])) / 2;
        var plotMid = (srcMid + targetMid) / 2;



 */
      })
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
