Caleydo Vials ![Caleydo Web Application](https://img.shields.io/badge/Caleydo%20Web-Application-1BA64E.svg)
===================

Vials visualizes alternative splicing based on mRNAseq data. You can try out vials at http://vials.io/.

Installation
------------

*Note:* We are currently working on a Docker based build ot simplify the deployment process. In the meanwhile create the dev environment

[Set up a virtual machine using Vagrant](http://www.caleydo.org/documentation/vagrant/) and run these commands inside the virtual machine:

```bash
./manage.sh clone Caleydo/vials
./manage.sh clone Caleydo/vials_server
./manage.sh resolve
```

Within vagrant create the data structure for the demo application:

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

Start server:
- `cd /vagrant`
- `./manage server`

Access it using your web browser: http://localhost:9000/vials/


Contact
------------

Get in touch with us: @HendrikStrobelt or @sgratzl .


***

<a href="https://caleydo.org"><img src="http://caleydo.org/assets/images/logos/caleydo.svg" align="left" width="200px" hspace="10" vspace="6"></a>
This repository is part of **[Caleydo Web](http://caleydo.org/)**, a platform for developing web-based visualization applications. For tutorials, API docs, and more information about the build and deployment process, see the [documentation page](http://caleydo.org/documentation/).
