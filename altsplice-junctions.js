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
    width = 1050 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;
  var dotRadius = 4;
  var defaultDotColor = "rgba(0,0,0,0.6)";
  var dehighlightedDotColor = "rgba(0,0,0,0.2)";
  var highlightedDotColor = "red";
  var weightAxisCaptionWidth = 25;
  var exonWeightsAreaHeight;
  var jxnWrapperPadding = 6;
  var jxnWrapperHeight = 250;
  var miniExonSpacing = 10;
  var miniExonHeight = 7;
  var jxnCircleRadius = 5;
  var hoveredEdgeColor = "orange";
  var jxnBBoxWidth = jxnCircleRadius * 2.5;

  var RNAHeight = 80;
  var RNAMargin = 50;
  var isoformEdgePadding = 9;

  var curGene;
  var curRNAs;
  var curExons;
  var expandedIsoform = -1;
  var selectedIsoform = -1;

  var serverOffset;
  var geneData;


  var jxnsData;
  var jxnGroups = [];
  var edgeCount;
  var RNAScale;
  var startCoord;
  var endCoord;
  var buckets;


  var jxnArea;
  var yScaleContJxn;
  var xJxnBoxScale = d3.scale.linear();
  var cellRadius = 14;
  var cellMargin = 2;
  var cellWidth = cellRadius*2 + cellMargin;
  var showDotGroups = false;
/*  var groups = [{"samples": ["heartWT1", "heartWT2"], "color": "#a6cee3"},
    {"samples": ["heartKOa", "heartKOb"], "color": "#b2df8a"}]; */
  var groups = [];

  var groupColors = [
    "#a6cee3",
    "#1f78b4",
    "#b2df8a",
    "#33a02c",
    "#fb9a99",
    "#e31a1cv",
    "#fdbf6f",
    "#ff7f00",
    "#cab2d6",
    "#6a3d9a",

  ];

    GenomeVis.prototype.build = function ($parent) {
    serverOffset = this.data.serveradress;

    var that = this;
    that.axis = that.data.genomeAxis;

    var sampleDataSet;

    var viewOptionsDiv = $parent.append("div").style({
      "left": "20px"
    });

    $('<input />', { type: 'checkbox', id: 'cb', value: "showGroups" }).appendTo(viewOptionsDiv);
    $('<label />', { 'for': 'cb', text: "Show groups" }).appendTo(viewOptionsDiv);
    $('#cb').change(function() {
      showDotGroups = $(this).is(":checked")
      if (expandedIsoform >= 0) {
        expandIsoform(expandedIsoform, sampleDataSet);
      }
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

    event.on("GroupingChanged", function(ev,data){
      groups = []
      var otherSamples = []
        for (var i = 0; i < data.collections.length; i++) {
          var col = data.collections[i]
          if (col.samples.length > 1) {
            groups.push({"samples": col.samples, "color": groupColors[i]})
          }
          else {
            otherSamples.push(col.samples[0])
          }
        }
      if (groups.length > 0) {
        if (otherSamples.length > 0)
          groups.push({"samples": otherSamples, "color": "gray"})
      }
      if ((expandedIsoform >= 0) && showDotGroups) {
        createGroups(expandedIsoform, sampleDataSet);
      }
    });


    var head = $parent.append("div").attr({
      "class":"gv"
    })

    // SETUP THE GUI Controls
    // createGenDefControls(head);

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

    var exploreArea = svg.append("g").attr("transform", "translate(20, 20)").attr("id","exploreArea");
    jxnArea = exploreArea.append("g").attr("id", "jxnArea");



    function updateVisualization() {
      var startPos = gui.current.getStartPos();
      var baseWidth =gui.current.getBaseWidth();

      curGene = gui.current.getSelectedGene();
      var curProject = gui.current.getSelectedProject();
//      curRNAs = getCurRNAs(curGene, startPos, baseWidth);
//
//      //curRNAs.forEach(function (rna, index) {
//      //  var span = curRNAs[0].RNASpan;
//      //  isoformSelector.append("option").text("isoform" + index);
//      //});
//
//      curExons = getCurExons(curRNAs);
//
//
//      // ==========================
//      // BIND DATA TO VISUALIZATION
//      // ==========================
//
//        that.data.getSamples(curGene,startPos,baseWidth).then(function(sampleData) {
//
//          sampleDataSet = sampleData;
//
//          // that.data.getTestSamples("pileup ENSG00000150782.json").then(function(sampleData) {
//    /*      samples = d3.keys(sampleData.samples);
//          var geneInfo = sampleData["geneInfo"];
//          that.axis.update(geneInfo,
//            startPos || geneInfo["geneSpan"][0],
//            baseWidth || (geneInfo["geneSpan"][1] - geneInfo["geneSpan"][0] + 1));
//*/
//
////          drawJxnsLegend();
//
//
//
//        })

      //console.log("ppp", curProject, curGene );
      that.data.getGeneData(curProject, curGene).then(function(sampleData) {

        jxnsData = sampleData.measures.jxns;

        // TODO: Hen: workaround for missing update cycle
        jxnArea.remove();
        jxnArea = d3.select("#exploreArea").append("g").attr("id", "jxnArea");


        computeJxnGroups();
        drawJxnAxis();

        var RNAArea = jxnArea.append("g").attr({
          "id": "RNAArea",
          "transform": "translate(0," + (jxnWrapperHeight+RNAMargin) + ")"
        });
        startCoord = d3.min(jxnsData.all_starts);
        endCoord = d3.max(jxnsData.all_ends);
        RNAScale = d3.scale.linear().domain([startCoord, endCoord]).range([10, width - 5]);

        drawRNA(RNAArea, RNAScale, RNAHeight, RNAMargin);

        // drawJxns(overlay, sampleData)

        drawJxns(jxnArea.append("g"));

      })
        /* drawRNA(curRNAs.reduce(function(memo, num) {
            if (memo.length > num.length) {return memo}
            else {return num}
          }),
          RNAArea, that.axis, RNAHeight, RNAMargin);
*/
      //// should trigger a cache hit
      //that.data.getSamples(chromID,startPos,baseWidth);
    }

    function drawJxnAxis() {

      var maxJxnReads = 0;
      for (var i = 0; i < jxnsData.weights.length; i++) {
        maxJxnReads = Math.max(jxnsData.weights[i].weight, maxJxnReads);
      }
      exonWeightsAreaHeight = jxnWrapperHeight - miniExonHeight; // the lower part is the mini exon legend
      yScaleContJxn = d3.scale.linear()
        .domain([0, maxJxnReads])
        .range([exonWeightsAreaHeight- jxnCircleRadius, 2 * jxnCircleRadius]);
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
        .text("Junction Reads")
        .attr("transform", "rotate(-90, " + (-weightAxisCaptionWidth - 10) + " " + exonWeightsAreaHeight / 2 + ")");
    }

    function computeJxnGroups() {
      jxnsData.weights.sort(function (a, b) { return a.start < b.start ? -1 :
        a.start > b.start ? 1 :
          a.end < b.end ? - 1 : 1;
      });

      var ind = 0;
      edgeCount = 0;
      var prevStart = ind;
      var prevEnd = ind;
      var startLoc = jxnsData.weights[ind].start;
      var endLoc = jxnsData.weights[ind].end;
      var subGroups = [];
      for (ind = 1; ind < jxnsData.weights.length; ind++) {

        var startLoc2 = jxnsData.weights[ind].start;
        var endLoc2 = jxnsData.weights[ind].end;

        if (startLoc2 > startLoc || endLoc2 > endLoc) {
          subGroups.push({"start":prevEnd, "end":ind - 1, "startLoc" : startLoc, "endLoc": endLoc})
          edgeCount++;
          endLoc = endLoc2;
          prevEnd = ind;
        }
        if (startLoc2 > startLoc) {
          jxnGroups.push({"start":prevStart, "end":ind - 1, "groups": subGroups});
          subGroups = [];
          startLoc = startLoc2;
          prevStart = ind;
        }
//        console.log("Whole Gruoup: (" + startLoc + " " + startInd + " - " + ind)
      }
      subGroups.push({"start":prevEnd, "end":ind - 1, "startLoc" : startLoc, "endLoc": endLoc})
      jxnGroups.push({"start":prevStart, "end":ind - 1, "groups": subGroups});

    }

    function drawJxns(container) {

      var groupWidth =  (width - 2 * weightAxisCaptionWidth - jxnWrapperPadding * jxnGroups.length) / edgeCount;

      var linesGroup = jxnArea.append("g").style({
        "visibility": "visible"
      })

      var startX = weightAxisCaptionWidth + jxnWrapperPadding;
      for (var jxnGpInd = 0; jxnGpInd < jxnGroups.length; jxnGpInd++) {

        var jxnGroup = jxnGroups[jxnGpInd];

        var jxnGroupWrapper = jxnArea.append("g").attr({
          "class": "jxnWrapperBox",
          "transform": "translate(" + startX + ", 0)"
        });

        var wrapperWidth = groupWidth * jxnGroup.groups.length;
        jxnGroupWrapper.append("rect").attr({
          "class": "jxnWrapperBox",
          "fill": "#ccc",
          "height": jxnWrapperHeight,
          "width": function(d, i) {
            return wrapperWidth
          }
        })

        var edgeGroups = jxnGroupWrapper.selectAll(".edgeGroup").data(jxnGroup.groups).enter().append("g").attr({
          "class": "edgeGroup",
          "transform": function(d, i) {
            return "translate(" + groupWidth * i + ", 0)"
          }
        });

        /*
        edgeGroups.append("polyline").attr({
          "class": "miniAcceptorSites",
          "fill": "white",
          "stroke": "black",
          "points": function () {
            var xMid = groupWidth / 2;
            return [
              xMid, jxnWrapperHeight - 12,
              xMid - 5, jxnWrapperHeight - 2,
              xMid + 5, jxnWrapperHeight - 2,
              xMid, jxnWrapperHeight - 12,
            ]
          }
        }).on('mouseover', function (val, nodeInd) {
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

        }); */


        edgeGroups.each(function(group, groupInd) {
          var dotsGroup = d3.select(this).append("g");
          /*
          jxnArea.append("polyline").attr({
            "groupId": "RNA",
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
          });
          var lineData = [ { "x": x1,   "y": y1},  { "x": x1,  "y": y2},
                           { "x": x2,  "y": y2}, { "x": x2,  "y": y1 + 10 }];
          var lineFunction = d3.svg.line()
                                   .x(function(d) { return d.x; })
                                   .y(function(d) { return d.y; })
                                   .interpolate("basis");
          var lineGraph = jxnArea.append("path")
                                      .attr("d", lineFunction(lineData))
                                      .attr("stroke", "black")
                                      .attr("fill", "none");
           */
          var y1 = jxnWrapperHeight + RNAMargin + RNAHeight/2;
          var y2 = y1 + 2 * RNAMargin;
          var acceptorLoc = group.endLoc;
          var acceptorX;
          for (var i = 0; i < buckets.length; i++) {
            if (buckets[i].type == "receptor"  && buckets[i].loc == acceptorLoc)
              acceptorX = buckets[i].xEnd;
          }
          var donorY = jxnWrapperHeight + RNAMargin + RNAHeight/2 - 5;
          var RNA_Y = jxnWrapperHeight + RNAMargin + RNAHeight;

          linesGroup.append("line").attr({
            "x1": startX + (groupInd + 0.5) * groupWidth,
            "x2": acceptorX,
            "y1": jxnWrapperHeight,
            "y2": donorY,
            "class": "edgeConnector",
            "stroke": "red"
          });

          for (var ind = group.start; ind <= group.end; ind++) {
            var jxnData = jxnsData.weights[ind];
            var jxnCircle = dotsGroup.append("circle").attr({
              "class": "jxnCircle",
              "sourceExonInd": jxnData.start,
              "targetExonInd": jxnData.end,
              "data-sample": jxnData.sample,
              "r": jxnCircleRadius,
              "cx": groupWidth / 2,
              "cy": yScaleContJxn(jxnData.weight),
              "fill": function (d, i) {
                return defaultDotColor
              }
            })
            jxnCircle.on('mouseover', function () {
              var hoveredSample = this.getAttribute("data-sample");
              d3.selectAll('.jxnCircle').style('fill', function () {
                var sample = this.getAttribute("data-sample");
                return (sample == hoveredSample) ? highlightedDotColor : dehighlightedDotColor;
              });
            }).on('mouseout', function (val, dotInd, plotInd) {
              d3.selectAll('.jxnCircle')
                .transition()
                .duration(100)
                .style('fill', defaultDotColor);

            });

            jxnCircle.append("svg:title")
              .text(function (d, i) {
                return jxnData.sample + ": " + jxnData.weight + " (" + jxnData.start + " - " + jxnData.end + ")";
              });

          }

        })


        var donorLoc = jxnsData.weights[jxnGroup.start].start;
        var donorX;
        for (var i = 0; i < buckets.length; i++) {
          if (buckets[i].type == "donor"  && buckets[i].loc == donorLoc)
            donorX = buckets[i].xStart;
        }
        var donorXonRNA = RNAScale(donorLoc);
        var donorY = jxnWrapperHeight + RNAMargin + RNAHeight/2 - 5;
        var RNA_Y = jxnWrapperHeight + RNAMargin + RNAHeight;
        jxnArea.append("polygon").attr({
          "points" : [
              startX +1, jxnWrapperHeight,
              startX + wrapperWidth -1, jxnWrapperHeight,
              donorX, donorY,
              donorX , donorY
            ],
          "class": "JXNAreaConnector",
          "stroke": "#ccc",
          "fill":"#ccc"
        })
        /*
        var lineFunction = d3.svg.line()
          .x(function(d) { return d.x; })
          .y(function(d) { return d.y; })
          .interpolate("linear");
        jxnArea.append("path")
          .attr("d", lineFunction([
            { "x": startX + wrapperWidth,   "y": jxnWrapperHeight},
//            { "x": startX+ wrapperWidth /3,   "y": jxnWrapperHeight},
            { "x": startX,   "y": jxnWrapperHeight},
//            { "x": startX,   "y": jxnWrapperHeight + 10},
            { "x": donorX,  "y": donorY},
//            { "x": donorX,  "y": donorY + 10},
//            { "x": donorXonRNA,  "y": RNA_Y},
          ]))
          .attr("stroke", "blue")
          .attr("fill", "none");
        */
        /*
        jxnArea.append("line").attr({
          "x1": startX,
          "x2": donorX,
          "y1": jxnWrapperHeight,
          "y2": donorY,
          "class": "JXNAreaConnector",
          "stroke": "back"
        });
        */


        startX += groupWidth * jxnGroups[jxnGpInd].groups.length + jxnWrapperPadding;
      }

      linesGroup.each(function() {
        this.parentNode.appendChild(this);
      })

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


      function drawRNA(RNAArea, axis, RNAHeight, RNAMargin) {

        RNAArea.append("line").attr({
          "x1": axis(startCoord),
          "x2": axis(endCoord),
          "y1": RNAHeight,
          "y2": RNAHeight,
          "class": "RNALine",
          "stroke": "#666"
        });

//        var allLocations = new Array(jxnsData.all_starts.length + jxnsData.all_ends.length);
//        for (var i = 0; i < jxnsData.all_starts.length; i++)
//          allLocations[i] = jxnsData.all_starts[i]
//        for (var i = 0; i < jxnsData.all_ends.length; i++)
//          allLocations[jxnsData.all_starts.length + i] =  jxnsData.all_ends[i]
//        var indices = [];
        buckets = new Array(jxnsData.all_starts.length + jxnsData.all_ends.length);
        for (var i = 0; i < buckets.length; ++i) {
          if(i < jxnsData.all_starts.length) {
            var loc = jxnsData.all_starts[i];
            var axisLoc = axis(loc);
            buckets[i] = {
            "type" : "donor",
            "loc": loc,
            "xStart": axisLoc,
            "xEnd": axisLoc + 10,
            "xStartDesired": axisLoc,
            "xEndDesired": axisLoc + 10,
            "firstGroupBucket": i,
            "lastGroupBucket": i
            }
          }
          else {
            var loc = jxnsData.all_ends[i - jxnsData.all_starts.length];
            var axisLoc = axis(loc);
            buckets[i] = {
            "type" : "receptor",
            "loc": loc,
            "xStart": axisLoc - 10,
            "xEnd": axisLoc,
            "xStartDesired": axisLoc - 10,
            "xEndDesired": axisLoc,
            "firstGroupBucket": 0,
            }
          }
        }
        buckets.sort(function (a, b) {return a.loc < b.loc ? -1 : a.loc == b.loc ? 0 : 1});
        var sitePadding = 4;
        for (var i = 1; i < buckets.length; ++i) {
          buckets[i].firstGroupBucket = i;
          var ind = i;
          var shift = -1;
          while(shift < 0 && ind > 0 && (buckets[ind].xStart < buckets[ind - 1].xEnd + sitePadding)) {
            var firstInd = buckets[ind - 1].firstGroupBucket;
            var overlap = buckets[ind - 1].xEnd + sitePadding - buckets[ind].xStart;
            buckets[i].xStart += overlap
            buckets[i].xEnd += overlap
            var leftGap = buckets[firstInd].xStartDesired - buckets[firstInd].xStart;
            var rightGap = buckets[i].xStart - buckets[i].xStartDesired;
            shift = (leftGap - rightGap) / 2;
            for (var j = firstInd; j <= i ; ++j) {
              buckets[j].xStart += shift
              buckets[j].xEnd += shift
              buckets[j].firstGroupBucket = firstInd
            }
            ind = firstInd;
          }
        }

        var RNASites = RNAArea.selectAll(".RNASites").data(buckets);
        RNASites .exit().remove();
        RNASites.enter().append("polyline").attr({
          "class": "RNASites",
          "fill": function (d, i) {return d.type == "donor" ? "blue" : "red"},
          "stroke": "black",
          "points": function (d, i) {
            var x1 =  d.type == "donor" ? d.xEnd : d.xStart;
            var x2 =  d.type == "donor" ? d.xStart : d.xEnd;
            return [
              x1, RNAHeight/2,
              x2, RNAHeight/2 - 5,
              x2, RNAHeight/2 + 5,
              x1, RNAHeight/2,
            ]
          }
        })
        RNASites.enter().append("polyline").attr({
          "class": "RNASiteConnector",
          "fill":"none",
          "stroke": function (d, i) {return d.type == "donor" ? "blue" : "red"},
          "points": function (d, i) {
            var x1 =  d.type == "donor" ? d.xStart : d.xEnd;
            return [
              x1, RNAHeight/2 + 5,
              x1, RNAHeight/2 + 10,
              axis(d.loc), RNAHeight,
            ]
          }
        })
/*
        var acceptorSites = RNAArea.selectAll(".acceptorSites").data(jxnsData.all_ends);
      acceptorSites .exit().remove();
      acceptorSites.enter().append("polyline").attr({
        "class": "acceptorSites",
        "fill": "white",
        "stroke": "black",
        "points": function (d, i) {
          var xLoc = axis(d);
          return [
            xLoc - 10, RNAHeight/2 + 25,
            xLoc, RNAHeight/2 + 20,
            xLoc, RNAHeight/2 + 30,
            xLoc - 10, RNAHeight/2 + 25,
          ]
        }
      })
*/
/*      exons.enter().append("polygon").attr({
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
      */
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

    function removeSubboxplots(parentNode) {
      parentNode.selectAll(".subboxplot").transition().duration(400).style({
        "opacity":0
      })
        .each("end", function() {
          d3.select(this).remove()
        })

    }

    function collapseJxn(parentNode, callback) {

      parentNode.selectAll(".jxnContainer").transition().duration(400).style({
        "opacity": 0,
      }).each("end", callback);

      removeSubboxplots(parentNode)

      var boxplots = parentNode.selectAll(".boxplot");

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
            if (showDotGroups && (groups.length > 0)) {
              createSubBoxPlots(this, data, groups);
            }
            else {
              removeSubboxplots(d3.select(this));
              sortDots(data, this)
            }
          }
        })
        expandedIsoform = activeIsoform;

      }

      function createGroups(activeIsoform, data) {
        d3.selectAll(".boxplotWithDots").each(function () {
          if (this.getAttribute("ActiveIsoform") == activeIsoform) {
            removeSubboxplots(d3.select(this));
            if (showDotGroups && (groups.length > 0)) {
              createSubBoxPlots(this, data, groups);
            }
            else {
              sortDots(data, this)
            }
          }
        })
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




      gui.current.addUpdateEvent(updateVisualization)
    //updateVisualization();
    return head.node();
  };

  exports.GenomeVis = GenomeVis;
  exports.create = create;
});
