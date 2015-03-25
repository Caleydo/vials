/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */

define(['exports','d3'],function(exports,d3){

  function BrokenAxis(width, options) {
    //this.scaleList = [];
    this.width = width;
    this.options = options;


    this.geneStart = 0;
    this.geneEnd = 1000;

    this.arrayWidth = 10000;

    this.brokenDomain = [0,100];
    this.brokenRange = [0,100];

    this.avrgExonLength = 30;

    this.shrinkIntronsState = false;

    var that = this;

    this.scale_arrayPosToScreenPos = d3.scale.linear().domain([0,10000]).range([0,width])
    this.scale_genePosToScreenPos = d3.scale.linear().domain([0,100]).range([0,width])
    this.scale_arrayPosToGenePos = d3.scale.linear().domain([0,10000]).range([0,100])

    this.arrayPosToScreenPos = function(x){
      return that.scale_arrayPosToScreenPos(x);
    }

    this.arrayPosToGenePos = function(x){
      return that.scale_arrayPosToGenePos(x);
    }

    this.genePosToScreenPos = function(x){
      return that.scale_genePosToScreenPos(x);
    }


    this.setArrayWidth= function(arrayWidth){
      that.scale_arrayPosToScreenPos.domain([0,arrayWidth])
      that.scale_arrayPosToGenePos.domain([0,arrayWidth])
      that.arrayWidth=arrayWidth;
    }

    this.setGeneStartEnd= function(start, end){
      that.scale_genePosToScreenPos.domain([start,end])
      that.scale_arrayPosToGenePos.range([start,end])
      that.geneStart = start;
      that.geneEnd = end;


    }

    this.shrinkIntrons = function(shrink){
      that.shrinkIntronsState = shrink;

      if (shrink){

        this.scale_genePosToScreenPos.domain(that.brokenDomain).range(that.brokenRange);
        that.scale_arrayPosToScreenPos.domain(
          that.brokenDomain.map(that.scale_arrayPosToGenePos.invert)
        ).range(that.brokenRange);

      }else{

        // unbreak
        this.scale_arrayPosToScreenPos.domain([0, that.arrayWidth]).range([0,that.width]);
        this.scale_genePosToScreenPos.domain([that.geneStart, that.geneEnd]).range([0, that.width]);
        this.scale_arrayPosToGenePos.domain([0, that.arrayWidth]).range([that.geneStart, that.geneEnd]);
      }



    }

    this.getWidth= function () {
      return that.width;
    }



    this.calculateBreakPointsByGenePos= function(ranges){
      if (ranges.length<1) return;



      var fixedIntronLength = 10;

      var rangeCount = ranges.length;
      var betweenRanges = rangeCount-1; // Zwischenraeume
      var allExonLength = ranges.reduce(function(previous, range){
        return previous +  (range.end-range.start)
      },0)
      var rangeToLength = d3.scale.linear().domain([0,allExonLength/rangeCount]).range([0,that.avrgExonLength]); /// TODO magic number

      var d3_domain =[];
      var d3_range =[];


      var xPosAcc = 0;

      ranges.sort(function(a,b){return a.start - b.start});
      //console.log(ranges.map(function(d){return d.start}));

      if (ranges[0].start>that.geneStart) {
        d3_domain.push(that.geneStart);

        d3_range.push(xPosAcc);
        xPosAcc+=fixedIntronLength;

        betweenRanges++;
      }

      ranges.forEach(function (range) {
        d3_domain.push(range.start);
        d3_domain.push(range.end);

        d3_range.push(xPosAcc);
        xPosAcc+= rangeToLength(range.end-range.start)
        d3_range.push(xPosAcc);
        xPosAcc+=fixedIntronLength


      });



      if (ranges[ranges.length-1].end<that.geneEnd) {
        d3_domain.push(that.geneEnd);
        d3_range.push(xPosAcc);
        betweenRanges++
      }else{
        xPosAcc-=fixedIntronLength;
      }


      //console.log("axis", d3_domain, d3_range);

      that.width = xPosAcc;
      that.brokenDomain = d3_domain;
      that.brokenRange = d3_range;


      that.shrinkIntrons(that.shrinkIntronsState);

    }




    //
    //this.getAxisRanges = function(curExons, startPosVal, baseWidth) {
    //  console.log(this.options.showIntrons);
    //  curExons = curExons.sort(function(a, b) {return a[0] > b[0] ? 1 : -1});
    //  if (this.options.showIntrons) {
    //    var ranges = [];
    //    var prevExon;
    //    curExons.forEach(function(exon, i) {
    //      if (prevExon) {
    //        ranges.push([prevExon[1], exon[0]])
    //      }
    //      else if (!prevExon && exon[0] > startPosVal) {
    //        ranges.push([startPosVal, exon[0]])
    //      }
    //      ranges.push(exon);
    //      prevExon = exon;
    //    })
    //    if (prevExon[1] < startPosVal+baseWidth) {
    //      ranges.push([prevExon[1], startPosVal+baseWidth])
    //    }
    //  }
    //  else {
    //    ranges = curExons;
    //  }
    //  return ranges;
    //}
    //
    //this.splitXData = function(data) {
    //  var ranges    = this.ranges,
    //    splitData = ranges.map(function() {return []});
    //  data.forEach(function(d) {
    //    ranges.forEach(function(range, rangeIdx) {
    //      if (range[0] <= d.pos && d.pos <= range[1]) {
    //        splitData[rangeIdx].push(d);
    //      }
    //    })
    //  })
    //  return splitData;
    //}
    //
    //this.update = function(geneInfo, pos, baseWidth, g) {
    //  this.curExons = geneInfo["curExons"];
    //
    //  this.ranges = this.getAxisRanges(this.curExons, pos, baseWidth);
    //
    //  var ranges = this.ranges,
    //    axisPos = 0,
    //    axisPadding = this.options.showIntrons ? 0 : 10,
    //    totalAxisWidth = ranges.reduce(function(a, b) {return a + b[1] - b[0] + 1}, 0),
    //    scaleList = [],
    //    graphWidth = width,
    //    pixelWidth = graphWidth - axisPadding*(ranges.length - 1);
    //
    //  this.ranges.forEach(function(range, i) {
    //    var axisWidth = (range[1] - range[0] + 1)/totalAxisWidth * pixelWidth;
    //    var xScale = d3.scale.ordinal().domain(d3.range(range[0]-1, range[1]+1)).rangeBands([axisPos,axisPos+axisWidth-1]);
    //    scaleList.push(xScale);
    //    axisPos = axisPos + axisWidth + axisPadding;
    //  });
    //
    //  this.scaleList = scaleList;
    //
    //  if (g) {
    //    this.draw(g);
    //  }
    //}
    //
    //this.draw = function(g) {
    //  // shouldn't have to remove each time, need to clean up
    //  g.selectAll(".x.axis").remove();
    //
    //  this.scaleList.forEach(function(scale, i) {
    //    var rangeExtent = scale.rangeExtent(),
    //      scaleDomain = scale.domain(),
    //      domainExtent = [scaleDomain[0], scaleDomain[scaleDomain.length - 1]],
    //      xScaleCont = d3.scale.linear().domain(domainExtent).range(rangeExtent);
    //
    //    var xAxis = d3.svg.axis()
    //      .orient("bottom")
    //      .scale(xScaleCont)
    //      .outerTickSize(0)
    //
    //    this.options.showIntrons ? xAxis.ticks((rangeExtent[1]-rangeExtent[0])/width*5)
    //      : xAxis.tickValues(domainExtent);
    //
    //    g.append("g").attr({
    //      "class": "x axis",
    //      "transform": "translate(0," + g.attr("height") +")"
    //    })
    //      .call(xAxis);
    //  }.bind(this));
    //}
    //
    //this.rangeBand = function() {
    //  // should change to just calculate this in this.update
    //  return this.scaleList.length ? this.scaleList[0].rangeBand() : 0;
    //}
    //
    //this.getXPos = function(pos) {
    //  var xPos;
    //  this.scaleList.forEach(function(axis, i) {
    //    if (axis(pos)) {
    //      xPos = axis(pos);
    //    }
    //  })
    //  return xPos;
    //}
    //this.getWidth = function(){
    //  return this.width;
    //}
  }



  exports.BrokenAxis = BrokenAxis;

  exports.create = function(width, options){
    return new BrokenAxis(width, options)
  }





})
