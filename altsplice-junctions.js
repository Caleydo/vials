/**
 * Created by Bilal Alsallakh 02/01/14
 * Based on work by Joseph Botros
 */

/**
 * Isoform + Frequency Visualization
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
    width = 800 - margin.left - margin.right,
    height = 2000 - margin.top - margin.bottom;
  var dotRadius = 4;
  var defaultDotColor = "rgba(0,0,0,0.6)";
  var dehighlightedDotColor = "rgba(0,0,0,0.2)";
  var highlightedDotColor = "red";
  var weightAxisCaptionWidth = 25;

  var jxnWrapperPadding = 15;
  var jxnWrapperHeight = 300;
  var miniExonSpacing = 5;
  var miniExonHeight = 7;
  var jxnCircleRadius = 5;
  var hoveredEdgeColor = "orange";
  var jxnBBoxWidth = jxnCircleRadius * 3;

  var curGene;
  var curRNAs;
  var curExons;

  var serverOffset;
  var geneData;

  var startPosDiv;
  var chromIDDiv;
  var baseWidthInputDiv;

  var show_introns = false;
  var jxnArea;
  var cellRadius = 14;
  var cellMargin = 2;
  var cellWidth = cellRadius*2 + cellMargin;


  GenomeVis.prototype.build = function ($parent) {
    serverOffset = this.data.serveradress;

    var that = this;
    that.axis = that.data.genomeAxis;
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
        "top":"50px",
        "left":"20px",
        "position":"absolute"

      })
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var exploreArea = svg.append("g").attr("transform", "translate(20, 80)");
    jxnArea = exploreArea.append("g").attr("id", "jxnArea");



    var getAxisRanges = function(curExons, startPosVal, baseWidth) {
      if (show_introns) {
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

    function getStartPos()  {return parseInt($(startPosDiv.node()).val())}
    function getCromID ()  {return $(chromIDDiv.node()).val()}
    function getBaseWidth ()  {return  parseInt($(baseWidthInputDiv.node()).val())}

    var updateVisualization = function() {
      startPos = getStartPos()
      chromID =getCromID ()
      baseWidth =getBaseWidth ()
      //geneName     = $(geneSelector.node()).val()


      curGene = getCurGene(startPos, baseWidth);
      curRNAs = getCurRNAs(curGene, startPos, baseWidth);
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
        var RNAArea = jxnArea.selectAll("#RNAArea").data(["foo"])
        RNAArea.exit().remove();
        RNAArea.enter().append("g").attr({
          "id": "RNAArea",
          "transform": "translate(0," + (jxnWrapperHeight+RNAMargin) + ")"
        });
        sad = curRNAs;
        drawRNA(curRNAs.reduce(function(memo, num) {
            if (memo.length > num.length) {return memo}
            else {return num}
          }),
          RNAArea, that.axis, RNAHeight, RNAMargin);

        drawJxns(sampleData);

      });
      //// should trigger a cache hit
      //that.data.getSamples(chromID,startPos,baseWidth);

    }




    function drawRNA(RNA, area, axis, RNAHeight, RNAMargin) {

      var RNAArea = area.append("g").attr({
        "class": "RNA"
      })

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
          var x3 = getWrapperStartX(i) + getWrapperOriginPoint(i) + miniExonWidth() / 2;
          var x4 = getWrapperStartX(i) + getWrapperOriginPoint(i) - miniExonWidth() / 2;
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
            "x1": x1,
            "x2": x2,
            "y1": y1,
            "y2": y2,
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

    function jxnWrapperWidth() {
      return (width - weightAxisCaptionWidth - (curExons.length + 1) * jxnWrapperPadding) / curExons.length
    }

    function miniExonWidth() {
      return (jxnWrapperWidth() - (curExons.length + 1) * miniExonSpacing) / curExons.length;
    }

    function getWrapperOriginPoint(exonIndex) {
      return jxnWrapperWidth()*(exonIndex + 0.5)/curExons.length
    }

    function getWrapperStartX(i) {
      return i*(jxnWrapperWidth()+jxnWrapperPadding) + jxnWrapperPadding + weightAxisCaptionWidth;
    }

    function getJxnGroupX(i) {
      return i*(miniExonSpacing+miniExonWidth())+miniExonSpacing
    }



    function drawJxns(data) {

      var maxJxnReads = 0;
      for (sample in data.samples) {
        maxJxnReads = Math.max(data.samples[sample]["jxns"].reduce(function(a, b) {return Math.max(a, b[1])}, 0), maxJxnReads);
      }

      var exonWeightsAreaHeight = jxnWrapperHeight - 4 * miniExonHeight;

      var yScaleContJxn = d3.scale.linear().domain([0, maxJxnReads]).range([exonWeightsAreaHeight- jxnCircleRadius, 2 * jxnCircleRadius]);
      var yAxisJxn = d3.svg.axis()
        .orient("left")
        .scale(yScaleContJxn);
      var jxnWrappers = jxnArea.selectAll(".jxnWrapper").data(curExons);
      jxnWrappers.exit().remove();
      var jxnWrappersEnter = jxnWrappers.enter().append("g").attr({
        "class": "jxnWrapper",
        "transform": function(exon, i) {return "translate("+ getWrapperStartX(i)+",0)"}
      });

      function getExonIdx(exon) {
        var idx;
        curExons.forEach(function(curExon, i) {if (curExon[0] == exon[0] && curExon[1] == exon[1]) {idx = i}});
        return idx;
      }

      jxnWrappersEnter.append("rect").attr({
        "class": "jxnWrapperBox prev",
        "fill": "#aaa",
        "width": function(exon) {return jxnWrapperWidth()*(getExonIdx(exon)+ 0.5)/curExons.length},
        "height": jxnWrapperHeight
      })

      jxnWrappersEnter.append("rect").attr({
        "class": "jxnWrapperBox next",
        "fill": "#ccc",
        "height": jxnWrapperHeight,
        "width": function(exon) {return jxnWrapperWidth()*(curExons.length - getExonIdx(exon)- 0.5)/curExons.length},
        "transform": function(exon) {return "translate("+ getWrapperOriginPoint(getExonIdx(exon))+",0)"}
      })
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


      function getJxn(sample, curExon, otherExon) {
        var retVal;
        data.samples[sample]["jxns"].some(function(jxn, i) {
          if ((curExon[1] == jxn[0][0] && otherExon[0] == jxn[0][1]) ||
            (otherExon[1] == jxn[0][0] && curExon[0] == jxn[0][1])) {
            retVal = jxn[1];
            return true;
          }
        });
        return retVal;
      }

      jxnWrappers.each(function(curExon, curExonIdx) {
        var jxnWrapper = d3.select(this);
        var exonJxnGroups = jxnWrapper.selectAll(".exonJxnGroup").data(curExons, function(exon) {return exon});

        var definingExonX = (curExonIdx + 0.5) * (miniExonSpacing+miniExonWidth());

        exonJxnGroups.exit().remove();
        var exonJxnGroupsEnter = exonJxnGroups.enter().append("g").attr({
          "class": function(exon, i) {return "exonJxnGroup" + (i == curExonIdx ? " curExon" : "")},
          "transform": function(exon, i) {
            var xShift = getJxnGroupX(i);

            return "translate("+ xShift + ", 0)"
          }
        })

        exonJxnGroupsEnter.append("rect").attr({
          "class": "miniExonBox",
          "width": miniExonWidth(),
          "height": miniExonHeight,
          "stroke": "black",
          "fill": "black", // function(exon, i) {return i == curExonIdx ? "white" : "black"},
          "transform": function(exon, i) {
            var shiftY = jxnWrapperHeight - miniExonHeight;
            if (i != curExonIdx)
              shiftY -= 3 * miniExonHeight;
            return "translate(0,"+ shiftY +")"
          }
        })

        exonJxnGroupsEnter.append("line").attr({
          "class": "miniExonEdge",
          "stroke": "black",
          "x1": function(exon, i) {
            if (i == curExonIdx) return 0;
            var origin = i * (miniExonSpacing + miniExonWidth()) + miniExonSpacing;
            return definingExonX - origin;
          },
          "x2": function(exon, i) {return (i == curExonIdx) ? 0 : miniExonWidth()/2},
          "y1":function(exon, i) {return (i == curExonIdx) ? 0 : jxnWrapperHeight - miniExonHeight},
          "y2": function(exon, i) {return (i == curExonIdx) ? 0 : exonWeightsAreaHeight + miniExonHeight}
        })


        exonJxnGroups.selectAll(".miniExonBox").attr({
          "width": miniExonWidth()
        })

        jxnWrapper.selectAll(".exonJxnGroup:not(.curExon)")
          .each(function(exon) {
            var groupExonInd = getExonIdx(exon);
            var exonJxnGroup = d3.select(this);
            var exonGroupJxns = getJxnsFromSpan(curExon, exon);
            var sortedJxns = exonGroupJxns.slice().sort(d3.ascending);
            var firstQuartile = d3.quantile(sortedJxns, 0.25);
            var secondQuartile = d3.quantile(sortedJxns, 0.5);
            var thirdQuartile = d3.quantile(sortedJxns, 0.75);
            var iqr = 1.5 * (thirdQuartile - firstQuartile);
            var whiskerTop, whiskerDown;
            {
              var i = -1;
              var j = sortedJxns.length;
              while ((sortedJxns[++i] < firstQuartile - iqr));
              while (sortedJxns[--j] > thirdQuartile + iqr);
              whiskerTop =  j == sortedJxns.length - 1 ? sortedJxns[j] : thirdQuartile + iqr;
              whiskerDown = i == 0 ? sortedJxns[i] : firstQuartile - iqr;
            }

            exonJxnGroup.append("line").attr({
              "class": "exonRefLine",
              "stroke": "black",
              "stroke-dasharray":  "5,5",
              "x1": miniExonWidth()/2,
              "x2": miniExonWidth()/2,
              "y1": yScaleContJxn(whiskerDown),
              "y2": yScaleContJxn(whiskerTop)
            })

            exonJxnGroup.append("rect").attr({
              "ContainingExon": curExon,
              "GroupExon": exon,
              "class": "jxnBBox",
              "fill": "white",
              "height": Math.abs(yScaleContJxn(thirdQuartile) - yScaleContJxn(firstQuartile)),
              "width": jxnBBoxWidth,
              "transform": "translate("+(miniExonWidth() - jxnBBoxWidth)/2+","
              +yScaleContJxn(thirdQuartile)+")"
            }).on('mouseover', function() {
              d3.select(this).attr({"fill": hoveredEdgeColor})

              d3.selectAll(".jxnBBox").filter(function() {
                if (this.getAttribute("GroupExon") == curExon
                  && this.getAttribute("ContainingExon") == exon)
                  d3.select(this).attr({"fill": hoveredEdgeColor})
              });

              d3.selectAll(".edgeConnector").filter(function() {
                if ((this.getAttribute("groupId") == "average" || this.getAttribute("groupId") == "RNA")
                  && this.getAttribute("startExonInd") == d3.min([groupExonInd, curExonIdx])
                  && this.getAttribute("endExonInd") ==  d3.max([groupExonInd, curExonIdx])) {
                  return true;
                }
                return false;
              }).style({"visibility":  "visible"});

            }).on('mouseout', function() {
              d3.selectAll(".jxnBBox").attr({"fill": "white"})
              d3.selectAll(".edgeConnector").filter(function() {
                return this.getAttribute("groupId") == "average" || this.getAttribute("groupId") == "RNA"
              }).style({"visibility": "hidden"});
            })


            exonJxnGroup.append("line").attr({
              "x1": (miniExonWidth() - jxnBBoxWidth)/2,
              "x2": (miniExonWidth() + jxnBBoxWidth)/2,
              "y1": yScaleContJxn(secondQuartile),
              "y2": yScaleContJxn(secondQuartile),
              "stroke": "#666"
            })

            exonJxnGroup.append("line").attr({
              "x1": (miniExonWidth() - jxnBBoxWidth)/2,
              "x2": (miniExonWidth() + jxnBBoxWidth)/2,
              "y1": yScaleContJxn(whiskerTop),
              "y2": yScaleContJxn(whiskerTop),
              "stroke": "#666"
            })

            exonJxnGroup.append("line").attr({
              "x1": (miniExonWidth() - jxnBBoxWidth)/2,
              "x2": (miniExonWidth() + jxnBBoxWidth)/2,
              "y1": yScaleContJxn(whiskerDown),
              "y2": yScaleContJxn(whiskerDown),
              "stroke": "#666"
            })

            var jxnCircles = d3.select(this)
              .selectAll(".jxnCircle")
              .data(exonGroupJxns)
            jxnCircles.exit().remove();
            jxnCircles.enter().append("circle").attr({
              "class": "jxnCircle",
              "data-sample": function(d, i) {return samples[i]},
              "r": jxnCircleRadius,
              "cx": miniExonWidth()/2,
              "cy": function(d) {return yScaleContJxn(d)},
              "fill": function(d, i) {return defaultDotColor}
            });

            jxnCircles.on('mouseover', function(val, nodeInd) {
              var hoveredSample = this.getAttribute("data-sample");
//              d3.selectAll(".sampleDotConnectors").style({
//                "visibility": function (d) {
//                 return hoveredSample == d ? "visible" : "hidden";
//                }
//              });

              d3.selectAll('.jxnCircle').style('fill', function (val2, nodeInd2) {
                var sample = this.getAttribute("data-sample");
                return (sample == hoveredSample) ? highlightedDotColor : dehighlightedDotColor;
              });

              d3.selectAll(".edgeConnector").filter(function(d) {
                if ((hoveredSample == d) || (this.getAttribute("groupId") == "RNA"
                  && this.getAttribute("startExonInd") == d3.min([groupExonInd, curExonIdx])
                  && this.getAttribute("endExonInd") ==  d3.max([groupExonInd, curExonIdx]))) {
                  return true;
                }
                return false;
              }).style({"visibility":  "visible"});

            }).on('mouseout', function(val, dotInd, plotInd) {
              d3.selectAll('.jxnCircle')
                .transition()
                .duration(100)
                .style('fill', defaultDotColor);
              d3.selectAll(".sampleDotConnectors").style({"visibility":  "hidden"});
              d3.selectAll(".edgeConnector").style({"visibility": "hidden"});

            });

            jxnCircles.append("svg:title")
              .text(function(d, i) {
                return samples[i] + ": " + d;
              });
          })
      });

      var dotConnector = jxnArea.selectAll(".sampleDotConnectors").data(samples).enter().append("g").attr({
        "class": "sampleDotConnectors",
        "transform": "translate(0, 0)"
      }).style({
        "visibility": "visible"
      });



      dotConnector.each(function(sample) {
        createLineConnectors(
          sample,
          d3.select(this),
          function(i, j) {
            var w = getJxn(sample, curExons[i], curExons[j])
            return yScaleContJxn(w);
          },
          + miniExonWidth()/2,
          + miniExonWidth()/2,
          "#666"
        );
      });

      var averageConnectors = jxnArea.append("g").style({
        "visibility": "hidden"
      });
      createLineConnectors(
        "average",
        averageConnectors,
        function(i, j) {
          w = d3.median(getJxnsFromSpan(curExons[i], curExons[j]))
          return yScaleContJxn(w)
        },
        miniExonWidth()/2 + 3 * jxnCircleRadius / 2,
        miniExonWidth()/2 - 3 * jxnCircleRadius / 2,
        hoveredEdgeColor
      );

      function createLineConnectors(groupId, connectorGroup, yPosition, x1Shift, x2Shift, stroke) {
        for (var i = 0; i < curExons.length - 1; i++) {
          for (var j = i + 1; j < curExons.length; j++) {
            var y = yPosition(i, j);
            connectorGroup.append("line").attr({
              "groupId": groupId,
              "startExonInd": i,
              "endExonInd": j,
              "x1": getWrapperStartX(i) + getJxnGroupX(j) + x1Shift,
              "x2": getWrapperStartX(j)+ getJxnGroupX(i)+ x2Shift,
              "y1": y,
              "y2": y,
              "class": "edgeConnector",
              "stroke": stroke,
              "stroke-width":2
            }).style({
              "visibility": "hidden"
            });
          }
        }
      }


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

      var $inputOuterDiv = container.append("div").style({
        "top":"10px",
        "left":"20px",
        "width":"600px",
        "position":"absolute"
      })

      var $queryDiv = $inputOuterDiv.append("div").text("Chromosome ID:");

      var $geneDiv = $inputOuterDiv.append("div");

      var geneSelector = $inputOuterDiv.append("select");

      chromIDDiv = $queryDiv.append("input").attr({
        type: "text",
        value: "chr17"
      })

      var $queryDiv = $inputOuterDiv.append("div").text("startpos:");

      startPosDiv = $queryDiv.append("input").attr({
        type:"text",
        value:"1"
      })


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

      $baseWidthDiv = $inputOuterDiv.append("div").text("zoom:");

      baseWidthInputDiv = $baseWidthDiv.append("input").attr({
        type:"text",
        value:"1500"
      }).attr("style", "display: none");

      var zoomInButton = $baseWidthDiv.append("button").attr({
        type:"button",
        class:"btn"
      }).text("+")

      var zoomOutButton = $baseWidthDiv.append("button").attr({
        type:"button",
        class:"btn"
      }).text("-")

      that.data.getAllGenes().then( function(genes) {
        geneData = genes;
        for (var gene in genes) {
          geneSelector.append("option").attr('value', gene).text(gene);
        }
        populateGeneData($(geneSelector.node()).val());
      });

      geneSelector.on({
        "change": function(gene){populateGeneData(gene)}
      })

      function populateGeneData(gene) {
        $(chromIDDiv.node()).val(geneData[gene].chromID);
        $(startPosDiv.node()).val(geneData[gene].tx_start);
        updateVisualization();
      }

      // connect the buttons with action !!
      requestButton.on({
        "click":function(d){updateVisualization(); }
      })
      forwardButton.on({
        "click":function(d){
          var v = +$(startPos.node()).val();
          var w = +$(baseWidthInput.node()).val();
          $(startPos.node()).val(v+Math.round(w/4));

          updateVisualization();
        }
      })
      backwardButton.on({
        "click":function(d){
          var v = +$(startPos.node()).val();
          var w = +$(baseWidthInput.node()).val();
          $(startPos.node()).val(Math.max(v-Math.round(w/4), 1));

          updateVisualization();
        }
      })

      zoomOutButton.on({
        "click":function(d){
          var newWidth = +Math.round($(baseWidthInput.node()).val() * 2);
          $(baseWidthInput.node()).val(newWidth);
          backwardButton.text("-" + Math.round(newWidth/4))
          forwardButton.text("+" + Math.round(newWidth/4))

          updateVisualization();
        }
      })

      zoomInButton.on({
        "click":function(d){
          var newWidth = +Math.round($(baseWidthInput.node()).val() / 2);
          if (newWidth > 0) {
            $(baseWidthInput.node()).val(newWidth);
            backwardButton.text("-" + Math.round(newWidth/4))
            forwardButton.text("+" + Math.round(newWidth/4))

            updateVisualization();
          }
        }
      })


    }


    updateVisualization();
    return head.node();
  };

  exports.GenomeVis = GenomeVis;
  exports.create = create;
});
