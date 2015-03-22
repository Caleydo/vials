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



    var gIso = svg.append("g").attr({
      class:"abundances",
      "transform":"translate("+margin.left+","+margin.top+")"
    })

    var sampleGroups;
    // var groupMargin = 10;
    var exonHeight = 30;
    var scatterWidth = 200;
    var sampleScaleY = function(x){ return x*(exonHeight+3)};

    // create crosshair
    var crosshair = svg.append("line").attr({
      "class":"crosshair",
      "x1":0,
      "y1":0,
      "x2":50,
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
      crosshair.attr({
        "x1":x,
        "x2":x
      }).style({
        opacity:function(){
          return x>that.axis.getWidth()?0:1
        }
      })

    }

    event.on("crosshair", updateCrosshair);




    function drawSamples(samples, minMaxValues, g){

      var exonHeight = 30;
      var scatterWidth = 200;
      var axisOffset =  that.axis.getWidth() + 10;
      var noSamples = samples.length;

      // crosshair update
      crosshair.attr({
        "y2":height+margin.top+margin.bottom
      })



      var scaleY = function(x){ return x*(exonHeight+3)};
      var scaleXScatter = d3.scale.linear().domain([0,minMaxValues[1]]).range([axisOffset, width])
      var heightScale = d3.scale.linear().domain(minMaxValues).range([exonHeight,0]);

      that.lineFunction = d3.svg.line()
                            .x(function(d,i){return that.axis.arrayPosToScreenPos(i)})
                            .y(function (d) {return heightScale(d)})


      /*
       * ========================
       * Manage .isoform - Groups
       * =========================
       * */
      var abundance = g.selectAll(".abundance").data(samples, function (d) {return d.sample });
      abundance.exit().remove();

      // --- adding Element to class isoform
      var abundanceEnter = abundance.enter().append("g").attr({
        "class":"abundance"
      })

      // --- changing nodes for isoform
      abundance.attr({
        "transform":function(d,i) {return "translate("+0+","+sampleScaleY(i)+")";}
      })


      /*
       * reactive background
       * */
      abundanceEnter.append("rect").attr({
        width:that.axis.getWidth(),
        height:exonHeight,
        class:"background"
      }).on({
        "mouseover": function(){d3.select(this).classed("selected", true);},
        "mouseout": function(){d3.select(this).classed("selected", false);},
        "click":function(d, i){
          console.log(d,i);
          var el = d3.select(this);
          if (el.classed("fixed")){
            el.classed("fixed", false);
            //currentlySelectedIsoform = null;
            //event.fire("isoFormSelect", {isoform: d.id, index:-1});
          } else{
            el.classed("fixed", true);
            //if (currentlySelectedIsoform) currentlySelectedIsoform.classed("fixed", false);
            //currentlySelectedIsoform = el;
            //event.fire("isoFormSelect", {isoform: d.id, index:i})
          }

        }
      })

      abundanceEnter.append("path").attr({
            "class":"abundanceGraph",
            "d":function(d){return that.lineFunction(d.weights)}
      })

      //
      ///*
      // * ========================
      // * Draw exon abstractions
      // * =========================
      // * */
      //
      //var exon = abundance.selectAll(".exon").data(function(d){return d.ranges});
      //exon.exit().remove();
      //
      //// --- adding Element to class exons
      //var exonEnter = exon.enter().append("rect").attr({
      //  "class":"exon",
      //  height:exonHeight
      //  //y:exonHeight
      //})
      //
      //// --- changing nodes for exons
      //exon.attr({
      //  width: function(d,i){
      //    return that.axis.genePosToScreenPos(d.end)-that.axis.genePosToScreenPos(d.start)
      //  },
      //  x:function(d){return that.axis.genePosToScreenPos(d.start);}
      //})
      //
      //
      ///*
      // * ===============
      // * Draw samples
      // * ===============
      // * */
      //
      ////console.log(that.axis);
      //
      //
      //
      //var sampleSelectorMap = {};
      //isoformList[0].weights.forEach(function(d,i){
      //  sampleSelectorMap[d.sample] = i;
      //})
      //
      //function cleanSelectors(sel){return sampleSelectorMap[sel]}
      //
      //var sampleDot = abundance.selectAll(".sampleDot").data( function(d,i){return d.weights} );
      //sampleDot.exit().remove();
      //
      //// --- adding Element to class sampleDot
      //var sampleDotEnter = sampleDot.enter().append("circle").attr({
      //  "class":function(d){return "sampleDot sample"+ cleanSelectors(d.sample);},
      //  r:3
      //
      //}).on({
      //  "mouseover":function(d){svg.selectAll(".sample"+ cleanSelectors(d.sample)).classed("highlighted", true);},
      //  "mouseout":function(d){svg.selectAll(".sample"+ cleanSelectors(d.sample)).classed("highlighted", false);}
      //})
      //
      //// --- changing nodes for sampleDot
      //sampleDot.attr({
      //  cx: function(d){return  scaleXScatter(d.weight)},
      //  cy: function(){return exonHeight/4+Math.random()*exonHeight/2}
      //})

    }

    function drawLinesGroup(sampleData, g) {
      if (sampleData.length <= 1) {
        g.selectAll(".linesGroup").remove();
        return;
      }

      var axisWidth = that.axis.getWidth();

      var linesGroup = g.selectAll(".linesGroup");
      if (linesGroup.empty()) {
        linesGroup = g.append("g").attr({
          "class": "linesGroup",
          "transform": "translate(" + (scatterWidth - 10) + ",0)"
        });

        linesGroup.append("line")
        .attr({
         "class": "v",
         "x1": axisWidth + 20,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(0) + exonHeight / 2 + 5,
         "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
         "stroke": "black",
       });

        linesGroup.append("line")
        .attr({
         "class": "top",
         "x1": axisWidth + 10,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(0) + exonHeight / 2 + 5,
         "y2": sampleScaleY(0) + exonHeight / 2 + 5,
         "stroke": "black",
       });

        linesGroup.append("line")
        .attr({
         "class": "bottom",
         "x1": axisWidth + 10,
         "x2": axisWidth + 20,
         "y1": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
         "y2": sampleScaleY(sampleData.length) + exonHeight / 2 - 5,
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

        var buttonHeight = this.collapse? 1 : sampleScaleY(sampleData.length / 2) + exonHeight / 2 - 5;
        var aggregateButton = buttonGroup.append("rect")
        .attr({
          "class": "aggregateButton",
          "fill": this.aggregate ? "black" : "white",
          "stroke": "black",
          "width": 10,
          "height": 10,
          "x": 20,
        }).on("click", function() {

        })
      }

      linesGroup.selectAll(".buttonGroup").attr({
        "transform": "translate(" + (axisWidth + 15) + "," + buttonHeight + ")",
      });
      linesGroup.selectAll(".collapseButton").attr({
        "fill": this.collapse ? "black" : "white"
      });
      // linesGroup.selectAll(".aggregateButton").transition().attr({
      //   "visibility": this.collapse ? "visible" : "hidden",
      //   "fill": this.aggregate ? "black" : "white"
      // });
    }

    function drawGroups(groupData, minMax) {
      var group = gIso.selectAll(".sampleGroup").data(groupData, function (g) {return g.map(function(d) {return d.sample}) });
      group.exit().remove();

      var groupEnter = group.enter().append("g").attr({
        "class":"sampleGroup"
      })

      var noSamplesBefore = 0;
      var groupScaleY = function(x, noSamplesBefore){return noSamplesBefore*(exonHeight+3)+20};
      group.attr({
        "transform":function(d,i) {
          groupPos = groupScaleY(i, noSamplesBefore);
          noSamplesBefore += d.length;
          return "translate("+0+","+groupPos+")";
        }
      })

      groupEnter.each(function(sampleData) {
        drawLinesGroup(sampleData, d3.select(this));
      })

      group.each(function(sampleData) {
        drawSamples(sampleData, minMax, d3.select(this));
      })
    }

    function axisUpdate(){

      //that.lineFunction.x(function(d,i){return that.axis.arrayPosToScreenPos(i)});


      gIso.selectAll(".abundanceGraph").attr({
        "d":function(d){return that.lineFunction(d.weights)}
        //opacity:.1
      })

    }

    function getGroup(sample) {
      var groupID;
      sampleGroups.forEach(function(g, i) {
        if (g.samples.indexOf(sample) >= 0) {
          groupID = i;
        }
      })
      return groupID;
    }

    function groupData(readData) {
      var grouped = sampleGroups.map(function() {return []});
      readData.forEach(function(d, i) {
        var groupID = getGroup(d.sample);
        grouped[groupID].push(d)
      })
      console.log(grouped.length, grouped)
      return grouped;
    }

    function joinGroups(groupIDs) {
      console.log(sampleGroups)
      var combinedSamples = groupIDs.reduce(function(samples, groupID) {
                                              return samples.concat(sampleGroups[groupID].samples)
                                            }, []);

      var newGroup = {"samples": combinedSamples, "collapse": false};
      sampleGroups = sampleGroups.filter(function(g, i) {return groupIDs.indexOf(i) < 0}).concat([newGroup]);
    }

    function updateData(){
      var
        curGene = gui.current.getSelectedGene(),
        startPos = gui.current.getStartPos(),
        baseWidth = gui.current.getBaseWidth(),
        curProject = gui.current.getSelectedProject();

      that.data.getGeneData(curProject, curGene).then(function(sampleData) {
        //d3.nest().key(function(k){return k.key}).map(a)
        var minmaxCand = [];
        sampleData.measures.reads.forEach(function (read) {
          minmaxCand.push(read.min);
          minmaxCand.push(read.max);
        })
        var minMax = d3.extent(minmaxCand)

        //console.log("used iso:",usedIsoforms, minMax);

        var noSamples = sampleData.measures.reads.length;

        var axisOffset =  that.axis.getWidth() + 10;
        width = axisOffset + scatterWidth;
        height = (exonHeight+3)*noSamples;
        svg.attr("height", height+margin.top+margin.bottom)
          .attr("width", width + margin.left + margin.right);

        var readData = sampleData.measures.reads;
        if (sampleGroups === undefined) {
          sampleGroups = []
          readData.forEach(function(d, i) {
            sampleGroups.push({"samples": [d.sample], "collapse": false});
          })
        }
        joinGroups([0, 1, 2]);
        joinGroups([4, 5, 6, 7]);
        console.log(sampleGroups.map(function(g){return g.samples}))

        drawGroups(groupData(readData), minMax)
      })

    }


    gui.current.addUpdateEvent(updateData);


    event.on("axisChange", axisUpdate)

    return head.node();

  }





  exports.IsoFormVis = SimpleReadsVis;
  exports.create = create;


})
