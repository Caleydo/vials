# Caleydo Vials

Vials visualizes alternative splicing based on mRNAseq data. You can try out vials at http://vials.io/.

Vials uses [Caleydo Web](https://github.com/Caleydo/caleydo-web/) as the underlying visualization framework. This repository contains the client-side Caleydo Web plugin. 

## Running Vials

*Note:* We are currently working on a Docker based build ot simplify the deployment process. In the meanwhile create the dev environment

### Pre-conditions: 
#### Dev-Environment:
- install vagrant and virtualbox and follow instructions: https://github.com/Caleydo/caleydo_web_container:
    - `git clone https://github.com/Caleydo/caleydo_web_container`
    - `cd caleydo_web_container`
    - `vagrant up` - start the vagrant machine (might take a while - get a coffee :))
    - `vagrant ssh` - login to the vagrant box
- within vagrant use the caleydo manager tool to install vials and all dependencies:
    - `./manage.sh clone https://github.com/Caleydo/vials` 
    - `./manage.sh clone https://github.com/Caleydo/vials_server`
    - `./manage.sh resolve`
- within vagrant create the data structure for the demo application:
    - `mkdir _data`
    - `cd _data`
    - `mkdir vials_projects`
    - `cd vials_projects`
    - download & unzip bodymap data: https://www.dropbox.com/s/xrbs250tjafjvpd/bodymap.vials_project.zip?dl=0
    - `cd ..`
    - download & unzip ref_genomes: https://www.dropbox.com/s/zoqnihdrhony4bh/reference_genomes.zip?dl=0
    - resulting folder structure (excerpt):
```
/vagrant (or ‘caleydo_web_container’)
	_data
		reference_genomes
      hg19_broad
    vials_projects
      bodymap.vials_project
  plugins
    vials
    vials_server
    … (many others)
	….
```
- start server:
    - `cd /vagrant`
    - `./manage server`

### Running vials
* Access it using your web browser: http://localhost:9000/vials/

  
#### Questions ?
 * Get in touch with us: @HendrikStrobelt or @sgratzl .
 



