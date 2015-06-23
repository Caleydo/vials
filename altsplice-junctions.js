/* Created by Bilal Alsallakh 02/01/14
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

  var margin = {top: 40, right: 150, bottom: 20, left: 150};
  var width; // = 1050 - margin.left - margin.right,
  var groupWidth;
  var expandedWidth;
  var height = 370 - margin.top - margin.bottom;
  var dotRadius = 4;
  var triangleLength = 8;
  var defaultDotColor = "rgba(90,90,90,0.3)";
  var dehighlightedDotColor = "rgba(120,120,120,0.05)";
  var highlightedDotColor = "red";
  var weightAxisCaptionWidth = 50;
  var exonWeightsAreaHeight;
  var jxnWrapperPadding = 6;
  var sitePadding = 2;
  var jxnWrapperHeight = 170;
  var miniExonHeight = 12;
  var jxnCircleRadius = 3;
  var jxnBBoxWidth = jxnCircleRadius * 4;

  var RNAHeight = 50;
  var RNAMargin = 50;
  var isoformEdgePadding = 9;

  var curGene;
  var curExons;
  var expandedIsoform = null;
  var selectedIsoform = null;

  var clickedElement = null;

  var jxnsData;
  var all_starts, all_ends;
  var sortedWeights;
  var allSamples;
  var sampleLength;
  var positiveStrand;

  var allIsoforms;
  var allExons;
  var jxnGroups = [];
  var edgeCount;
  var axis;
  var reversingAxis = false;
  var buckets;


  var jxnArea;
  var RNAArea;
  var yScaleContJxn;
  var xJxnBoxScale = d3.scale.linear();
  var showAllDots = true;
  var showSubboxplots = false;
  var showSelectedIsoform = "compact"

  var jitterDots = true;
  var groups = [];

  var groupColors = [
    "#fdbf6f",
    "#cab2d6",
    "#a6cee3",
    "#fb9a99",
    "#b2df8a",
    "#1f78b4",
    "#33a02c",
    "#e31a1cv",
    "#ff7f00",
    "#6a3d9a",

  ];


    GenomeVis.prototype.build = function ($parent) {

    var that = this;
    axis = that.data.genomeAxis;
    globalAxis = axis;

    width = axis.getWidth();


      event.on("dotsJittering", function(e,state){
        jitterDots = state;
        updateDotJitter();

      })

      event.on("overlayDots", function(e,state){
        showAllDots = state;
        updateDotVisibility();
      })


      var viewOptionsDiv1 = $parent.append("div")
        .attr("class","isoOptions hidden-print")
        //.attr("class","isoOptions")
        .style({
        "left": "20px",
        "position":"relative"
      })

      var viewOptionsLabel = document.createElement('label')
      viewOptionsLabel.appendChild(document.createTextNode(" On isoform select: "));
      d3.select(viewOptionsLabel).html("&nbsp; On isoform-select: &nbsp;")
      viewOptionsDiv1.node().appendChild(viewOptionsLabel);
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));

      var rbCompactView = document.createElement("input");
      rbCompactView.type = 'radio';
      rbCompactView.id = 'rbCompactView';
      rbCompactView.name='rgOnIsoformSelect';
      rbCompactView.checked = true;
      var rbCompactViewLabel = document.createElement('label')
      rbCompactViewLabel.htmlFor = "rbCompactView";
      rbCompactViewLabel.appendChild(document.createTextNode("compact view "));
      d3.select(rbCompactViewLabel).html("&nbsp; compact view &nbsp;")
      viewOptionsDiv1.node().appendChild(rbCompactView);
      viewOptionsDiv1.node().appendChild(rbCompactViewLabel);
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.select("#rbCompactView")
        .on({
          click: function () {
            showSelectedIsoform = "compact"
            if (expandedIsoform != null) {
              collapseIsoform(expandedIsoform, function() {
                showSubboxplots = false;
                updateDotVisibility();
              });
            }
          }
        })

      var rbSubgroups = document.createElement("input");
      rbSubgroups.type = 'radio';
      rbSubgroups.name='rgOnIsoformSelect';
      rbSubgroups.id = 'rbSubgroups';
      var rbSubgroupsLabel = document.createElement('label')
      rbSubgroupsLabel.htmlFor = "rbSubgroups";
      rbSubgroupsLabel.appendChild(document.createTextNode("group view"));
      d3.select(rbSubgroupsLabel).html("&nbsp; group view &nbsp;")

      viewOptionsDiv1.node().appendChild(rbSubgroups);
      viewOptionsDiv1.node().appendChild(rbSubgroupsLabel);
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.select("#rbSubgroups")
        .on({
          click: function () {
            showSelectedIsoform = "groups"
            if (selectedIsoform != null) {
              if (expandedIsoform == null)
                expandIsoform(selectedIsoform);
              else {
                d3.selectAll(".jxnContainer").style({
                  "stroke": "black"
                })
              }
//              createGroups(selectedIsoform.index);
            }
          }
        })

      var rbScatterplot = document.createElement("input");
      rbScatterplot.type = 'radio';
      rbScatterplot.id = 'rbScatterplot';
      rbScatterplot.name='rgOnIsoformSelect';
      var rbScatterplotLabel = document.createElement('label')
      rbScatterplotLabel.htmlFor = "chkAutoExpandIsoform";
      rbScatterplotLabel.appendChild(document.createTextNode("show correlation"));
      d3.select(rbScatterplotLabel).html("&nbsp; show correlation &nbsp;")

      viewOptionsDiv1.node().appendChild(rbScatterplot);
      viewOptionsDiv1.node().appendChild(rbScatterplotLabel);
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.node().appendChild(document.createTextNode(" "));
      viewOptionsDiv1.select("#rbScatterplot")
        .on({
          click: function () {
            showSelectedIsoform = "scatter"
            showSubboxplots = false;
            updateDotVisibility();
            if (selectedIsoform != null) {
              if (expandedIsoform == null)
                expandIsoform(selectedIsoform);

              d3.selectAll(".edgeGroup").filter(function() {
                removeSubboxplots(d3.select(this))
                return this.getAttribute("ActiveIsoform") == selectedIsoform.index;
              }).each(function(d, i) {
                if (i == 0)
                  sortDots(selectedIsoform.index, d)
              })

            }
          }
        })
              /*      var viewOptionsDiv = $parent.append("div").style({
              "left": "20px",
            });

            $('<input />', { type: 'checkbox', id: 'cbshowGroups', value: "showGroups" }).appendTo(viewOptionsDiv);
            $('<label />', { 'for': 'cb', text: "Show groups &nbsp" }).appendTo(viewOptionsDiv);
            $('#cbshowGroups').change(function() {
              showDotGroups = $(this).is(":checked")
              if (expandedIsoform != null) {
                expandIsoform(expandedIsoform);
              }
            });

            $('<input />', { type: 'checkbox', id: 'cbDotVisibility', value: "DotVisibility", checked: "true"}).appendTo(viewOptionsDiv);
            $('<label />', { 'for': 'cb', text: "Show all dots " }).appendTo(viewOptionsDiv);
            $('#cbDotVisibility').change(function() {
              showAllDots = $(this).is(":checked")
              updateDotVisibility();
            });

            $('<input />', { type: 'checkbox', id: 'cbJitterDots', value: "jitterDots", checked: "true"}).appendTo(viewOptionsDiv);
            $('<label />', { 'for': 'cb', text: "Jitter dots" }).appendTo(viewOptionsDiv);
            $('#cbJitterDots').change(function() {
              jitterDots = $(this).is(":checked")
              updateDotJitter();
            }); */

      event.on("isoFormSelect", function(ev,isoform){
        clickedElement = null;
        if (expandedIsoform != null && expandedIsoform != isoform) {
          collapseIsoform(expandedIsoform, function() {
            selectIsoform(isoform);
            updateExpansion(isoform)
          })
        }
        else {
          selectIsoform(isoform)
          updateExpansion(isoform)
        }


    });

    function updateExpansion(isoform) {
      if (showSelectedIsoform != "compact" && isoform.index >= 0) {
        setTimeout(function() {
          expandIsoform(isoform)
          if (showSelectedIsoform == "groups") {
            createGroups(isoform.index);
          }
          else {
            d3.selectAll(".edgeGroup").filter(function() {
              return this.getAttribute("ActiveIsoform") == isoform.index;
            }).each(function(d, i) {
              if (i == 0)
                sortDots(isoform.index, d)
            })
          }
        },200)
      }

    }

    event.on("sampleSelect", function(e,sampleID, isSelected){

          if (isSelected) {
            var sampleColor = gui.current.getColorForSelection(sampleID);
            svg.selectAll('.jxnCircle').filter(function(d) {
              return this.getAttribute("selected") == 0;
            }).style('fill', function (d) {
                var match = d.sample == sampleID;
                if (match) {
                  this.parentNode.appendChild(this);
                  this.setAttribute("selected", 1);
                }
                return match ? sampleColor : dehighlightedDotColor;
              });
          }
          else
          {
            svg.selectAll('.jxnCircle').filter(function(d) {
              var match = d.sample == sampleID;
              if (match)
                this.setAttribute("selected", 0);
              return this.getAttribute("selected") == 0;
            }).style('fill', defaultDotColor);
          }
      })


      event.on("groupSelect", function(ev, group, isSelected) {
          var color = isSelected ? gui.current.getColorForSelection(JSON.stringify(group)) : defaultDotColor;
          jxnArea.selectAll(".jxnCircle").filter(function(d) {
            return group.samples.indexOf(d.sample) >= 0;
          }).attr({
            "selected": isSelected ? 1 : 0
          }).style({
            "fill": color,
            "opacity": isSelected ? 0.8 : 1
          })

      })

      event.on("sampleGroupSelected", function(ev,groupID, samples, isSelected){
        /*  groups = []
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
        groups = [
          {"samples": samples, "color": groupColors[0]}
        ]
        if ((expandedIsoform != null) && showDotGroups) {
          createGroups(expandedIsoform);
        }
         */
      });


      event.on("groupingChanged", function(ev, newGroups, oldGroups){
     /*  groups = []
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
      */
        for (var i = 0; i < oldGroups.length; i++) {
          var ind = groups.indexOf(oldGroups[i]);
          if (ind >= 0)
            groups.splice(ind, 1);
        }
        for (var i = 0; i < newGroups.length; i++) {
          if (newGroups[i].samples.length > 1)
            groups.push(newGroups[i]);
        }
//        event.fire("groupingChanged",  [ ["heart", "adipose"], ["thyroid", ...], ...] )

      if ((expandedIsoform != null) && showSelectedIsoform == "groups") {
        createGroups(expandedIsoform.index);
      }
    });

      event.on("axisChange", function(ev,data){
        drawGenomeAxis();

        var startX = weightAxisCaptionWidth + jxnWrapperPadding;

        var translateAmount = 2 * startX + groupWidth * edgeCount + jxnWrapperPadding * (jxnGroups.length - 1)

       d3.selectAll(".grayStripesGroup").transition()
          .duration(300).attr(

         {
           "transform": axis.ascending ? "" : " translate(" + translateAmount  + ", 0) scale(-1, 1)"
         })

        computeFlagPositions()

        var connectors = d3.selectAll(".JXNAreaConnector");
          connectors.attr({
            "x1": function() {
              return reversingAxis ?
                translateAmount - parseInt(this.getAttribute("x1")) - parseInt(this.getAttribute("wrapperWidth"))
                : this.getAttribute("x1");
            },
            "x2": function() {
              return  reversingAxis ?
                parseInt(this.getAttribute("x1")) + parseInt(this.getAttribute("wrapperWidth"))
                : this.getAttribute("x2");
            },
            "x3": function() {
              var loc = this.getAttribute("loc");
              return getBucketAt(loc).anchor
            }
          })
        connectors.transition()
          .duration(300).attr({
            "points": function() {
              return getConnectorPoints(this)
            }
          })



        d3.selectAll(".edgeConnector").transition()
          .duration(300).attr({
            "x1": function() {
              return  reversingAxis ?
                translateAmount - parseInt(this.getAttribute("x1"))
                : this.getAttribute("x1");
            },
            "x2": function() {
              var type = this.getAttribute("type");
              var loc = type == "donor" ?
                this.getAttribute("startLoc") :  this.getAttribute("endLoc");
              var endInd = getBucketIndAt(loc)
              return buckets[endInd].anchor;
            }
          })

        if (!axis.ascending)
        startX = translateAmount - startX;
      d3.selectAll(".jxnWrapper").each(function(d, i) {
          d3.select(this).selectAll(".edgeGroup").transition().duration(300).attr({
            "transform": function(d, i) {
              return axis.ascending ?
              "translate(" + (startX + groupWidth * i) + ", 0)" :
              "translate(" + (startX - groupWidth * (i + 1)) + ", 0)"
            },
          })
        var shift = groupWidth * jxnGroups[i].groups.length + jxnWrapperPadding;
        startX = axis.ascending ? startX + shift : startX - shift;
      });

        for (var jxnGpInd = 0; jxnGpInd < jxnGroups.length; jxnGpInd++) {

          var jxnGroup = jxnGroups[jxnGpInd];

          var jxnGroupWrapper = jxnArea.append("g").attr({
            "class": ""
          });

          var edgeGroups = jxnGroupWrapper.selectAll(".edgeGroup").data(jxnGroup.groups).enter().append("g").attr({
            "class": "edgeGroup",
            "ActiveIsoform": -1,
            "startLoc": function(g) {return g.startLoc},
            "endLoc": function(g) {return g.endLoc},
            "transform": function(d, i) {
              return "translate(" + (startX + groupWidth * i) + ", 0)"
            },
            "startX": function(d, i) {return startX + groupWidth * i}
          });

          startX += groupWidth * jxnGroups[jxnGpInd].groups.length + jxnWrapperPadding;
        }

        d3.selectAll(".RNASite").transition()
          .duration(300).attr({
            "transform": function(d, i) {return "translate(" + d.xStart + ",0)"}
          })

          d3.selectAll(".RNASiteConnector").transition()
          .duration(300).attr({
            "points": function (d, i) {
              return [
                d.anchor, (RNAHeight + triangleLength)/2,
                d.anchor, RNAHeight/2 + triangleLength,
                axis.genePosToScreenPos(d.loc), RNAHeight,
              ]
            }
          })


        // == update heatmap ==
        heatmapGroup.selectAll(".exonHeat").transition().attr({
          x:function(d){return axis.genePosToScreenPos(axis.ascending ? d.start : d.end);},
          width:function(d){return Math.abs(axis.genePosToScreenPos(d.end)-axis.genePosToScreenPos(d.start));}
        })
        indicatorGroup.select(".strandIndicatorBg").attr({
          "width": axis.width,
        })
      })

      event.on("LocHighlight", function(ev, data){

        if (selectedIsoform != null)
          return;

        var loc = data.loc;
        var highlight = data.highlight;
        updateEdgeConnectorsVisibility();

        var jxnList = [];
        if (highlight) {
          RNAArea.selectAll(".RNASite, .RNASiteConnector").each(function (d2, i2) {
            d3.select(this).style({
              "opacity" : loc == d2.loc ? 1 : 0.1
            })
          })

          d3.selectAll(".JXNAreaConnector").each(function() {
            d3.select(this).style({
              "opacity" : (this.getAttribute("loc") == loc) ?1 : 0.1
            })
          })

          d3.selectAll(".edgeAnchor, .edgeConnector").each(function() {
            var classAttr = this.getAttribute("class");
            var startLoc = this.getAttribute("startLoc");
            var endLoc = this.getAttribute("endLoc");
            var involvedItem = startLoc == loc  ||  endLoc == loc;
            d3.select(this).style({"opacity" : involvedItem ? 1 : 0.1})
            if (involvedItem && classAttr == "edgeConnector") {
              var otherLoc = startLoc == loc ? endLoc : startLoc;
              RNAArea.selectAll(".RNASite, .RNASiteConnector").each(function (d2) {
                if (d2.loc == otherLoc) {
                  d3.select(this).style({"opacity" : 1})
                }
              })
              d3.selectAll(".JXNAreaConnector").each(function (d2) {
                if (this.getAttribute("loc") == otherLoc) {
                  d3.select(this).style({"opacity" :1})
                }
              })
              // use of to avoid duplicate jxns due to donor / receptor
              if (this.getAttribute("type") == "receptor")
                jxnList.push({"start": startLoc, "end":endLoc})
            }
          })
        }
        else {
          d3.selectAll(".RNASite, .JXNAreaConnector, .RNASiteConnector, .edgeAnchor").style({
            "opacity" : 1
          })
        }

//        console.log("jxnList: " + jxnList);
        if (clickedElement == null)
          event.fire("jxnListHighlighted", {"jxns": jxnList, "highlighted": highlight})
        else
          event.fire("jxnListSelected", {"jxns": jxnList, "selected": highlight})

      })





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


      //TODO: externalize into a function maybe a html version ?
     /*
     *
     * Label for View starts here..
     * */
    var svgLabel = svg.append("g");
    var svgLabelBg = svgLabel.append("rect").attr({
      "class": "viewLabelBg",
      "width": height + margin.top,
      "rx": 10,
      "ry": 10
    });
    var svgLabelText = svgLabel.append("text").text("junctions").attr({
      "class": "viewLabelText",
    });
    bb = svgLabelText.node().getBBox();
    svgLabelBg.attr({
      "height": bb.height+4
    })
    function drawViewLabel(height) {
      svgLabelBg.attr({
        "width": height + margin.top
      });
      svgLabelText.attr("transform", "translate(" +
        (height+margin.top-bb.width)/2
        + "," + (bb.height-3) + ")")
      svgLabel.attr("transform", "translate(0," + (height+margin.top) + ")" +
                                 "rotate(-90)");
    }
    drawViewLabel(height);

    var viewLabelMargin = 40;
    var svgMain = svg.append("g").attr({
      "class": "jxnMain",
      "transform": "translate(" + viewLabelMargin + ",0)"
    });

    var exploreArea = svgMain.append("g").attr("transform", "translate(0, 5)").attr("id","exploreArea");
    jxnArea = exploreArea.append("g").attr("id", "jxnArea");



    function updateVisualization() {

      width = axis.getWidth();

      svg.attr("width", width + margin.left + margin.right)

      curGene = gui.current.getSelectedGene();
      var curProject = gui.current.getSelectedProject();

      //console.log("ppp", curProject, curGene );
      that.data.getGeneData(curProject, curGene).then(function(sampleData) {

        positiveStrand = sampleData.gene.strand == "+";

        jxnsData = sampleData.measures.jxns;
        allSamples = sampleData.samples;
        all_starts = positiveStrand ? jxnsData.all_starts : jxnsData.all_ends;
        all_ends = positiveStrand ? jxnsData.all_ends : jxnsData.all_starts;
        if (!positiveStrand) {
          for (var i = 0; i < jxnsData.weights.length; i++) {
            var temp = jxnsData.weights[i].start;
            jxnsData.weights[i].start = jxnsData.weights[i].end;
            jxnsData.weights[i].end = temp;
          }
        }


        var sampleKeys = Object.keys(allSamples);
        // TODO: remove following test data after group definition is implemented
        groups = [];
        /*
          {"samples": sampleKeys.filter(function(d, i)
            {return i < sampleKeys.length / 3}), "color": "cyan"
          },          {"samples": sampleKeys.filter(function(d, i)
          {return (i >= sampleKeys.length / 3) && (i < 2 * sampleKeys.length / 3)}), "color": "yellow"
          },
          {"samples": sampleKeys.filter(function(d, i)
          {return i >= 2 * sampleKeys.length / 3}), "color": "green"
          }];
*/

        sampleLength = sampleKeys.length;
        allIsoforms = sampleData.gene.isoforms;
        allExons = sampleData.gene.exons;
        // TODO: Hen: workaround for missing update cycle
        jxnArea.remove();
        jxnArea = d3.select("#exploreArea").append("g").attr("id", "jxnArea");

        computeJxnGroups();
        drawJxnAxis();

        RNAArea = exploreArea.append("g").attr({
          "id": "RNAArea",
          "transform": "translate(0," + (jxnWrapperHeight+RNAMargin) + ")"
        });
        // RNAScale = d3.scale.linear().domain([startCoord, endCoord]).range([triangleLength, width - triangleLength]);

        drawRNA(RNAArea);

        drawJxns();

        // drawGroupingOptions();

        drawHeatmap();

      })
      //// should trigger a cache hit
      //that.data.getSamples(chromID,startPos,baseWidth);
    }

    function drawGroupingOptions() {
      var ctrlPanel = svg.append("g").attr({
        "transform": "translate(" + axis.getWidth() + ", 0)"
      })

      ctrlPanel.append("rect").attr({
        "width": 10,
        "height": 10,
        "stroke": "black",
        "fill": "white",
        "transform": "translate(0, 2)"
      })
      ctrlPanel.append("text").attr({
        class:"bka",
        x: 15,
        y:20
      }).text("Auto. expand selected isoform:")

      ctrlPanel.append("circle").attr({
        "radius": 5,
        "stroke": "black",
        "fill": "white",
        "transform": "translate(25, 27)"
      })
      heatmapGroup.append("text").attr({
        class:"bka",
        x: 50,
        y:25
      }).text("Auto. expand selected isoform:")

      ctrlPanel.append("rect").attr({
        "radius": 10,
        "stroke": "black",
        "fill": "white",
        "transform": "translate(25, 54)"
      })
      heatmapGroup.append("text").attr({
        class:"bka",
        x: 50,
        y:52
      }).text("Auto. expand selected isoform:")


    }

      /*================
      * DRAW Heatmap
      * ================
      * */
    var heatmapGroup = exploreArea.append("g")
      .attr("transform", "translate(0,"+(jxnWrapperHeight+RNAMargin +RNAHeight)+")")
      .attr("class", "exonHeatMap")

    var heatMapHeight = 20;
    var heatMapExtendedHeight = height+margin.top + margin.bottom- (jxnWrapperHeight+RNAMargin +RNAHeight)
      heatmapGroup.append("rect").attr({
        class:"background",
        x:0,
        y:0,
        width: width,
        height: heatMapExtendedHeight
      })
      heatmapGroup.append("text").attr({
        class:"heatmapLabel infoSticker",
        x:width + 5,
        y:heatMapHeight-4
      }).text(" ] exon overlap")
      heatmapGroup.append("text").attr("class", "crosshairPos")


      // TODO: make it more like #70
      // TODO: detach from heatmap group
      /*
      * strand Indicator starts here
      * */
      var indicatorGroup = heatmapGroup.append("g").attr({
        class:"strandIndicator",
        "transform": "translate(0,40)"
      })
      var indicatorBg = indicatorGroup.append("rect").attr({
        "class": "strandIndicatorBg",
        "width": axis.width,
        "height": 20,
      })
      indicatorGroup.append("svg:marker").attr({
        "id": "scaleArrow",
        "viewBox": "0 0 10 10",
        "refX": 0,
        "refY": 5,
        "markerUnits": "strokeWidth",
        "markerWidth": 2,
        "markerHeight": 2,
        "orient": "auto-start-reverse",
      }).append("svg:path").attr("d", "M 0 0 L 10 5 L 0 10 z");

      function drawGenomeAxis() {
        var divWidth = axis.width/5;

        var genomeAxisTicks = indicatorGroup.selectAll(".genomeAxisTick").data(d3.range(divWidth, axis.width, divWidth));
        genomeAxisTicks.exit().remove();
        var genomeAxisTicksEnter = genomeAxisTicks.enter().append("g").attr({
          "class": "genomeAxisTick",
        });
        genomeAxisTicksEnter.append("line").attr({
          "y1": -10,
          "y2": 0,
        })
        genomeAxisTicksEnter.append("line").attr({
          "y1": 20,
          "y2": 30,
        })
        genomeAxisTicks.transition().attr("transform", function(d) {return "translate(" + d + ",0)"})


        var arrowDirection = (axis.ascending == positiveStrand); // XNOR
        var directionIndicators = indicatorGroup.selectAll(".directionIndicator").data(d3.range(divWidth/2, axis.width, divWidth));
        directionIndicators.exit().remove();
        directionIndicators.enter().append("line").attr({
          "class": "directionIndicator",
          "x1": function(d) {return d-10},
          "x2": function(d) {return d+10},
          "y1": 10,
          "y2": 10,
          //"stroke": "black",
          "stroke-width": 5,
          "marker-end": "url(\#scaleArrow)"
        })
        directionIndicators.transition().attr({
          "x1": function(d) {return d + (arrowDirection ? -10 : 10)},
          "x2": function(d) {return d + (arrowDirection ? 10 : -10)},
        })

        var genomeAxisDef = d3.svg.axis()
          .scale(axis.scale_genePosToScreenPos)
          .orient("bottom")
          .tickValues(d3.range(divWidth, axis.width, divWidth).map(function(d) {
            return axis.screenPosToGenePos(d);
          }))
          .tickSize(0)
          .tickPadding(15);
        var genomeAxis = indicatorGroup.selectAll(".genomeAxis").data([genomeAxisDef]);
        genomeAxis.exit().remove();
        genomeAxis.enter().append("g").attr({
            "class":"axis genomeAxis",
            "transform": "translate(0, -10)"
        });
        genomeAxis.call(genomeAxisDef);
      }
      drawGenomeAxis();

      var directionToggleGroup = indicatorGroup.append("g").attr({
        "class": "directionToggleGroup",
        "transform": "translate(" + (axis.width+10) + ",0)"
      })
      directionToggleGroup.append("rect").attr({
        "class": "directionToggle",
        "width": 125,
        "height": 20,
        "rx": 10,
        "ry": 10
      }).on("click", function() {
        axis.reverse();
        d3.select(this).classed("selected",!axis.ascending);
        //d3.select(".directionIndicator").transition().attr({
        //})
        event.fire("axisChange");
      })

      directionToggleGroup.append("line").attr({
        "x1": 20,
        "x2": 50,
        "y1": 10,
        "y2": 10,
        //"stroke": "black",
        "stroke-width": 5,
        "marker-end": "url(\#scaleArrow)",
        "marker-start": "url(\#scaleArrow)",
      }).style("pointer-events","none");
      var directionToggleText = directionToggleGroup.append("text").attr({
      }).text("reverse");
      directionToggleText.attr("transform", "translate(65," + (directionToggleText.node().getBBox().height-2) + ")");
      directionToggleText.style("pointer-events","none");




    function drawHeatmap(){
        var exonHeat = heatmapGroup.selectAll(".exonHeat").data(Object.keys(allExons).map(function(key){return allExons[key];}));
        exonHeat.exit().remove();

        // --- adding Element to class exonHeat
        var exonHeatEnter = exonHeat.enter().append("rect").attr({
            "class":"exonHeat",
          y:0,
          height:heatMapHeight
        })

        // --- changing nodes for exonHeat
        exonHeat.attr({
            x:function(d){return axis.genePosToScreenPos(d.start);},
            width:function(d){return axis.genePosToScreenPos(d.end)-axis.genePosToScreenPos(d.start);}
        })

        //== updates
        heatmapGroup.selectAll(".background").attr({
          width: width
        })
        indicatorGroup.select(".strandIndicatorBg").attr({
          "width": axis.width,
        })
        indicatorGroup.select(".directionToggleGroup").attr({
          "transform": "translate(" + (axis.width + 10) + ",0)"
        });

        heatmapGroup.selectAll(".heatmapLabel").attr({
          x: width +5
        })
        drawGenomeAxis();
    }


      function addCrosshair(){
        // create crosshair
        var crosshair = heatmapGroup.append("line").attr({
          "class":"crosshair",
          "x1":0,
          "y1":0,
          "x2":0,
          "y2":heatMapExtendedHeight
        }).style({
          "stroke-width":"1",
          "stroke":"black",
          "pointer-events":"none"
        });

        var currentX = 0;
        heatmapGroup.on("mousemove", function () {
          currentX = d3.mouse(this)[0];
          //console.log("mouse", currentX);
          event.fire("crosshair", currentX);

        })

        function updateCrosshair(event, x){
          svg.selectAll(".crosshair, .crosshairPos")
             .attr("visibility", x > axis.getWidth() ? "hidden" : "visible");

          crosshair.attr({
            "x1":x,
            "x2":x
          })

          d3.selectAll(".crosshairPos")
            .text(function(d) {return axis.screenPosToGenePos(x)})
            .each(function() {
              var self = d3.select(this),
              bb = self.node().getBBox();
              self.attr({
                "x": x + 10,
                "y": heatMapExtendedHeight - bb.height/2
              });
            })
          lastX = x;
        }

        event.on("crosshair", updateCrosshair);
      }

      addCrosshair();



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
      var fontSize = 12;
      var edgeAxisGroup = jxnArea.append("g")
        .attr("class", "axis")
        .call(yAxisJxn)
        .attr("transform", "translate(" + weightAxisCaptionWidth + " 0)");
      edgeAxisGroup.append("text")      // text label for the x axis
        .attr("x", fontSize-weightAxisCaptionWidth)
        .attr("y", exonWeightsAreaHeight / 2)
        .attr("font-size", 12)
        .style("text-anchor", "middle")
        .text("# of junction reads")
        .attr("transform", "rotate(-90, " + (fontSize-weightAxisCaptionWidth) +  " " + exonWeightsAreaHeight / 2 + ")");
    }

    function computeJxnGroups() {
      sortedWeights = jxnsData.weights.slice();
      sortedWeights.sort(function (a, b) {
        return (a.start != b.start) ?  (a.start - b.start) : ((a.end != b.end) ?  (a.end - b.end) : (a.weight - b.weight))
      });

      var ind = 0;
      edgeCount = 0;
      var prevStart = ind;
      var prevEnd = ind;
      var startLoc = sortedWeights[ind].start;
      var endLoc = sortedWeights[ind].end;
      var subGroups = [];
      for (ind = 1; ind < sortedWeights.length; ind++) {

        var startLoc2 = sortedWeights[ind].start;
        var endLoc2 = sortedWeights[ind].end;

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
      edgeCount++
      jxnGroups.push({"start":prevStart, "end":ind - 1, "groups": subGroups});

    }

      function getBucketIndAt(loc) {
        for (var i = 0; i < buckets.length; i++) {
          if (buckets[i].loc == loc)
            return i;
        }
      }

      function getBucketAt(loc) {
        return buckets[getBucketIndAt(loc)];
      }

      function getConnectorPoints(connector) {

        var bucketInd = connector.getAttribute("adjacentSingletonReceptorBucket");
        if (bucketInd == "none") {
          return [
            connector.getAttribute("x1"), jxnWrapperHeight,
            connector.getAttribute("x2"), jxnWrapperHeight,
            connector.getAttribute("x3"), getDonorY(),
          ]
        }
        else {
          return ((positiveStrand && axis.ascending) || (!positiveStrand && !axis.ascending))  ? [
            connector.getAttribute("x1"), jxnWrapperHeight,
            connector.getAttribute("x2"), jxnWrapperHeight,
            buckets[bucketInd].anchor, getDonorY(),
            connector.getAttribute("x3"), getDonorY(),
          ] :
            [ connector.getAttribute("x1"), jxnWrapperHeight,
              connector.getAttribute("x2"), jxnWrapperHeight,
              connector.getAttribute("x3"), getDonorY(),
              buckets[bucketInd].anchor, getDonorY(),
            ]
        }
      }

      function getDonorY() {
        return jxnWrapperHeight + RNAMargin + RNAHeight/2 - 5
      }

      function drawJxns() {

      var lastFlagX = buckets[buckets.length - 1].xEnd;
        groupWidth =  (80 + lastFlagX -  weightAxisCaptionWidth - jxnWrapperPadding * jxnGroups.length) / edgeCount;

        var startX = weightAxisCaptionWidth + jxnWrapperPadding;


        var grayStripesGroup = jxnArea.append("g").attr({
          "class": "grayStripesGroup"
        });
        var linesGroup = jxnArea.append("g");

        for (var jxnGpInd = 0; jxnGpInd < jxnGroups.length; jxnGpInd++) {
          var jxnGroup = jxnGroups[jxnGpInd];
          var wrapperWidth = groupWidth * jxnGroup.groups.length;
          grayStripesGroup.append("rect").attr({
            "class": "jxnWrapperBox",
            "height": jxnWrapperHeight,
            "loc": jxnGroup.groups[0].startLoc,
            "width": function (d, i) {
              return wrapperWidth
            },
            "transform": "translate(" + startX + ", 0)"
          }).on("click", function(d) {
            if (this == clickedElement) {
              //TODO: hen -- fix this use multiple parameters
              event.fire("LocHighlight", {"loc":this.getAttribute("loc"),"highlight": false});
              clickedElement = null;
            }
            else {
              //TODO: hen -- fix this use multiple parameters
              clickedElement = this;
              event.fire("LocHighlight", {"loc": this.getAttribute("loc"),"highlight": true});
            }
          })

          var donorLoc = sortedWeights[jxnGroup.start].start;
          var donorInd = getBucketIndAt(donorLoc);
          jxnArea.append("polygon").attr({
            wrapperWidth: wrapperWidth,
            x1: startX,
            x2: startX + wrapperWidth,
            x3: buckets[donorInd].anchor,
            "loc": donorLoc,
            "adjacentSingletonReceptorBucket": function() {
              if (jxnGroup.groups.length == 1) {
                var loc = jxnGroup.groups[0].endLoc;
                var adjacentInd = positiveStrand ? donorInd + 1 : donorInd - 1;
                var receptorInd = getBucketIndAt(loc);
                return receptorInd == adjacentInd ? receptorInd : "none"
              }
              return "none"
            },
            "points": function() {return getConnectorPoints(this)},
            "class": "JXNAreaConnector"
          })
          startX += groupWidth * jxnGroups[jxnGpInd].groups.length + jxnWrapperPadding;
        }

        var startX = weightAxisCaptionWidth + jxnWrapperPadding;
      for (var jxnGpInd = 0; jxnGpInd < jxnGroups.length; jxnGpInd++) {

        var jxnGroup = jxnGroups[jxnGpInd];
        var wrapperWidth = groupWidth * jxnGroup.groups.length;


        var jxnGroupWrapper = jxnArea.append("g").attr({
          "class": "jxnWrapper"
        });

        var edgeGroups = jxnGroupWrapper.selectAll(".edgeGroup").data(jxnGroup.groups).enter().append("g").attr({
          "class": "edgeGroup",
          "ActiveIsoform": -1,
          "startLoc": function(g) {return g.startLoc},
          "endLoc": function(g) {return g.endLoc},
          "transform": function(d, i) {
            return "translate(" + (startX + groupWidth * i) + ", 0)"
          },
          "startX": function(d, i) {return startX + groupWidth * i}
        });



        edgeGroups.each(function(group, groupInd) {
          var groupNode = d3.select(this);

          var y1 = jxnWrapperHeight + RNAMargin + RNAHeight/2;
          var y2 = y1 + 2 * RNAMargin;

          groupNode.append("rect").attr({
            "class": "jxnContainer",
            "startLoc": group.startLoc,
            "endLoc": group.endLoc,
            "fill": "white",
            "stroke": "black",
            "height": jxnWrapperHeight - 6,
            "transform": " translate(" + groupWidth / 2 + ", 0)",
            "width": 0
          }).style({
            "opacity": 0,
            "visibility": "hidden"
          }).on("dblclick", function() {
            if (showSelectedIsoform == "scatter") {
              var node = this.parentNode;
              var ind = node.getAttribute("ActiveIsoform")
              d3.select(node).each(function(d, i) {
                if (i == 0)
                  sortDots(ind, d)
              })
            }
          })

          groupNode.append("rect").attr({
            "class": "edgeAnchor",
            "startLoc": group.startLoc,
            "endLoc": group.endLoc,
            "height": 5,
            "width": groupWidth / 3,
            "transform": "translate(" + groupWidth / 3 + ", " + (jxnWrapperHeight - 6) + ")"
          }).on("click", function(d) {
            if (this == clickedElement) {
              //TODO: hen -- fix this use multiple parameters
              event.fire("jxnHighlight", {"startLoc":d.startLoc, "endLoc":d.endLoc,"highlight": false});
              clickedElement = null;
            }
            else {
              //TODO: hen -- fix this use multiple parameters
              clickedElement = this;
              event.fire("jxnHighlight", {"startLoc":d.startLoc, "endLoc":d.endLoc,"highlight": true});
            }
          }).on('mouseover', function(d) {
              if (clickedElement == null) {
                //TODO: hen -- fix this use multiple parameters
                event.fire("jxnHighlight", {"startLoc": d.startLoc, "endLoc": d.endLoc, "highlight": true});
              }
            })
            .on("mouseout", function(d) {
              if (clickedElement == null) {
                //TODO: hen -- fix this use multiple parameters
                event.fire("jxnHighlight", {"startLoc": d.startLoc, "endLoc": d.endLoc, "highlight": false});
              }
            })
            .on("dblclick", function(d) {
              var availableWidth = width - weightAxisCaptionWidth - jxnWrapperPadding;
              expandedWidth = availableWidth / (edgeCount + 3);
              d3.selectAll(".edgeGroup").attr({
                "transform": function() {
                  return this.getAttribute("transform") + " translate(" + (-expandedWidth / 2 - 5)+ ", 0)"
                }
              })
              d3.selectAll(".edgeAnchor").attr({
                "transform": function() {
                  return this.getAttribute("transform") + " translate(" + (expandedWidth/ 2)+ ", 0)"
                }
              })
              d3.selectAll(".boxplot").style({
                "opacity": 0
              })
              createGroups(-1)
            })




            groupNode.append("g").attr({
            "class": "subboxplotsContainer",
            "transform": "translate(" + groupWidth / 2 + ", 0)"
          })

          var anchorX = startX + (groupInd + 0.5) * groupWidth;

          var endInd = getBucketIndAt(group.endLoc);
          var startInd = getBucketIndAt(group.startLoc);
          var adjacentSites = positiveStrand ? (endInd == startInd + 1) : (endInd == startInd - 1)
          var UniqueadajcenReceptor =  adjacentSites && (jxnGroup.groups.length == 1);
            linesGroup.append("line").attr({
              "type": "receptor",
              "anchorX": anchorX,
              "x1": anchorX,
              "UniqueAdajcenReceptor": UniqueadajcenReceptor,
              "x2": buckets[endInd].anchor,
              "startLoc": group.startLoc,
              "endLoc": group.endLoc,
              "y1": jxnWrapperHeight,
              "y2": getDonorY(),
              "class": "edgeConnector",
              "visibility": UniqueadajcenReceptor ? "hidden" : "visible"
            })

          linesGroup.append("line").attr({
            "type": "donor",
            "anchorX": anchorX,
            "x1": anchorX,
            "x2": buckets[startInd].anchor,
            "startLoc": group.startLoc,
            "endLoc": group.endLoc,
            "y1": jxnWrapperHeight,
            "y2": getDonorY(),
            "class": "edgeConnector",
          }).style({
            "visibility": "hidden"
            })

          var boxPlotData = new Array(sampleLength);
          var nonZeroCount = (group.end - group.start + 1);
          var nonZeroStartIndex = sampleLength - nonZeroCount;
          for (var i = 0; i < sampleLength; i++) {
            if (i < nonZeroStartIndex)
              boxPlotData[i] = 0;
            else {
              boxPlotData[i] = sortedWeights[group.start + i - nonZeroStartIndex].weight;
            }
          }
          var boxplotInfo = computeBoxPlot(boxPlotData, 1);
          var boxplot = createBoxPlot(groupNode, "boxplot",
            boxplotInfo.whiskerDown, boxplotInfo.whiskerTop, boxplotInfo.Q).attr({
              "transform": " translate(" + groupWidth / 2 + ", 0)",
            }).style({
            });

          var dotsGroup = groupNode.append("g").attr({
            "class": "dotsGroup",
            "transform": "translate(" + groupWidth / 2 + ", 0)"
          });

          // == jxnCircles !!

          var jxnCircle = dotsGroup.selectAll(".jxnCircle").data(sortedWeights.filter(function(d,ind){
            return ind >= group.start && ind <= group.end // TODO: VERY BAD CODE
          }));
          jxnCircle.exit().remove();

          // --- adding Element to class jxnCircle
          var jxnCircleEnter = jxnCircle.enter().append("circle").attr({
              "class":"jxnCircle",
              "selected":0,
              "r": jxnCircleRadius,
              "outlier": function(jxnData){
                return jxnData.weight < boxplotInfo.whiskerDown || jxnData.weight > boxplotInfo.whiskerTop
              },
              "fill":defaultDotColor
          })
          updateDotJitter();
          updateDotVisibility();
          jxnCircleEnter.on('mouseover', function (d) {
            // == fire sample select event
            event.fire("sampleHighlight", d.sample, true);
            //TODO: hen -- fix this use multiple parameters
            event.fire("jxnHighlight", {"startLoc": d.start, "endLoc":d.end,"highlight": true});

          }).on('mouseout', function (d) {
            event.fire("sampleHighlight", d.sample, false);
            //TODO: hen -- fix this use multiple parameters
            event.fire("jxnHighlight", {"startLoc": d.start, "endLoc":d.end,"highlight": false});
          });

          jxnCircleEnter.append("svg:title")
            .text(function (d, i) {
              return d.sample + ": " + d.weight + " (" + d.start + " - " + d.end + ")";
            });

          // --- changing nodes for jxnCircle
          jxnCircle.attr({
            "cx": 0,
            "cy": function(jxnData){return yScaleContJxn(jxnData.weight)}
          })

        })

        startX += groupWidth * jxnGroups[jxnGpInd].groups.length + jxnWrapperPadding;
      }

      linesGroup.each(function() {
        this.parentNode.appendChild(this);
      })

    }

    // == bind sampleHighlight Event:
    event.on("sampleHighlight", function(event, hoveredSample, highlight){
      //console.log("highlight", hoveredSample, highlight);
      if (highlight){
        svg.selectAll('.jxnCircle').filter(function(d) {
          return this.getAttribute("selected") == "0"})
          .style('fill', function (d) {
            var selected = (d.sample == hoveredSample);
            if (selected)
              this.parentNode.appendChild(this);
          return selected ? highlightedDotColor : dehighlightedDotColor;
        });
      }
      else
      {
        var color = (svg.selectAll('.jxnCircle').filter(function(d) {
          return this.getAttribute("selected") == 1;
        }).empty()) ? defaultDotColor : dehighlightedDotColor;
        svg.selectAll('.jxnCircle').filter(function(d) {
          return this.getAttribute("selected") == "0"
        }).style('fill', color);
      }
    })


      event.on("jxnHighlight", function(ev, data){

      if (selectedIsoform != null)
        return;

        var startLoc = data.startLoc;
        var endLoc = data.endLoc;
        var highlight = data.highlight;

        if (highlight) {
          RNAArea.selectAll(".RNASite, .RNASiteConnector").style({
            "opacity": function (d2, i2) {
              return startLoc == d2.loc || endLoc == d2.loc ? 1 : 0.1
            }
          })

          d3.selectAll(".JXNAreaConnector").style({
            "opacity": 0.1
          })

          d3.selectAll(".edgeConnector, .edgeAnchor").each(function () {
            var match = startLoc == this.getAttribute("startLoc") && endLoc == this.getAttribute("endLoc");
            var thisNode = d3.select(this);
            if (this.getAttribute("class") == "edgeConnector")
              thisNode.style({"visibility": match ? "visible" : "hidden",
                "opacity": match ? 1 : 0
              })
            else {
              thisNode.style({
                "opacity": match ? 1 : 0.1
              })
            }
          })
        }
        else {
          d3.selectAll(".RNASite, .RNASiteConnector, .JXNAreaConnector, .edgeAnchor").style({
            "opacity":  1,
          })

          updateEdgeConnectorsVisibility();
        }
        var jxnList = [{"start": data.startLoc, "end":data.endLoc}];
        if (clickedElement == null)
          event.fire("jxnListHighlighted", {"jxns": jxnList, "highlighted": data.highlight})
        else
          event.fire("jxnListSelected", {"jxns": jxnList, "selected": data.highlight})

      })


    function updateEdgeConnectorsVisibility () {
      d3.selectAll(".edgeConnector").style({
        "visibility": function () {
          if (this.getAttribute("type") == "donor")
            return "hidden"
          else if (this.getAttribute("UniqueAdajcenReceptor") == "true")
            return "hidden"
          return "visible";
        },
        "opacity" : 1
      })
    }




    function updateDotVisibility() {
      d3.selectAll(".jxnCircle").style({
        "visibility": function(d, i) {
          if (showAllDots)
            return "visible";
          var outlier = showSubboxplots ?
            this.getAttribute("group-outlier") :
            this.getAttribute("outlier")
            return outlier == "true" ? "visible" : "hidden";
          // this.getAttribute("outlier") ? "visible" : "hidden";
        }
      })

    }

    function updateDotJitter() {
      d3.selectAll(".jxnCircle").attr({
        "transform": function(d, i) {
          var xShift = jitterDots ? 4 - 8 * Math.random() : 0;
          return "translate(" + xShift + ", 0)"
        }
      })
    }

    function drawRNA(RNAArea) {

      //TODO: hen deleted here
      //RNAArea.append("line").attr({
      //  "x1": axis.genePosToScreenPos(startCoord),
      //  "x2": axis.genePosToScreenPos(endCoord),
      //  "y1": RNAHeight,
      //  "y2": RNAHeight,
      //  "class": "RNALine",
      //  "stroke": "#666"
      //});

      buckets = new Array(all_starts.length + all_ends.length);
      for (var i = 0; i < buckets.length; ++i) {
        if(i < all_starts.length) {
          var loc = all_starts[i];
          buckets[i] = {
          "type" : "donor",
          "loc": loc,
          "xStart": 0,
          "xEnd": 0,
          "anchor": 0,
          "xStartDesired": 0,
          "xEndDesired": 0,
          "firstGroupBucket": i,
          "lastGroupBucket": i
          }
        }
        else {
          var loc = all_ends[i - all_starts.length];
          buckets[i] = {
          "type" : "receptor",
          "loc": loc,
          "xStart": 0,
          "xEnd": 0,
          "anchor": 0,
          "xStartDesired": 0,
          "xEndDesired": 0,
          "firstGroupBucket": 0,
          }
        }
      }
      buckets.sort(function (a, b) {return a.loc < b.loc ? -1 : a.loc == b.loc ? 0 : 1});

      computeFlagPositions()

      var RNASites = RNAArea.selectAll(".RNASite").data(buckets);
      RNASites .exit().remove();

      var triangles = RNASites.enter().append("polyline").attr({
        "class": "RNASite",
        "type":function (d, i) {return d.type},
        "points": function (d, i) {
          return d.type ==  (positiveStrand ? "donor" : "receptor")  ? [
            0, RNAHeight/2,
            triangleLength, RNAHeight/2 - 5,
            triangleLength, RNAHeight/2 + 5,
            0, RNAHeight/2] :
            [
            triangleLength, RNAHeight/2,
            0, RNAHeight/2 - 5,
            0, RNAHeight/2 + 5,
            triangleLength, RNAHeight/2
          ]
        },
        "transform": function(d, i) {return "translate(" + d.xStart + ",0)"}
      })

      triangles.append("svg:title")
        .text(function (d, i) {
          return d.loc;
        });


      triangles.on('mouseover', function (d1, i1) {


        // == move crosshair there..
        event.fire("crosshair", axis.genePosToScreenPos(d1.loc))

        if (selectedIsoform != null || clickedElement != null)
          return;

        //TODO: hen -- fix this use multiple parameters
        event.fire("LocHighlight", {"loc": d1.loc, "highlight": true})

      }).on('mouseout', function (d1, i1) {
        if (selectedIsoform != null || clickedElement != null)
          return;
        //TODO: hen -- fix this use multiple parameters
        event.fire("LocHighlight", {"loc": d1.loc, "highlight": false})
      }).on("click", function(d) {
        if (this == clickedElement) {
          //TODO: hen -- fix this use multiple parameters
          event.fire("LocHighlight", {"loc":d.loc,"highlight": false});
          clickedElement = null;
        }
        else {
          //TODO: hen -- fix this use multiple parameters
          clickedElement = this;
          event.fire("LocHighlight", {"loc":d.loc,"highlight": true});
        }
      });

      RNASites.enter().append("polyline").attr({
        "class": "RNASiteConnector",
        "type":function (d, i) {return d.type},
        "points": function (d, i) {
          // var x1 =  d.type == "donor" ? d.xEnd : d.xStart;
          return [
            d.anchor, (RNAHeight + triangleLength)/2,
            d.anchor, RNAHeight/2 + triangleLength,
            axis.genePosToScreenPos(d.loc), RNAHeight,
          ]
        }
      })
  }

      function computeFlagPositions() {
        // compute desired positions
        for (var i = 0; i < buckets.length; ++i) {
          var axisLoc = axis.genePosToScreenPos(buckets[i].loc);
          if (buckets[i].type == "donor") {
            if (positiveStrand) {
              buckets[i].xStart = buckets[i].xStartDesired = axisLoc - triangleLength;
              buckets[i].xEnd = buckets[i].xEndDesired = axisLoc;
            }
            else {
              buckets[i].xStart = buckets[i].xStartDesired = axisLoc;
              buckets[i].xEnd = buckets[i].xEndDesired = axisLoc + triangleLength;
            }
          }
          else {
            if (positiveStrand) {
              buckets[i].xStart = buckets[i].xStartDesired = axisLoc;
              buckets[i].xEnd = buckets[i].xEndDesired = axisLoc + triangleLength;
            }
            else {
              buckets[i].xStart = buckets[i].xStartDesired = axisLoc - triangleLength;
              buckets[i].xEnd = buckets[i].xEndDesired = axisLoc;
            }
          }
        }


        bucketsCopy = buckets.slice();

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
            shift = Math.max(shift,  -bucketsCopy[firstInd].xStart)
            for (var j = firstInd; j <= i; ++j) {
              bucketsCopy[j].xStart += shift
              bucketsCopy[j].xEnd += shift
            }
            ind = firstInd;
          }
        }

        for (var i = 0; i < buckets.length; ++i) {
          var b = buckets[i];
          b.anchor = b.type == (positiveStrand ? "donor" : "receptor") ? b.xEnd : b.xStart;
        }
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

    function createSubBoxPlots(parent, edgeGroup) {

      var parentNode = d3.select(parent);

      var effectiveWidth = expandedWidth -  jxnBBoxWidth / 2;
      var subplotsContainer = parentNode.select(".subboxplotsContainer");

      var groupData = new Array(groups.length);
//      var groupIndices = new Array(groups.length);
      var sampleToGroup = [];
      for (var gr = 0; gr < groups.length; gr++) {
        var groupSamples = groups[gr].samples;
        groupData[gr] = []
        for (var sampleInd = 0; sampleInd < groupSamples.length; sampleInd++) {
          var sample = groupSamples[sampleInd]
          sampleToGroup[sample] = gr;
        }
//        groupIndices[gr] = 0;
      }

      groupData[groups.length] = [];

      for (var ind = edgeGroup.start; ind <= edgeGroup.end; ind++) {
        var sample = sortedWeights[ind].sample;
        var weight = sortedWeights[ind].weight;
        var gr = sampleToGroup[sample];
        if (gr >= 0)
          groupData[gr].push(weight);
        else
          groupData[groups.length].push(weight);
      }

      var groupsNum = groupData[groups.length].length > 0 ? groups.length + 1 : groups.length;

      for (var gr = 0; gr < groupData.length; gr++) {
        if (groupData[gr].length > 0) {

        var boxPlotData = groupData[gr].sort(d3.ascending);
        var boxplotInfo = computeBoxPlot(boxPlotData);
        var xShift = jxnBBoxWidth / 2 + effectiveWidth * (gr + 1) / (groupsNum + 1);
        var boxplot = createBoxPlot(subplotsContainer, "subboxplot",
          boxplotInfo.whiskerDown, boxplotInfo.whiskerTop, boxplotInfo.Q).attr({
          "transform": " translate(" + xShift + ", 0)"
        }).style({
            "opacity": 0
          });
        boxplot.selectAll(".jxnBBox").style({
          "fill" : gui.current.getColorForSelection(JSON.stringify(groups[gr]))
        })
        boxplot.transition().duration(400).style({
            "opacity": 1
          });
        parentNode.selectAll(".jxnCircle").filter(function (d) {
          var sampleGroup = sampleToGroup[d.sample];
          if (typeof sampleGroup == 'undefined')
            sampleGroup = groups.length;
          return sampleGroup == gr
        }).transition().duration(400).attr({
          "cx": function(d, i) {
            return xShift
          },
          "group-outlier": function(jxnData){
            return jxnData.weight < boxplotInfo.whiskerDown || jxnData.weight > boxplotInfo.whiskerTop
          }
        })
        }
      }
      updateDotVisibility();
    }

    function createBoxPlot(container, boxplotClass, whiskerDown, whiskerTop, Q) {
      var boxplot = container.append("g").attr({
        "class": boxplotClass
      });
      boxplot.append("line").attr({
        "class": "boxPlotLine",
        "stroke": "black",
        "stroke-dasharray": "3,3",
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

//      var jxnWrapper = boxPlotGroup.parentNode;
//      var wrapperParent =   jxnWrapper.parentNode;
   //   wrapperParent.removeChild(jxnWrapper);
//      wrapperParent.appendChild(jxnWrapper);

      var parentNode = d3.select(boxPlotGroup);
      parentNode.selectAll(".jxnContainer").attr({
        "width": expandedWidth,
      }).style({"visibility": "visible"})
        .transition().duration(300).style({
        "opacity": 1,
      }).each("end", callback);

        /*      boxplots.transition().duration(400).attr({
                "transform": transformation,
              });
              boxplots.selectAll(".boxPlotQLine").
                style({"stroke-dasharray": "5,5"})
                .transition().duration(400).attr({"x2": containerWidth});
        */

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

      parentNode.transition().duration(200).attr({
        "transform": function() {
          return  "translate(" + this.getAttribute("startX") + ", 0)"
        }
      })

      parentNode.selectAll(".jxnContainer").transition().duration(400).style({
        "opacity": 0,
        "stoke": "black",
    }).each("end", callback);

      removeSubboxplots(parentNode)

      // var boxplots = parentNode.selectAll(".boxplot");

/*      boxplots.selectAll(".boxPlotQLine")
        .transition().duration(400).attr({"x2": jxnBBoxWidth / 2}).each("end", function() {
          d3.select(this).style({"stroke-dasharray": ""})
        });
*/
      parentNode.selectAll(".jxnCircle").transition().duration(400).attr({
        "cx": 0,
      })
//      parentNode.transition().delay(400).selectAll(".boxPlotLine").style({
//        "visibility": "visible"
//      });

    }

    function expandIsoform(isoform) {

      var numOfJunctions = allIsoforms[isoform.isoform].exons.length - 1;

      var availableWidth = width - weightAxisCaptionWidth - jxnWrapperPadding;
      var expandedSpace = Math.min(200, availableWidth / numOfJunctions);

      var totalWidth = expandedSpace * numOfJunctions;

      var activeEdgeGroups = d3.selectAll(".edgeGroup").filter(function () {
        var include = this.getAttribute("ActiveIsoform") == isoform.index;
        if (!include)
          d3.select(this).style({
            "opacity": 0
            })
        return include;
      })

      var leftMostGroupX = width, rightMostGroupX = 0;

      activeEdgeGroups.each(function (d) {
        console.log("Group: " + d.start + " - " + d.end)
        var x = axis.genePosToScreenPos(this.getAttribute("startLoc"));
        leftMostGroupX = Math.min(leftMostGroupX, x);
        var x = axis.genePosToScreenPos(this.getAttribute("endLoc"));
        rightMostGroupX = Math.max(rightMostGroupX, x);
      })

      var startX = (rightMostGroupX + leftMostGroupX - totalWidth) / 2
      startX = Math.min(startX, availableWidth - totalWidth)
      startX = Math.max(startX, weightAxisCaptionWidth + jxnWrapperPadding)
      expandedWidth = expandedSpace - 2 * jxnBBoxWidth;
      activeEdgeGroups.each(function(d, i) {
        d3.select(this).transition().duration(200).attr({
          "transform": function() {
            return "translate(" + (startX + i * expandedSpace) + ", 0)"
          }
        }).each("end", function() {
          expandJxn(this);
        })
        var startLoc = this.getAttribute("startLoc");
        var endLoc = this.getAttribute("endLoc");
        d3.selectAll(".edgeConnector").filter(function () {
          return startLoc == this.getAttribute("startLoc") &&
          endLoc == this.getAttribute("endLoc");
          }).transition().duration(200).attr({
          "x1":  startX + i * expandedSpace + groupWidth / 2
        });

      })
      expandedIsoform = isoform;
    }

    function createGroups(activeIsoformIndex) {

      if (groups.length >= sampleLength)
        return ;

      showSubboxplots = true;

      d3.selectAll(".edgeGroup").each(function (d) {
        if (this.getAttribute("ActiveIsoform") == activeIsoformIndex) {
          removeSubboxplots(d3.select(this));
          createSubBoxPlots(this, d);
/*          if (showDotGroups && (groups.length > 0)) {
          }
          else {
            sortDots(this)
          }
          */
        }
      })
    }

    function collapseIsoform(isoform, callback) {
    var selection = d3.selectAll(".edgeGroup").style({
          "opacity" : "0.1"
    }).filter(function (d, i) {
      return this.getAttribute("ActiveIsoform") == isoform.index;
    }).style({
        "opacity" : "1"
      })
    var size = 0;
    selection.each(function() { size++; });
    selection.each(function (d, i) {
      var parentNode = d3.select(this)

      collapseJxn(parentNode, function () {
        parentNode.selectAll(".jxnContainer").style({
          "visibility": "hidden",
        })
        if ((i == size - 1) && callback)
          callback()
      })
    })
    d3.selectAll(".edgeConnector").transition().duration(200).attr({
        "x1":  function() {
          return this.getAttribute("anchorX");
        }
    });
    expandedIsoform = null;
  }

    function deSelectIsoforms() {
      showSubboxplots = false;
      updateDotVisibility();
      d3.selectAll(".edgeConnector").style({
        "visibility": function() {
          return this.getAttribute("type") == "donor" ? "hidden" : "visible"
        }
      })
      d3.selectAll(".RNASite, .RNASiteConnector, .JXNAreaConnector, .jxnWrapperBox, .edgeAnchor, .edgeConnector, .edgeGroup")
        .transition().duration(200).style({
          "opacity" : 1,
        })
      selectedIsoform =  null;
    }

    function selectIsoform(data) {
      if (data.index == -1) {
        deSelectIsoforms();
        return;
      }

      d3.selectAll(".jxnWrapperBox").
        transition().duration(300).style({
          "opacity" : 0.1
        })

      d3.selectAll(".RNASite, .RNASiteConnector, .JXNAreaConnector, .edgeAnchor, .edgeGroup").style({
        "opacity" : 0.1,
      })
      d3.selectAll(".edgeConnector").style({
        "opacity" : 0,
      })

      var exonIDs = allIsoforms[data.isoform].exons;

      var lastExonEnd = -1;
      for (var exonInd = 0; exonInd < exonIDs.length; exonInd++) {
        var exon = allExons[exonIDs[exonInd]]

//        console.log(exon.start + "- " + exon.end);

        d3.selectAll(".RNASite, .RNASiteConnector").filter(function (d) {
          return d.loc == exon.start || d.loc == exon.end
        }).style({
          "opacity": 1,
        })

        d3.selectAll(".edgeAnchor, .edgeConnector, .edgeGroup").filter(function () {
          var startLoc = this.getAttribute("startLoc");
          var endLoc = this.getAttribute("endLoc");
          var include = positiveStrand ? (startLoc == lastExonEnd && endLoc == exon.start)
            : endLoc == lastExonEnd && startLoc == exon.start;
          if (include && this.getAttribute("class") == "edgeGroup") {
            d3.select(this).attr({
              "ActiveIsoform": data.index
            })
          }
          return include;
        }).style({
          "opacity": 1,
          "visibility": "visible"
        })

        lastExonEnd = exon.end;
      }

          /* .each(function() {
          var classAttr = this.getAttribute("class");
          var startLoc = this.getAttribute("startLoc");
          var endLoc = this.getAttribute("endLoc");

          if (startLoc != d1.loc &&  endLoc != d1.loc) {
            d3.select(this).style({"opacity" : 0.1})
          }
          else if (classAttr == "edgeConnector") {
            var otherLoc = startLoc == d1.loc ? endLoc : startLoc;
            RNAArea.selectAll(".RNASites, .RNASiteConnector").each(function (d2) {
              if (d2.loc == otherLoc) {
                d3.select(this).style({"opacity" : 1})
              }
            })
            d3.selectAll(".JXNAreaConnector").each(function (d2) {
              if (this.getAttribute("loc") == otherLoc) {
                d3.select(this).style({"opacity" : 1})
              }
            })
          }
        })
        */
      selectedIsoform = data;
    }

    function updateIsoformVis(isoform) {
      if (showSelectedIsoform == "compact") {
      }
      else if (showSelectedIsoform == "groups") {

      }
      else {
      }
    }

    function sortDots(isoformInd, jxn) {


      var indices = new Array(sampleLength);
      var arrayLen = jxn.end - jxn.start + 1;
      var shift = sampleLength - arrayLen;
      for (var ind = jxn.start; ind <= jxn.end; ind++) {
        indices[sortedWeights[ind].sample] = shift + (ind - jxn.start);
      }


/*      var indices = [];
      for (var i = 0; i < activeJxnWeights.length; ++i) indices.push(i);
        indices.sort(function (a, b) { return activeJxnWeights[a] < activeJxnWeights[b] ? -1 : 1; });
 */

      xJxnBoxScale.domain([0, indices.length - 1]).range([jxnBBoxWidth + 3 * dotRadius, expandedWidth - 3 * dotRadius])

      var newKeysCount = 0;

      d3.selectAll(".edgeGroup").filter(function() {
        return this.getAttribute("ActiveIsoform") == isoformInd;
      }).each(function(d) {

        var thisNode = d3.select(this);

        var containerColor = (d == jxn) ? "orange" : "black";
        thisNode.select(".jxnContainer").style({
          "stroke": containerColor,
        })


        thisNode.selectAll(".jxnCircle").transition().duration(400).attr({
          "cx": function(d, i) {
            var dataSample = d.sample;
            if (indices[dataSample] === undefined ) {
              indices[dataSample] = newKeysCount++;
            }
            return xJxnBoxScale(indices[dataSample])
          },
        })

/*        var axis = that.axis;
        var srcMid = (axis.getXPos(curExons[srcExonInd][0]) + axis.getXPos(curExons[srcExonInd][1])) / 2;
        var targetMid = (axis.getXPos(curExons[targetExonInd][0]) + axis.getXPos(curExons[targetExonInd][1])) / 2;
        var plotMid = (srcMid + targetMid) / 2;



 */
      })
    }

    //globalCallCount = 1;

    gui.current.addUpdateEvent(updateVisualization)
    //updateVisualization();
    return head.node();
  };

  exports.GenomeVis = GenomeVis;
  exports.create = create;
});
