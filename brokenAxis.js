/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */

define(['exports','d3'],function(exports,d3){

  function BrokenAxis(width, options) {

    this.scaleList = [];
    this.width = width;
    this.options = options;

    this.getAxisRanges = function(curExons, startPosVal, baseWidth) {
      console.log(this.options.showIntrons);
      curExons = curExons.sort(function(a, b) {return a[0] > b[0] ? 1 : -1});
      if (this.options.showIntrons) {
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
      }
      else {
        ranges = curExons;
      }
      return ranges;
    }

    this.splitXData = function(data) {
      var ranges    = this.ranges,
        splitData = ranges.map(function() {return []});
      data.forEach(function(d) {
        ranges.forEach(function(range, rangeIdx) {
          if (range[0] <= d.pos && d.pos <= range[1]) {
            splitData[rangeIdx].push(d);
          }
        })
      })
      return splitData;
    }

    this.update = function(geneInfo, pos, baseWidth, g) {
      this.curExons = geneInfo["curExons"];

      this.ranges = this.getAxisRanges(this.curExons, pos, baseWidth);

      var ranges = this.ranges,
        axisPos = 0,
        axisPadding = this.options.showIntrons ? 0 : 60,
        totalAxisWidth = ranges.reduce(function(a, b) {return a + b[1] - b[0] + 1}, 0),
        scaleList = [],
        graphWidth = width,
        pixelWidth = graphWidth - axisPadding*(ranges.length - 1);

      this.ranges.forEach(function(range, i) {
        var axisWidth = (range[1] - range[0] + 1)/totalAxisWidth * pixelWidth;
        var xScale = d3.scale.ordinal().domain(d3.range(range[0]-1, range[1]+1)).rangeBands([axisPos,axisPos+axisWidth-1]);
        scaleList.push(xScale);
        axisPos = axisPos + axisWidth + axisPadding;
      });

      this.scaleList = scaleList;

      if (g) {
        this.draw(g);
      }
    }

    this.draw = function(g) {
      // shouldn't have to remove each time, need to clean up
      g.selectAll(".x.axis").remove();

      this.scaleList.forEach(function(scale, i) {
        var rangeExtent = scale.rangeExtent(),
          scaleDomain = scale.domain(),
          domainExtent = [scaleDomain[0], scaleDomain[scaleDomain.length - 1]],
          xScaleCont = d3.scale.linear().domain(domainExtent).range(rangeExtent);

        var xAxis = d3.svg.axis()
          .orient("bottom")
          .scale(xScaleCont)
          .outerTickSize(0)

        this.options.showIntrons ? xAxis.ticks((rangeExtent[1]-rangeExtent[0])/width*5)
          : xAxis.tickValues(domainExtent);

        g.append("g").attr({
          "class": "x axis",
          "transform": "translate(0," + g.attr("height") +")"
        })
          .call(xAxis);
      }.bind(this));
    }

    this.rangeBand = function() {
      // should change to just calculate this in this.update
      return this.scaleList.length ? this.scaleList[0].rangeBand() : 0;
    }

    this.getXPos = function(pos) {
      var xPos;
      this.scaleList.forEach(function(axis, i) {
        if (axis(pos)) {
          xPos = axis(pos);
        }
      })
      return xPos;
    }
  }


  exports.BrokenAxis = BrokenAxis;

  exports.create = function(width, options){
    return new BrokenAxis(width, options)
  }





})
