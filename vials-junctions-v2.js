
/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/9/15.
 * Based on work by Bilal Alsallakh and Joseph Botros
 */


define(['exports', 'd3', './vials-gui', '../caleydo_web/event','vials-helper'], function (exports, d3, gui, event, helper) {
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
  var height = 370 - margin.top - margin.bottom;

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

    connectorPlot.g =  svgMain.append("g").attr({
      "transform":"translate("+0 + "," + connectorPlot.y + ")",
      "class":connectorPlot.prefix+"_group"
    });

    ["triangles","upperConnectors","lowerConnectors"].forEach(function(subGroup){
      connectorPlot[subGroup].g = connectorPlot.g.append("g").attr({
        "transform":"translate("+0 + "," + connectorPlot[subGroup].y + ")",
        "class":connectorPlot[subGroup].prefix+"_group"
      });
    })



    /*
    ================= DRAW METHODS =====================
     */


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
     * update the flag drawing
     * hidden option is boolean for animation = false
     */
    function updateFlags() {

      var animate = arguments[0] || false;
      var triangleLength = connectorPlot.triangles.height;
      var positiveStrand = allData.gene.strand === '+';
      var RNAHeight = 50;


      var triangles = connectorPlot.triangles.g.selectAll(".triangle").data(triangleData);
      triangles.exit().remove();

      triangles.enter().append("polygon").attr({

        "transform":"translate("+0+","+0+")"
      })

      triangles.attr({
        "class": function(d){return connectorPlot.triangles.prefix+" triangle "+ d.type;},
        "points": function (d, i) {
          //return d.type ==  (positiveStrand ? "donor" : "receptor")  ?

          var isLeftArrow =  d.type ==  (positiveStrand ? "donor" : "receptor");
          //console.log(d.type, d.type ==  (positiveStrand ? "donor" : "receptor")  ? "<-":"->");


          return isLeftArrow?
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
          // var x1 =  d.type == "donor" ? d.xEnd : d.xStart;
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
        var isLeftArrow = triangle.type == (positiveStrand ? "donor" : "receptor");

        if (isLeftArrow){
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

      var isLeftArrow;
      triangleData.forEach(function(b){
        isLeftArrow = b.type == (positiveStrand ? "donor" : "receptor")
        b.anchor = isLeftArrow ? b.xEnd : b.xStart;
      })

      console.log(triangleData, bucketsCopy);



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


    return head.node();
  }





  exports.VialsJunctionVis = VialsJunctionVis;
  exports.create = create;

});


