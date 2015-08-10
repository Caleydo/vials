/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 8/9/15.
 */

define(['exports', 'd3', './vials-gui', '../caleydo_core/event'], function (exports, d3, gui, event) {

  var VialsHelper = function(){
    function VialsHelper(){

    }

    /**
     * creates the label for each view
     * @param svg - the outer SVG
     * @param height - the height for the visualization
     * @param margin - margin informations
     * @param align - alignment of label (right, center,..)
     * @returns {*} - padding width for the current label
     */
    VialsHelper.prototype.drawSideLabel = function(svg, height, margin, align) {
      var svgLabel = svg.append("g")
        .attr("transform", "translate(0," + (height + margin.top) + ")rotate(-90)");

      // create label bg and text:
      var svgLabelBg = svgLabel.append("rect").attr({
        "class": "viewLabelBg",
        "width": height + margin.top,
        "rx": 10,
        "ry": 10
      });
      var svgLabelText = svgLabel.append("text").text("junctions").attr({
        "class": "viewLabelText"
      });
      var bb = svgLabelText.node().getBBox();

      // adjust sizes after measuring text size:
      svgLabelBg.attr({"height": bb.height + 4})

      if (align==='center'){
        svgLabelText.attr("transform", "translate(" +
          (height + margin.top - bb.width) / 2
          + "," + (bb.height - 3) + ")")
      }


      return bb.height+2*4;
    }



    return VialsHelper;
  }();



  var global = new VialsHelper();
  exports.VialsHelper = VialsHelper;
  exports.drawSideLabel = global.drawSideLabel.bind(global)




})