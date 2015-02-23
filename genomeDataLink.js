'use strict';

//noinspection Annotator
define(['exports', '../caleydo/main', '../caleydo/datatype', 'd3', '../bower_components/js-lru/lru.js'], function(exports, C, datatypes, d3, lru) {
    exports.GenomeDataLink = datatypes.defineDataType('GenomeDataLink', {
      init: function (desc) {
        this.serveradress = desc.serveradress;
        this.sampleCache = new LRUCache(5); // create a cache of size 5
        this.allGenes=null;
        this.bamHeader=null;
      },
      getSamples:function (chromID, startPos, baseWidth, gene){
        var res = this.sampleCache.get(chromID+"-"+startPos+"-"+ baseWidth);

        /* cache fail */
        if (!res){
          //console.log("cahce miss");
          res = $.getJSON(this.serveradress+ "/pileup?" +
          "geneName="+encodeURIComponent(gene)+
          "&chromID="+ encodeURIComponent(chromID) +
          "&pos=" + encodeURIComponent(startPos) +
          "&baseWidth=" + encodeURIComponent(baseWidth));

          this.sampleCache.put(chromID+"-"+startPos+"-"+ baseWidth, res);
        }
        //else{
        //  console.log("cahce hit");
        //}

        /* return a (fullfilled) promise */
        return res;

      },
      getAllGenes:function(){
        if (this.allGenes === null)
          this.allGenes =$.getJSON(this.serveradress + "/genes");

        return this.allGenes;

      },
      getBamHeader:function(){
        if (this.bamHeader == null)
          this.bamHeader= $.getJSON(this.serveradress+"/header");
        return this.bamHeader;
      }

    });








    exports.create = function(desc) {
      return new exports.GenomeDataLink(desc);
    };
});

/*
 !! this file makes use of the js-lru implementation from https://github.com/rsms/js-lru

License:
 Copyright (c) 2010 Rasmus Andersson http://hunch.se/

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

