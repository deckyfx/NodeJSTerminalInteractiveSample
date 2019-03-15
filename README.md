# SuiteTreatSabreData

## How to build?
- install nodejs
- This step actually pretty obvious, but Just in case... Open Terminal / CMD
- run ```npm install typescript -g```
- clone or download this project, and enter to its directory
- run ```npm install -d```
- run ```npm run compile``` for mac / Linux
- run ```npm run compile-win``` for Windows
- run ```npm run reset```

## How to run?
- You may need key files to connect to mongodb via ssh tunnel, put them in "key" folder
- run ```npm run start```
- type help for avaliable commands

## Update Hotel Forever mode
-  Run ```updatehotels -f```
-  That's it

### Guide
- To update hotels data, create new document in ```Hotel_Update_Request``` collection
- document should have ```sabreID```

### using cronjobs
- to update hotels scheduled by os cronjob, run the program with arguments ```updatehotels -o```
- ```npm run start updatehotels -o```