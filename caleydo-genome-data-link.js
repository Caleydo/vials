'use strict';

//noinspection Annotator
define(['exports', '../caleydo_web/main', '../caleydo_web/datatype', 'd3', 'js-lru','./brokenAxis'], function(exports, C, datatypes, d3, LRUCache, brokenAxis) {

    exports.GenomeDataLink = datatypes.defineDataType('caleydo-genome-data-link', {
      init: function (desc) {
        this.serveradress = desc.serveradress;
        this.sampleCache = new LRUCache(5); // create a cache of size 5
        this.geneCache = new LRUCache(5); // create a cache of size 5
        this.allGenes=null;
        this.bamHeader=null;
        this.allProjects = null;
        this.options={"showIntrons": true};
        this.genomeAxis=brokenAxis.create(600, this.options);
        this.localFileName = null;
        this.localFileData = null;
      },

      useFile:function(fileName){
        this.localFileName = fileName;
        this.localFileData = $.getJSON(fileName);
      },

      getSamples:function (gene, startPos, baseWidth){
        var res = this.sampleCache.get(gene+"-"+startPos+"-"+ baseWidth);

        /* cache fail */
        if (!res){
          //console.log("cahce miss");
          var parameters = ["geneName="+encodeURIComponent(gene)];
          // if (startPos) parameters.push("pos="+encodeURIComponent(startPos));
          // if (baseWidth) parameters.push("baseWidth="+encodeURIComponent(baseWidth))

          res = $.getJSON(this.serveradress+ "/pileup?"+parameters.join("&"));

          this.sampleCache.put(gene+"-"+startPos+"-"+ baseWidth, res);
        }
        //else{
        //  console.log("cahce hit");
        //}

        /* return a (fullfilled) promise */
        return res;
      },


      getTestSamples:function(jsonFile) {
        return $.getJSON(jsonFile);
      },

      getGeneData:function(projectID, geneName){

        var cacheID = projectID+"==>"+geneName;

        var res = this.geneCache.get(cacheID);

        if (!res){

          if (this.localFileName){
            // -- localFile handling
            var that = this;

            res = C.promised(function (resolve, reject) {
              that.localFileData.then(function (localData) {

                var res = {
                  "gene":localData.gene,
                  "measures":localData.measures,
                  "samples":localData.samples
                }

                resolve(res)

              })
            })

          }else{
            // regular server handling
            var parameters = [];
            parameters.push("geneName="+encodeURIComponent(geneName));
            parameters.push("projectID="+encodeURIComponent(projectID));
            // if (startPos) parameters.push("pos="+encodeURIComponent(startPos));
            // if (baseWidth) parameters.push("baseWidth="+encodeURIComponent(baseWidth))

            res = $.getJSON(this.serveradress+ "/gene?"+parameters.join("&"));
          }

          this.geneCache.put(cacheID, res);

        }

        return res;
      },

      getAllProjects:function(){

        if (this.localFileName){
          // -- localFile handling

          var projects={};
          projects[this.localFileName] = {"data":[{"data_type":"file"}]}

          if (this.allProjects === null)
            this.allProjects = C.promised(function(resolve, reject){
              resolve(projects)
            })
        }else{
          // -- server handling
          if (this.allProjects === null)
            this.allProjects = $.getJSON(this.serveradress + "/projects");
        }

        return this.allProjects;
      },

      getAllGenes:function(projectID){
        if (this.localFileName){
          // -- localFile handling
          var that = this;
          return C.promised(function (resolve, reject) {
            that.localFileData.then(function (localdata) {
              var genes = [localdata.gene.name]
              resolve(genes)
            })
          })

        }else{
          //server call

          projectID = projectID || "";
          //var currentProject = this.allProjects[projectID];

          if (this.currentProjectID === null || this.currentProjectID != projectID){
            this.allGenes = $.getJSON(this.serveradress + "/genes?projectID="+projectID);
            this.currentProjectID = projectID;
          }
          return this.allGenes;

        }


      },

      getBamHeader:function(){
        if (this.bamHeader == null)
          this.bamHeader = $.getJSON(this.serveradress+"/header");
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

