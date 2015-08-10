
/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/9/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */


define(['exports', 'd3', './vials-gui', '../caleydo_core/event','vials-helper'], function (exports, d3, gui, event, helper) {
  /**
   * a simple template class of a visualization. Up to now there is no additional logic required.
   * @param data
   * @param parent
   * @constructor
   */
  function VialsJunctionVis(data, parent) {
    this.data = data;
    this.parent = parent;
    this.node = this.build(d3.select(parent));
  }

  /**
   * factory method of this module
   * @param data the data to show
   * @param parent the parent dom element to append
   * @returns {VialsJunctionVis} the visualization
   */
  function create(data, parent) {
    return new VialsJunctionVis(data, parent);
  }

  // GLOBAL VARIABLES & STATUS
  var margin = {top: 40, right: 150, bottom: 20, left: 150};
  var fullHeight = 370;
  var height = fullHeight - margin.top - margin.bottom;

  var abundancePlot={
    height:200,
    prefix:"jxn_weight",
    y:0,
    elements:{
      minWidth:10
    }
  }

  var connectorPlot={
    height:100,
    prefix:"jxn_con",
    y:abundancePlot.height,
    upperConnectors:{
      height:60,
      prefix:"jxn_con_upper",
      y:0
    },
    triangles:{
      height:8,
      y:60,
      prefix:"jxn_con_triangle"
    }
    ,
    lowerConnectors:{
      height:100-(60+8),
      prefix:"jxn_con_lower",
      y:60+8
    }
  }

  var heatmapPlot = {
    height:15,
    prefix:"jxn_heat",
    y:abundancePlot.height+connectorPlot.height
  }


  /**
   * build the vis and return node
   * @param $parent - the d3 selection of parent node
   * @returns {Node} the node
   */
  VialsJunctionVis.prototype.build = function ($parent) {

    /*
     ================= INIT =====================
     */


    //-- initial parametrization:
    var that = this;
    var axis = that.data.genomeAxis;
    var width = axis.getWidth();

    // data var:
    var allData = {};
    var triangleData = [];




    //--  create the outer DOM structure:
    var head = $parent.append("div").attr({
      "class":"gv"
    })
    var svg = head.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style({
        "left":"20px",
        "position":"relative"
      })

    //--  create textLabel and retrieve its width
    var textLabelPadding = helper.drawSideLabel(svg, height, margin,'center');

    //--  create a group offset by the label
    var svgMain = svg.append("g").attr({
      "class": "jxnMain",
      "transform": "translate(" + textLabelPadding + ",0)"
    });

    heatmapPlot.g = svgMain.append("g").attr({
      "transform":"translate("+0 + "," + heatmapPlot.y + ")",
      "class":heatmapPlot.prefix+"_group"
    });

    var crosshairGroup = svgMain.append("g").attr({
      "transform":"translate("+0 + "," + heatmapPlot.y + ")",
      "class":"crosshair_group"
    });

    connectorPlot.g =  svgMain.append("g").attr({
      "transform":"translate("+0 + "," + connectorPlot.y + ")",
      "class":connectorPlot.prefix+"_group"
    });

    ["triangles","upperConnectors","lowerConnectors"].forEach(function(subGroup){
      connectorPlot[subGroup].g = connectorPlot.g.append("g").attr({
        "transform":"translate("+0 + "," + connectorPlot[subGroup].y + ")",
        "class":connectorPlot[subGroup].prefix+"_group"
      });
    });


    function initView(){

      // create crosshair
      crosshairGroup.append("line").attr({
        "class":"crosshair",
        "x1":0,
        "y1":0,
        "x2":0,
        "y2":fullHeight-heatmapPlot.y
      }).style({
        "stroke-width":"1",
        "stroke":"black",
        "pointer-events":"none"
      });

      crosshairGroup.append("text").attr("class", "crosshairPos")

      var currentX = 0;
      heatmapPlot.g.on("mousemove", function () {
        currentX = d3.mouse(this)[0];
        //console.log("mouse", currentX);
        event.fire("crosshair", currentX);

      })

    }



    /*
    ================= DRAW METHODS =====================
     */



    function updateCrosshair(event, x){
      var visible = (x < 0 || x > axis.getWidth()) ? "hidden" : "visible";

      crosshairGroup.selectAll(".crosshair").attr({
        "x1":x,
        "x2":x,
        "visibility":visible
      })

      d3.selectAll(".crosshairPos")
        .text(function(d) {return axis.screenPosToGenePos(x)})
        .each(function() {
          var self = d3.select(this),
            bb = self.node().getBBox();
          self.attr({
            "x": x + 10,
            "y": fullHeight-heatmapPlot.y - bb.height/2,
            "visibility":visible
          });
        })
    }


    // -- HEATMAP PLOT --
    function updateHeatmap() {
      // bind local data
      var allIsoforms = allData.gene.isoforms;
      var allExons = allData.gene.exons;
      var heatMapGroup = heatmapPlot.g;

      // collect exons:
      var collectExons = []
      Object.keys(allIsoforms).forEach(function (key) {
        allIsoforms[key].exons.forEach(function (exon) {
          collectExons.push(allExons[exon])
        })
      })

      // --- D3 update cycle
      var exonHeat = heatMapGroup.selectAll(".exon").data(collectExons);
      exonHeat.exit().remove();

      // --- adding Element to class exon
      var exonHeatEnter = exonHeat.enter().append("rect").attr({
        "class": heatmapPlot.prefix+" exon",
        y: 0,
        height: heatmapPlot.height
      })

      // --- changing attr for exon
      exonHeat.attr({
        x: function (d) {
          return axis.genePosToScreenPos(d.start);
        },
        width: function (d) {
          return axis.genePosToScreenPos(d.end) - axis.genePosToScreenPos(d.start);
        }
      })






    }





    /**
     * update flag drawing
     * hidden option is boolean for animation = false
     */
    function updateFlags() {

      var animate = arguments[0] || false;
      var triangleLength = connectorPlot.triangles.height;
      var positiveStrand = allData.gene.strand === '+';

      var triangles = connectorPlot.triangles.g.selectAll(".triangle").data(triangleData);
      triangles.exit().remove();

      triangles.enter().append("polygon").attr({
        "transform":"translate("+0+","+0+")"
      }).on({
        "mouseover":function(d){
          event.fire("crosshair", axis.genePosToScreenPos(d.loc));
        }
      })

      triangles.attr({
        "class": function(d){return connectorPlot.triangles.prefix+" triangle "+ d.type;},
        "points": function (d, i) {
          return isLeftArrow(d.type, positiveStrand)?
            [
              0, triangleLength/2,
              triangleLength, 0,
              triangleLength, triangleLength
            ] : [
            triangleLength, triangleLength/2,
            0, 0,
            0, triangleLength
          ]
        }
      })

      var trans = triangles;
      if (animate) trans = triangles.transition();

      trans.attr({
        "transform": function(d, i) {return "translate(" + d.xStart + ",0)"}
      })

    }

    function updateConnectors(){
      var triangleLength = connectorPlot.triangles.height;



      /* -- update lower connectors - D3 circle -- */
      var lowerConnector = connectorPlot.lowerConnectors.g.selectAll(".con").data(triangleData);
      lowerConnector.exit().remove();

      lowerConnector.enter().append("polyline").attr({
        "class": connectorPlot.lowerConnectors.prefix+" con"
      })

      lowerConnector.attr({
        "points": function (d, i) {
          return [
            d.anchor, 0,
            d.anchor, triangleLength/2,
            axis.genePosToScreenPos(d.loc), connectorPlot.lowerConnectors.height
          ]
        }
      })

    }

    /*
     ================= LAYOUT METHODS =====================
     */


    function computeFlagPositions() {

      var triangleLength = connectorPlot.triangles.height;
      var sitePadding = triangleLength/3;

      var positiveStrand = allData.gene.strand === '+';

      // compute desired positions
      triangleData.forEach(function(triangle,i){
        var axisLoc = axis.genePosToScreenPos(triangle.loc);

        if (isLeftArrow(triangle.type, positiveStrand)){
          triangle.xStart = triangle.xStartDesired = axisLoc - triangleLength;
          triangle.xEnd = triangle.xEndDesired = axisLoc;
        }else{ // right arrow:
          triangle.xStart = triangle.xStartDesired = axisLoc;
          triangle.xEnd = triangle.xEndDesired = axisLoc + triangleLength;
        }

      })

      var bucketsCopy = triangleData.slice();

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

      triangleData.forEach(function(b){
        b.anchor = isLeftArrow(b.type, positiveStrand) ? b.xEnd : b.xStart;
      })
    }

    /*
     ================= HELPERMETHODS =====================
     */

    /**
     * a centralized method to decide if a flag is pointing left based on conditions
     * @param type - the site type (donor or receptor)
     * @param positiveStrand - boolean if on a positive strand
     * @returns {boolean}
     */
    function isLeftArrow(type, positiveStrand) {
      return type == ((positiveStrand || (!positiveStrand && !axis.ascending) ) ? "donor" : "receptor");
    }



    /*
     ================= GENERAL METHODS =====================
     */

    //var exploreArea = svgMain.append("g").attr("transform", "translate(0, 5)").attr("id","exploreArea");
    //jxnArea = exploreArea.append("g").attr("id", "jxnArea");


    function updateVis(){

      updateHeatmap();

      computeFlagPositions();
      updateFlags();
      updateConnectors();




    }



    function dataUpdate() {

      axis = that.data.genomeAxis;
      width = axis.getWidth();
      svg.attr("width", width + margin.left + margin.right+textLabelPadding)

      var curGene = gui.current.getSelectedGene();
      var curProject = gui.current.getSelectedProject();

      that.data.getGeneData(curProject, curGene).then(function (sampleData) {

        allData = sampleData;

        var positiveStrand = (sampleData.gene.strand ==='+');




        var jxns = sampleData.measures.jxns
        triangleData =
          jxns.all_starts.map(function(d,i){
            return {
              "type" : positiveStrand?"donor":"receptor",
              "loc": d,
              "xStart": 0,
              "xEnd": 0,
              "anchor": 0,
              "xStartDesired": 0,
              "xEndDesired": 0,
              "firstGroupBucket": i,
              "lastGroupBucket": i
            }
          }).concat(jxns.all_ends.map(function(d,i){
            return {
              "type" :  positiveStrand?"receptor":"donor",
              "loc": d,
              "xStart": 0,
              "xEnd": 0,
              "anchor": 0,
              "xStartDesired": 0,
              "xEndDesired": 0,
              "firstGroupBucket": 0
            }

          }));
        triangleData.sort(function (a, b) {return a.loc < b.loc ? -1 : a.loc == b.loc ? 0 : 1});



        updateVis();

      });


    }


    event.on("newDataLoaded", dataUpdate);
    event.on("crosshair", updateCrosshair);


    initView();


    return head.node();
  }





  exports.VialsJunctionVis = VialsJunctionVis;
  exports.create = create;

});


