/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 3/2/15.
 */


define(['exports', 'd3', 'altsplice-gui', '../caleydo/event'], function (exports, d3, gui, event) {
  /**
   * a simple template class of a visualization. Up to now there is no additional logic required.
   * @param data
   * @param parent
   * @constructor
   */
  function SimpleReadsVis(data, parent) {
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
    return new SimpleReadsVis(data, parent);
  }


  var margin = {top: 10, right: 10, bottom: 100, left: 0},
    width = 900 - margin.left - margin.right,
    height = 450 - margin.top - margin.bottom;

  var currentlySelectedIsoform = null;


  SimpleReadsVis.prototype.build = function($parent){
    var that = this;
    that.axis = that.data.genomeAxis;
    var head = $parent.append("div").attr({
      "class":"gv"
    })


    var svg = head.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({
        //"top":"10px",
        "left":"20px",
        "top":"10px",
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
    var svgLabelText = svgLabel.append("text").text("reads").attr({
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
      svgLabelText.attr("transform", "translate(" + (height+margin.top-bb.width)/2 + "," + (bb.height-3) + ")")
      svgLabel.attr("transform", "translate(0," + (height+margin.top) + ")" +
        "rotate(-90)");
    }
    drawViewLabel(height);

    var svgMain = svg.append("g").attr({
      "class": "readsMain",
      "transform": "translate(" + (bb.height+25) + ",0)"
    });

    var gIso = svgMain.append("g").attr({
      class:"abundances",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    function createLocalGui(){
      var gGui = svgMain.append("g").attr({
        class:"groupGUI",
        "transform":"translate("+margin.left+","+2+")"
      })

      // ==> group selected button

      var guiSel = gGui.append("g").attr({
        "id":"groupSelected"
      })
      guiSel.append("rect").attr({
        "class":"groupSelectedRect isoMenu",
        "width":150,
        "height": 20,
        "rx":3,
        "ry":3
      }).on({
        "mouseover":function(){d3.select(this).classed("selected", true)},
        "mouseout":function(){d3.select(this).classed("selected", null)},
        "click":function(){
          var allSelected = [];

          gIso.selectAll(".background.fixed")
            .each(function(d,i){
                allSelected.push(d.sample);
            })

          if (allSelected.length){
            var groupIDs = []
            allSelected.forEach(function(sample) {
              var group = getGroupFromSample(sample);
              if (group.samples.length == 1) {
                groupIDs.push(group.groupID);
              }
            })
            if (groupIDs.length > 1) {
              joinGroups(groupIDs);
            }
          }
        }


      })
      guiSel.append("text").attr({
        class:"groupSelectedRect isoMenuText",
        x:75,
        y:15
      }).style({
        "text-anchor":"middle",
        "pointer-events":"none"
      }).text("group selected")


      var guiDesel = gGui.append("g").attr({
        "id":"groupByX",
        "transform":"translate("+160+","+0+")"
      })
      guiDesel.append("rect").attr({
        "class":"ungroupSelectedRect isoMenu",
        "width":150,
        "height": 20,
        "rx":3,
        "ry":3
      }).on({
        "mouseover":function(){d3.select(this).classed("selected", true)},
        "mouseout":function(){d3.select(this).classed("selected", null)},
        "click":function(){
          gIso.selectAll(".sampleGroup").each(function(group) {
            if (group.selected) {
              ungroup(group)
            }
          })
        }
      })
      guiDesel.append("text").attr({
        class:"ungroupSelectedRect isoMenuText",
        x:75,
        y:15
      }).style({
        "text-anchor":"middle",
        "pointer-events":"none"
      }).text("ungroup selected")

      // ==> group by feature button
      var guiGroupBy = gGui.append("g").attr({
        "id":"groupByX",
        "transform":"translate("+320+","+0+")"
      })
      guiGroupBy.append("rect").attr({
        "class":"groupByXRect isoMenu",
        "width":150,
        "height": 20,
        "rx":3,
        "ry":3
      }).on({
        "mouseover":function(){d3.select(this).classed("selected", true)},
        "mouseout":function(){d3.select(this).classed("selected", null)},
        "click": function() {
          // generate meta groupings
          metaGroups = {}
          sampleGroups.forEach(function(group) {
            group.samples.forEach(function(sample) {
              var meta = getMetaFromSample(sample);
              if (!metaGroups[meta]) {
                metaGroups[meta] = []
              }
              metaGroups[meta].push(sample);
            })
            ungroup(group);
          })

          for (meta in metaGroups) {
            joinGroups(metaGroups[meta].map(function(sample) {return getGroupFromSample(sample).groupID}));
          }
        }
      })
      guiGroupBy.append("text").attr({
        class:"groupByXText isoMenuText",
        x:75,
        y:15
      }).style({
        "text-anchor":"middle",
        "pointer-events":"none"
      }).text("group by src")

    }

    createLocalGui();




    // create crosshair
    var crosshair = svg.append("line").attr({
      "class":"crosshair",
      "x1":0,
      "y1":0,
      "x2":0,
      "y2":height
    }).style({
      "stroke-width":"1",
      "stroke":"black",
      "pointer-events":"none"
    });

    var currentX = 0;
    svg.on("mousemove", function () {
      currentX = d3.mouse(this)[0];
      event.fire("crosshair", currentX);

    })

    function updateCrosshair(event, x){
      var visibility;
      if (x > that.axis.getWidth()) {
        visibility = "hidden";
      }
      else {
        visibility = "visible";
        crosshair.attr({
          "x1":x,
          "x2":x
        })
        if (dataType == "BodyMap") {
          svg.selectAll(".abundance .crosshairValue")
            .text(function(d) {return d.weights[that.axis.screenPosToArrayPos(x)].toFixed(3)})
            .each(function() {
              var self = d3.select(this),
              bb = self.node().getBBox();
              self.attr({
                "x": x + 15,
                "y": (sampleHeight + bb.height)/2
              });
            })
        }
      }
      svg.selectAll(".crosshair, .crosshairValue")
         .attr("visibility", visibility);
    }

    event.on("crosshair", updateCrosshair);

    var sampleSelectorMap = {} // will be updated at updateData()..


    function cleanSelectors(sel){return sampleSelectorMap[sel]}


    var sampleHeight = 30;

    function wrapText() {
      var textWidth = scatterWidth - 50;
      var self = d3.select(this),
      textLength = self.node().getComputedTextLength(),
      text = self.text();
      while (textLength > textWidth && text.length > 0) {
        text = text.slice(0, -1);
        self.text(text + '...');
        textLength = self.node().getComputedTextLength();
      }
    }

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

    var curProject;
    var dataType;
    var sampleInfo;
    var sampleGroups;
    var minMax;

    var scatterWidth = 200;
    var sampleScaleY = function(x){ return x*(sampleHeight+3)};
    var scaleXScatter;
    var heightScale;

    function getMetaFromSample(sample) {
      for (curSample in sampleInfo) {
        if (curSample == sample) {
          if (sampleInfo[curSample].meta)
            return sampleInfo[curSample].meta.disease; // TODO: list all meta keys to sort by
          else return "none";
        }
      }
    }

    function zipData(sampleData) {
      return sampleData[0].weights.map(function(s0, i) {
        return sampleData.map(function(s) {return s.weights[i]});
      })
    }

    dataFuncs = {
      "BodyMap": {
        "mean": function(zipped) {
          var mean = d3.svg.line()
            .x(function(d, i) {
              return that.axis.arrayPosToScreenPos(i);
            })
            .y(function(d, i) {
              return heightScale(d);
            })
            .interpolate('step');
          return mean(zipped);
        },
        "stdDev": function(zipped) {
          var stdDev = d3.svg.area()
            .x(function(d, i) {
              return that.axis.arrayPosToScreenPos(i);
            })
            .y0(function(d) {
              return heightScale(d3.mean(d)-std(d));
            })
            .y1(function(d) {
              return heightScale(d3.mean(d)+std(d));
            });
          return stdDev(zipped);
        },
        "line": function(sampleData) {
          var lineFunc = d3.svg.line()
              .x(function(d,i){return that.axis.arrayPosToScreenPos(i)})
              .y(function (d) {return heightScale(d)})
          return lineFunc(sampleData.weights);
        },
        "minMax": function(readData) {
          //d3.nest().key(function(k){return k.key}).map(a)
          var minmaxCand = [];
          // update the map between sample and a unique css-save selectorName
          sampleSelectorMap = {};
          readData.forEach(function (read, i) {
            minmaxCand.push(read.min);
            minmaxCand.push(read.max);
            sampleSelectorMap[read.sample] = i;
          })
          return d3.extent(minmaxCand)
        }
      },
      "TCGA": {
        "mean": function(zipped) {
          function meanData(exonWeights) {
            return d3.mean(exonWeights, function(d){return d.weight});
          }
          var mappedReads = this.mapReads(this.mapExons(zipped, meanData));
          var mean = d3.svg.line()
            .x(function(d, i) {
              return that.axis.genePosToScreenPos(d.pos);
            })
            .y(function(d, i) {
              return heightScale(d.weight);
            })
            .interpolate('step');
          return mean(mappedReads);
        },
        "stdDev": function(zipped) {
          function stdData(exonWeights) {
            return exonWeights.map(function(e) {return e.weight});
          }
          var stdDev = d3.svg.area()
            .x(function(d, i) {
              return that.axis.genePosToScreenPos(d.pos);
            })
            .y0(function(d) {
              return heightScale(d3.mean(d.weight)-std(d.weight));
            })
            .y1(function(d) {
              return heightScale(d3.mean(d.weight)+std(d.weight));
            })
            .interpolate('step');
          var mappedReads = this.mapReads(this.mapExons(zipped, stdData));
          return stdDev(mappedReads);
        },
        "line": function(sampleData) {
          var lineFunc = d3.svg.line()
              .x(function(d,i){return that.axis.genePosToScreenPos(d.pos)})
              .y(function (d) {return heightScale(d.weight)})
              .interpolate('step')
          var mappedReads = this.mapReads(sampleData.weights);
          return lineFunc(mappedReads);
        },
        "mapExons": function(zipped, f) {
          var exons = zipped.map(function(exon_weights, i) {
            // TODO: don't assume sorted from server side (though it is right now)
            return {
              "start": exon_weights[0].start,
              "end": exon_weights[0].end,
              "weight": f(exon_weights)
            }
          })
          return exons
        },
        "mapReads": function(exons) {
          var reads = []
          exons.forEach(function(e) {
            exonCoords = [
              {
                "pos": e.start,
                "weight": e.weight.length > 1 ? e.weight.map(function() {return 0}) : 0
              },
              {
                "pos": e.start,
                "weight": e.weight
              },
              {
                "pos": e.end,
                "weight": e.weight
              },
              {
                "pos": e.end,
                "weight": e.weight.length > 1 ? e.weight.map(function() {return 0}) : 0
              }
            ]
            reads = reads.concat(exonCoords)
          })
          return reads
        },
        "minMax": function(readData) {
          var minmaxCand = [];
          // update the map between sample and a unique css-save selectorName
          sampleSelectorMap = {};
          readData.forEach(function (read, i) {
            read.weights.map(function(exon) {
              minmaxCand.push(exon.weight);
            })
            sampleSelectorMap[read.sample] = i;
          })
          return d3.extent(minmaxCand)
        }
      }
    }


    function drawSamples(group){
      var g = group.g;
      var exonHeight = 30;
      var scatterWidth = 200;
      var axisOffset =  that.axis.getWidth() + 10;
      var noSamples = group.samples.length;

      // crosshair update
      crosshair.attr({
        "y2":height+margin.top+margin.bottom
      })


      /*
       * ========================
       * Manage .isoform - Groups
       * =========================
       * */
      var abundance = g.selectAll(".abundance").data(group.data, function (d) {return d.sample});
      abundance.exit().remove();

      // --- adding Element to class isoform
      var abundanceEnter = abundance.enter().append("g").attr({
        "class":"abundance"
      })

      /*
       * reactive background
       * */
      abundanceEnter.append("rect").attr({
        height:exonHeight,
        class:"background"
      }).on({
        "mouseover": function(d){
          var group = getGroupFromSample(d.sample);
          if (group.collapse) {
            event.fire("groupHighlight", group.groupID, true);
          }
          else {
            event.fire("sampleHighlight", d.sample, true);
          }
          d3.select(this).classed("selected", true);
        },
        "mouseout": function(d){
          var group = getGroupFromSample(d.sample);
          if (group.collapse) {
            event.fire("groupHighlight", group.groupID, false);
          }
          else {
            event.fire("sampleHighlight", d.sample, false);
          }
          d3.select(this).classed("selected", false);
        },
        "click":function(d, i){
          var el = d3.select(this);

          // whether element is selected
          var isSelected = !el.classed("fixed");

          var group = getGroupFromSample(d.sample);

          if (group.collapse) {
            // toggle group selection
            group.selected = isSelected;
            event.fire("groupSelect", group.groupID, isSelected);
          }
          else {
            event.fire("sampleSelect", d.sample, isSelected);
          }
        }
      })

      abundanceEnter.append("path").attr({
            "class":"abundanceGraph"
      })

      abundanceEnter.append("text").attr("class", "crosshairValue");

      var sampleName = function(d) {return d.sample};
      drawLabelGroup(abundanceEnter, sampleName, sampleName, ["sample"])

      // update !!!
      abundance.select(".abundanceGraph").attr({
        "class": function(d){return "abundanceGraph sample" +  cleanSelectors(d.sample)},
        "d":function(d){return dataFuncs[dataType].line(d)}
      })

      abundance.select(".background").attr({
        width:that.axis.getWidth()
      })
    }

    function expandGroups() {
      repositionGroups();
      var groups = gIso.selectAll(".sampleGroup");
      groups.each(function(group, i) {
        var g = d3.select(this);
        // on collapse
        if (group.collapse) {
          // deselect all samples
          g.selectAll(".background").each(function(d) {
            event.fire("sampleSelect", d.sample, false);
            summarizeData(group)
          });
        }
        else if (group.selected) {
          // deselect group
          event.fire("groupSelect", group.groupID, false);
          // select all samples
          group.g.selectAll(".background").each(function(d) {
            event.fire("sampleSelect", d.sample, true);
          });
        }
      })
    }

    event.on("groupSelect", function(e, groupID, isSelected) {
      var group = getGroup(groupID);
      if (group && group.samples) event.fire("sampleGroupSelected", groupID, group.samples, isSelected)
      group.selected = isSelected;
      drawSelectionMark(group.g, "group", groupID, isSelected);
      var allBG = group.g.selectAll(".background");
      allBG.classed("fixed", isSelected);
      if (!isSelected) {
        gui.current.releaseColorForSelection(JSON.stringify(groupID));
      }
    })

    event.on("sampleSelect", function(e, sample, isSelected){
      var group = getGroupFromSample(sample);
      var abundance = group.g.selectAll(".abundance").filter(function(d) {
                                                        return d.sample === sample
                                                      })
      drawSelectionMark(abundance, "sample", sample, isSelected);
      abundance.selectAll(".background").classed("fixed", isSelected);

      if (!isSelected) {
        gui.current.releaseColorForSelection(sample);
      }
    });

    function drawSelectionMark(g, type, identifier, isSelected) {
      var color = gui.current.getColorForSelection(type == "group" ? JSON.stringify(identifier) : identifier);
      var selMark = isSelected ? [color] : []

      g.each(function(){
        g.selectAll(".labelBox").attr("fill", isSelected ? color : "white");
        g.selectAll(".labelGroup text").attr("fill", isSelected ? "white" : "");
      })
    }

    function repositionGroups() {
      var noSamplesBefore = 0;
      var groupScaleY = function(x, noSamplesBefore){return noSamplesBefore*(sampleHeight+3)+20};
      var groups = gIso.selectAll(".sampleGroup").sort(function (group1, group2) {
        var sizeDiff = group2.samples.length - group1.samples.length;
        if (sizeDiff != 0) {
          return sizeDiff;
        }
        else {
          return d3.ascending(group1.samples[0], group2.samples[0])
        }
      });
      groups.transition().attr({
        "transform":function(d,i) {
          groupPos = groupScaleY(i, noSamplesBefore);
          noSamplesBefore += (d.collapse ? 1 : d.samples.length);
          return "translate("+0+","+groupPos+")";
        }
      })
      groups.each(function(group) {
        var g = d3.select(this);
        g.selectAll(".abundance").transition().attr({
          "transform":function(d,i) {
            i = group.collapse ? 0 : i;
            return "translate("+0+","+sampleScaleY(i)+")";
          }
        })
        redrawLineGroups(group);
        toggleOpacities(group);
      })
    }

    function redrawLineGroups(group) {
      var g = group.g;
      var noSamples = group.samples.length;
      var linesGroup = g.selectAll(".linesGroup");
      var linesGroupHeight = sampleScaleY(group.collapse ? 1 : noSamples) - 5
      linesGroup.selectAll(".v").transition().attr({
        "y2": linesGroupHeight,
      });
      linesGroup.selectAll(".bottom").transition().attr({
        "y1": linesGroupHeight,
        "y2": linesGroupHeight,
      });
      // var buttonHeight = group.collapse ? 1 : noSamples;
      // buttonHeight = (sampleScaleY(buttonHeight)-sampleScaleY(0))/ 2 - 5;
      buttonHeight = sampleScaleY(0);
      linesGroup.selectAll(".buttonGroup").transition().attr({
        "transform": "translate(" + (that.axis.getWidth() + 15) + "," + buttonHeight + ")",
      });
      linesGroup.selectAll(".collapseButton").attr({
        "fill": group.collapse ? "black" : "white"
      });
    }

    function drawLabelGroup(group, text, title, classes) {
      var labelGroup = group.append("g").attr({
        "class": "labelGroup",
        "transform": "translate(" + that.axis.getWidth() + ", 0)"
      })

      labelGroup.append("rect").attr({
        "class": "labelBox",
        "width": scatterWidth-35,
        "height": sampleHeight,
        "fill": "white"
      })

      if (classes) {
        classes.forEach(function(c) {
          labelGroup.classed(c, true);
        })
      }

      var label = labelGroup.append("text")
                            .attr("pointer-events", "none")
                            .text(text)
                            .each(wrapText);

      label.each(function() {
        var self = d3.select(this),
        bb = self.node().getBBox();
        self.attr("transform",
          "translate(10," + (sampleHeight + bb.height)/2 + ")"
        );
      })

      labelGroup.append("title").text(title);
    }

    function summarizeData(group) {
      var g = group.g;
      var summary = g.selectAll(".summary").data([group.data]);
      summary.exit().remove();
      var summaryEnter = summary.enter().append("g").attr({
        "class": "summary",
        "transform": "translate(0, 0)"
      });

      var groupText = group.groupID.meta != "none" ? " " + group.groupID.meta : group.groupID.samples.map(function(s) {return " " + s});
      groupText = "Group" + groupText;
      var titleText = "Group: \nMeta: " + group.groupID.meta + "\nSamples: "
                      + group.groupID.samples.map(function(s) {return "\n" + s});
      drawLabelGroup(summaryEnter, groupText, titleText);

      // TODO: zipping inside the dataFuncs object
      var zipped = zipData(group.data);
      summaryEnter.append("svg:path").attr({
        //"fill": "red",
        "class": "stdDev",
      })
      summary.selectAll(".stdDev").attr("d", dataFuncs[dataType].stdDev(zipped));
    }

    function toggleOpacities(group) {
        var g = group.g;
        g.selectAll(".abundanceGraph").transition().attr({
          "opacity": group.collapse ? 0 : 1
        });
        g.selectAll(".labelGroup.sample").transition().attr("visibility", group.collapse ? "hidden" : "visible");
        g.selectAll(".summary").transition().attr({
          "opacity": group.collapse ? 1 : 0
        });
    }

    function drawLinesGroup(group) {
      var g = group.g;
      var noSamples = group.samples.length;
      if (group.samples.length <= 1) {
        g.selectAll(".linesGroup").remove();
        return;
      }

      var axisWidth = that.axis.getWidth();

      var linesGroup = g.selectAll(".linesGroup");
      if (linesGroup.empty()) {
        linesGroup = g.append("g").attr({
          "class": "linesGroup",
          "transform": "translate(" + (scatterWidth - 40) + ",0)"
        });

        linesGroup.append("line").attr({
          "class": "v",
          "x1": axisWidth + 20,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(0) + 5,
          "y2": sampleScaleY(noSamples) - 5,
          "stroke": "black",
        });

        linesGroup.append("line").attr({
          "class": "top",
          "x1": axisWidth + 10,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(0) + 5,
          "y2": sampleScaleY(0) + 5,
          "stroke": "black",
        });

        linesGroup.append("line").attr({
          "class": "bottom",
          "x1": axisWidth + 10,
          "x2": axisWidth + 20,
          "y1": sampleScaleY(noSamples) - 5,
          "y2": sampleScaleY(noSamples) - 5,
          "stroke": "black",
        });

        var buttonGroup = linesGroup.append("g").attr({
          "class": "buttonGroup",
        });

        var collapseButton = buttonGroup.append("rect").attr({
          "class": "collapseButton",
          "stroke": "black",
          "width": 10,
          "height": 10,
          "x": 0,
        }).on("click", function(d) {d.collapse = !d.collapse; expandGroups()});
      }
    }

    function drawGroups() {
      var group = gIso.selectAll(".sampleGroup")
                      .data(sampleGroups, function (group) {
                        return group.data.map(function(d) {return d.sample})
                      })

      group.exit().remove();

      var groupEnter = group.enter().append("g").attr({
        "class":"sampleGroup"
      })

      group.each(function(group) {
        group.g = d3.select(this);
        drawSamples(group);
        drawLinesGroup(group);
      })

      expandGroups();
    }

    function axisUpdate(){
      //that.lineFunction.x(function(d,i){return that.axis.arrayPosToScreenPos(i)});

      gIso.selectAll(".abundanceGraph").attr({
        "d":function(d){return dataFuncs[dataType].line(d)}
        //opacity:.1
      })

      gIso.selectAll(".stdDev").attr({
        "d":function(d){
          var zipped = zipData(d);
          return dataFuncs[dataType].stdDev(zipped);
        }
      })

      repositionGroups();
    }

    function getGroup(groupID) {
      var foundGroup;
      sampleGroups.forEach(function(group, i) {
        if (group.groupID == groupID) {
          foundGroup = group;
        }
      })
      return foundGroup;
    }

    function getGroupFromSample(sample) {
      var foundGroup;
      sampleGroups.forEach(function(group) {
        if (group.samples.indexOf(sample) >= 0) {
          foundGroup = group;
        }
      })
      return foundGroup;
    }

    function groupData(readData) {
      sampleGroups.forEach(function(group) {
        group.data = [];
      })
      readData.forEach(function(d) {
        var group = getGroupFromSample(d.sample);
        group.data.push(d)
      })
    }

    function ungroup(group) {
      if (group.samples.length > 1) {
        var newGroups = [];
        // deselect group
        event.fire("groupSelect", group.groupID, false);
        // decompose into single sample groups
        group.data.forEach(function(sampleData) {
          var newGroup = {
            "groupID": {"samples": [sampleData.sample], "meta": [getMetaFromSample(sampleData.sample)]},
            "collapse": false,
            "selected": false,
            "samples": [sampleData.sample],
            "data": [sampleData]
          };
          newGroups.push(newGroup);
        })
        sampleGroups = newGroups.concat(sampleGroups.filter(function(curGroup) {return curGroup != group}));
        event.fire("groupingChanged", newGroups.map(function(group) {return group.groupID}), [group.groupID])
        drawGroups();
      }
    }

    function joinGroups(groupIDs) {
      var combinedData = groupIDs.reduce(function(newGroup, groupID) {
        var group = getGroup(groupID);
        group.samples.forEach(function(s) {event.fire("sampleSelect", s, false)})
        newGroup.data = newGroup.data.concat(group.data);
        newGroup.samples = newGroup.samples.concat(group.samples);
        return newGroup
      }, {"data": [], "samples": []});

      var meta = {};
      combinedData.samples.forEach(function(s) {meta[getMetaFromSample(s)] = null});
      meta = d3.keys(meta);

      var newGroup = {
        "groupID": {"samples": combinedData.samples, "meta": meta},
        "collapse": true,
        "selected": false,
        "samples": combinedData.samples,
        "data": combinedData.data
      };
      sampleGroups = [newGroup].concat(sampleGroups.filter(function(group) {return groupIDs.indexOf(group.groupID) < 0}));
      event.fire("groupingChanged", [newGroup.groupID], groupIDs)
      drawGroups();
    }

    function updateData(){
      axisUpdate();

      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth(),
        updatedProject = gui.current.getSelectedProject();

      that.data.getGeneData(updatedProject, curGene).then(function(sampleData) {
        dataType = sampleData.measures.data_type;
        sampleInfo = sampleData.samples;

        minMax = dataFuncs[dataType].minMax(sampleData.measures.reads);

        scaleXScatter = d3.scale.linear().domain([0,minMax[1]]).range([axisOffset, width])
        heightScale = d3.scale.linear().domain(minMax).range([sampleHeight,0]);


        var noSamples = sampleData.measures.reads.length;

        var axisOffset =  that.axis.getWidth() + 10;
        width = axisOffset + scatterWidth;
        height = (sampleHeight+3)*noSamples;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);
        drawViewLabel(height);

        var readData = sampleData.measures.reads;
        if (sampleGroups === undefined || updatedProject != curProject) {
          sampleGroups = []
          readData.forEach(function(d, i) {
            sampleGroups.push({
              "groupID": {"samples": [d.sample], "meta": [getMetaFromSample(d.sample)]},
              "collapse": false,
              "selected": false,
              "samples": [d.sample],
              "data": [d],
            });
          })
          event.fire("groupingChanged", sampleGroups.map(function(group) {return group.groupID}), [])
        }

        groupData(readData);
        drawGroups();

        curProject = updatedProject;
      })
    }


    gui.current.addUpdateEvent(updateData);


    event.on("axisChange", axisUpdate)


    // event handling for highlights
    function highlightSample(event, sample, highlight){

      svg.selectAll(".sample"+ cleanSelectors(sample)).classed("highlighted", highlight);
    }

    event.on("sampleHighlight", highlightSample)


    return head.node();

  }





  exports.IsoFormVis = SimpleReadsVis;
  exports.create = create;


})
