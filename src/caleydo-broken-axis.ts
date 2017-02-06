/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 2/25/15.
 */


import * as d3 from 'd3';

export function BrokenAxis(width: number, options) {
  //this.scaleList = [];
  this.width = width;
  this.options = options;


  this.geneStart = 0;
  this.geneEnd = 1000;

  this.arrayWidth = 2000;

  this.brokenDomain = [0, 100];
  this.brokenRange = [0, 100];
  this.brokenRangeAsc = [0, 100];
  this.brokenRangeDesc = [100, 0];

  this.avrgExonLength = 30;

  this.ascending = true;
  this.shrinkIntronsState = false;

  const that = this;

  this.scale_arrayPosToScreenPos = d3.scale.linear().domain([0, 10000]).range([0, width]);
  this.scale_genePosToScreenPos = d3.scale.linear().domain([0, 100]).range([0, width]);
  this.scale_arrayPosToGenePos = d3.scale.linear().domain([0, 10000]).range([0, 100]);

  this.arrayPosToScreenPos = function (x) {
    return that.genePosToScreenPos(that.scale_arrayPosToGenePos(x));
  };

  this.arrayPosToGenePos = function (x) {
    return that.scale_arrayPosToGenePos(x);
  };

  this.genePosToScreenPos = function (x) {
    return that.scale_genePosToScreenPos(x);
  };

  this.screenPosToArrayPos = function (x) {
    return Math.floor(that.scale_arrayPosToScreenPos.invert(x));
  };

  this.screenPosToGenePos = function (x) {
    return Math.floor(that.scale_genePosToScreenPos.invert(x));
  };

  this.setArrayWidth = function (arrayWidth) {
    that.scale_arrayPosToScreenPos.domain([0, arrayWidth]);
    that.scale_arrayPosToGenePos.domain([0, arrayWidth]);
    that.arrayWidth = arrayWidth;
  };

  this.setGeneStartEnd = function (start, end) {
    that.scale_genePosToScreenPos.domain([start, end]);
    that.scale_arrayPosToGenePos.range([start, end]);
    that.geneStart = start;
    that.geneEnd = end;
  };

  this.shrinkIntrons = function (shrink) {
    that.shrinkIntronsState = shrink;

    if (shrink) {

      this.scale_genePosToScreenPos.domain(that.brokenDomain).range(that.brokenRange);
      that.scale_arrayPosToScreenPos.domain(
        that.brokenDomain.map(that.scale_arrayPosToGenePos.invert)
      ).range(that.brokenRange);

    } else {

      // unbreak
      that.scale_arrayPosToScreenPos.domain([0, that.arrayWidth]).range([0, that.width]);
      that.scale_genePosToScreenPos.domain([that.geneStart, that.geneEnd]).range([0, that.width]);
      that.scale_arrayPosToGenePos.domain([0, that.arrayWidth]).range([that.geneStart, that.geneEnd]);
      if (!that.ascending) {
        reverseRange(that.scale_arrayPosToScreenPos);
        reverseRange(that.scale_genePosToScreenPos);
      }
    }
  };

  this.getWidth = function () {
    return that.width;
  };

  this.reverse = function () {
    that.ascending = !that.ascending;
    that.brokenRange = that.ascending ? that.brokenRangeAsc : that.brokenRangeDesc;
    reverseRange(that.scale_arrayPosToScreenPos);
    reverseRange(that.scale_genePosToScreenPos);
  };
  function reverseRange(scale) {
    // reverse ranges in place
    let revRange;
    if (that.shrinkIntronsState) {
      revRange = that.brokenRange;
    } else {
      revRange = scale.range().slice(0);
      revRange.reverse();
    }
    scale.range(revRange);
  }

  this.calculateBreakPointsByGenePos = function (ranges) {
    if (ranges.length < 1) {
      return;
    }


    const fixedIntronLength = 10;

    const rangeCount = ranges.length;
    let betweenRanges = rangeCount - 1; // padding
    const allExonLength = ranges.reduce(function (previous, range) {
      return previous + (range.end - range.start);
    }, 0);
    const rangeToLength = d3.scale.linear().domain([0, allExonLength / rangeCount]).range([0, that.avrgExonLength]); /// TODO magic number

    const d3Domain = [];
    const d3Range = [];

    let xPosAcc = 0;

    ranges.sort(function (a, b) {
      return a.start - b.start;
    });


    if (ranges[0].start > that.geneStart) {
      d3Domain.push(that.geneStart);

      d3Range.push(xPosAcc);
      xPosAcc += fixedIntronLength;

      betweenRanges++;
    }

    ranges.forEach(function (range) {
      d3Domain.push(range.start);
      d3Domain.push(range.end);

      d3Range.push(xPosAcc);
      xPosAcc += rangeToLength(range.end - range.start);
      d3Range.push(xPosAcc);
      xPosAcc += fixedIntronLength;


    });


    if (ranges[ranges.length - 1].end < that.geneEnd) {
      d3Domain.push(that.geneEnd);
      d3Range.push(xPosAcc);
      betweenRanges++;
    } else {
      xPosAcc -= fixedIntronLength;
    }


    that.width = xPosAcc;
    that.brokenDomain = d3Domain;
    that.brokenRangeAsc = d3Range;
    that.brokenRangeDesc = d3Range.map(function (d) {
      return that.width - d;
    });
    that.brokenRange = that.ascending ? that.brokenRangeAsc : that.brokenRangeDesc;

    that.shrinkIntrons(that.shrinkIntronsState);
  };
}


export function create(width, options) {
  return new BrokenAxis(width, options);
}

