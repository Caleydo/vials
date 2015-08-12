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


    VialsHelper.prototype.getPseudoRandom = function(){
      var seed = 0x2F6E2B1;
      return function() {
        // Robert Jenkins’ 32 bit integer hash function
        seed = ((seed + 0x7ED55D16) + (seed << 12))  & 0xFFFFFFFF;
        seed = ((seed ^ 0xC761C23C) ^ (seed >>> 19)) & 0xFFFFFFFF;
        seed = ((seed + 0x165667B1) + (seed << 5))   & 0xFFFFFFFF;
        seed = ((seed + 0xD3A2646C) ^ (seed << 9))   & 0xFFFFFFFF;
        seed = ((seed + 0xFD7046C5) + (seed << 3))   & 0xFFFFFFFF;
        seed = ((seed ^ 0xB55A4F09) ^ (seed >>> 16)) & 0xFFFFFFFF;
        return (seed & 0xFFFFFFF) / 0x10000000;
      };
    }


    VialsHelper.prototype.computeBoxPlot = function(values) {
      var sortedValues = values.sort(d3.ascending);
      var Q = new Array(5);
      Q[0] = d3.min(sortedValues);
      Q[4] = d3.max(sortedValues);
      Q[1] = d3.quantile(sortedValues, 0.25);
      Q[2] = d3.quantile(sortedValues, 0.5);
      Q[3] = d3.quantile(sortedValues, 0.75);
      var iqr = 1.5 * (Q[3] - Q[1]);
      var whiskerTop, whiskerDown;
      {
        var i = -1;
        var j = sortedValues.length;
        while ((sortedValues[++i] < Q[1] - iqr));
        while (sortedValues[--j] > Q[3] + iqr);
        whiskerTop = j == sortedValues.length - 1 ? sortedValues[j] : Q[3] + iqr;
        whiskerDown = i == 0 ? sortedValues[i] : Q[1] - iqr;
      }
      return {"whiskerTop": whiskerTop, "whiskerDown": whiskerDown, "Q": Q};
    }




    return VialsHelper;
  }();



  var global = new VialsHelper();
  exports.VialsHelper = VialsHelper;
  exports.drawSideLabel = global.drawSideLabel.bind(global)
  exports.getPseudoRandom = global.getPseudoRandom.bind(global)



})


// THIS IS the copyright notice for the pseudorandom function:
// https://gist.github.com/mathiasbynens/5670917
//
// Copyright 2012 the V8 project authors. All rights reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

