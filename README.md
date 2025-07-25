# POS SYSTEM

### Setting up your environment:
1. Install node.js to your machine (Use this yt video as a reference: https://youtu.be/HIdPpm-0ZNQ?si=Qmcf5_SULuOfOQ-w)

**WARNING:** Stop watching the video at the point where `npm create-react-app my-app` is being invoked.

### Running the application:
*Open your IDE's terminal and run the following commands:*
1. `cd pos-system` *"umai-pos-system"* is the directory name.
2. *If running for the first time run* `npm install`
3. `npm run dev`
4. Copy the address into your browser. *Usually in the form of http://localhost:####/*

### Creating your own test react application:
*Open your IDE's terminal and run the following commands. Make sure to run these on an empty folder/project:*
1. `npm create vite@latest project_name_here --template`
2.  Select `react` using arrowkeys (skip this step if not being asked to)
3.  Select `javascript`

### Running and setting up Electron builds: ###
*Open your IDE's terminal and run the following commands:*
1. `npm install` (ensures that all new node_modules are installed)
2. `npm run build` (builds a standalone version of the application)
3. `npm run dist` (packages the application into an executable)
4. (Optional) `npx electron .` (if you want to test the standalone version without creating an executable, but make sure to run step 2 at each new change)

### Running and building Android Builds ###
*Open your IDE's terminal and run the following commands:*
1. `npm install` (ensures that all new node_modules are installed)
2. `npm run run:android` (builds a standalone version of the application)

### Known Issues with Apache Cordova ###
*If a build for an android port fails due to directory being unknown*
1. go to: node_modules->cor-android->lib->check_reqs.js
2. find and insert this line `const result = execa.sync(`"${path.join(__dirname, 'getASPath.bat')}"`, { shell: true });`

#### *Legacy and Refactored Codebase Developers:* ####

@Rysll (Legacy & Refactored)

@Remigaraki (Legacy)

@arceezi (Legacy)

@Vlue001 (Legacy & Refactored)

@jjjlyk (Refactored)
