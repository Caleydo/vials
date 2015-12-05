# Caleydo Vials

Vials visualizes alternative splicing based on mRNAseq data. You can try out vials at [http://vcglab.org/vials/](http://vcglab.org/vials/).

Vials uses [Caleydo Web](https://github.com/Caleydo/caleydo-web/) as the underlying visualization framework. This repository contains the client-side Caleydo Web plugin. 

## Running Vials

### Pre-conditions: 
#### Dev-Environment:
 * Install [caleydo_web_container](https://github.com/Caleydo/caleydo_web_container). This will set up a virtual machine that you can run through Vagrant. For details see documentation of the repository.
 * Execute within a bash: 

  ```bash
./manage.sh clone vials
./manage.sh clone vials_server
  ```
  This will install the vials client and server plugin. 
 * Launch the vm using `vagrant up` and connect via ssh `vagrant ssh`
 * **Within the VM** execute: 
 
   ```bash
./manage.sh resolve
  ```
  to resolve external dependencies. This will take a while.
  
#### Data
 * Get in touch with us: @HendrikStrobelt, @sgratzl we can provide with the data. 
 * Create a directory within the caleydo_web_container called `_data`
 * Once you get the data copy them in this newly created directory

### Running vials
* Go to caleydo_web_container directory and run `vagrant up`
* SSH into vagrant using `vagrant ssh`
* Execute: `./manage.sh server`
* Access it using your web browser: http://localhost:9000/vials/



