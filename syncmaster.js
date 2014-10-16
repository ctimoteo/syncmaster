#!/usr/bin/env node

'use strict';

//Modules Required
var color     = require( 'ansi-color' ).set;
var fs        = require( 'fs'         );
var fsmonitor = require( 'fsmonitor'  );
var jsonlint  = require( 'jsonlint'   );
var prompt    = require( 'cli-prompt' );

//Get my libs
var commands    = require( './libs/commands.js'    );
var env         = require( './libs/env.js'         );
var connections = require( './libs/connections.js' );
var queues      = require( './libs/queues.js'      );

//Load global variables
env.setGlobalVariables();

//Start logs
env.initializeLogs();

//Initialize sript
console.log(color('SyncMaster started...', 'blue'));

//Load argv
argv = process.argv;

//Load configs
try {
    config = fs.readFileSync('./config/user_list.json', 'utf8');
    //Parse user list setup JSON
    config = jsonlint.parse(config);
}
catch (error) {
    //Log error
    errors_log.error(error);
    //Exit with error
    console.log("\n" + color('Failed to load user key files config', 'red') + "\n");
    //End process
    return;
}

//Check for script args
env.checkScriptArgs();

//Load environment
env.loadSyncEnv(machine, origin, target, user, password, key);

//Initialize ssh connection
connections.initializeConnection();

//Log rsync errors
rsync.output(
    function(data) {
        //nothing to do on success
    },
    function(data) {
        //Log to file the std err
        errors_log.error(data);
    }
);

rsync2.output(
    function(data) {
        //nothing to do on success
    },
    function(data) {
        //Log to file the std err
        errors_log.error(data);
    }
);

//Defer prompt's
setTimeout(
    function() {
        //Ask user if wants to syncronize origin from target
        prompt( 'Syncronize all from target? Yes/[No] ', function (val) {
            if ( val === 'n' || val === 'N' || !val ) {
                //Ask user if wants to syncronize all on target
                prompt('Syncronize all to target? [Yes]/No ', function (val) {
                    if ( val[0] === 'y' || val[0] === 'Y' || val[0] === 's' || val[0] === 'S' || !val ) {
                        //Execute the rsync command
                        rsync.execute( function(error, code, cmd) {
                            //Print rsync success
                            console.log(color('Target is syncronized! Lets wait for changes...', 'white'));
                            //Log errors too
                            if (error) {
                                errors_log.error(error);
                            }
                            //start syncronization
                            handleSycronization(user, machine, key, password, origin, target);
                        });
                    }
                    else { //Don't syncronize at start
                        //start syncronization
                        handleSycronization(user, machine, key, password, origin, target);
                    }
                });
            }
            else { //Don't syncronize from target at start
                //Execute the rsync command
                rsync2.execute( function(error, code, cmd) {
                    //Print rsync success
                    console.log(color('Origin is syncronized! Lets wait for changes...', 'white'));
                    //Log errors too
                    if (error) {
                        errors_log.error(error);
                    }
                    //Ask user if wants to syncronize all on target
                    prompt('Syncronize all to target? [Yes]/No ', function (val) {
                        if ( val[0] === 'y' || val[0] === 'Y' || val[0] === 's' || val[0] === 'S' || !val ) {
                            //Execute the rsync command
                            rsync.execute( function(error, code, cmd) {
                                //Print rsync success
                                console.log(color('Target is syncronized! Lets wait for changes...', 'white'));
                                //Log errors too
                                if (error) {
                                    errors_log.error(error);
                                }
                                //start syncronization
                                handleSycronization(user, machine, key, password, origin, target);
                            });
                        }
                        else { //Don't syncronize at start
                            //start syncronization
                            handleSycronization(user, machine, key, password, origin, target);
                        }
                    });
                });
            }
        });
    },
    2000 //wait 1s
);

//Check if there are files on queue to process
//setInterval(
//    function() {
//        console.log(color('Checking file change queue...', 'green'));
//
//        if (fileActionsQueue.length > 0) {
//            console.log( 'There are ' + fileActionsQueue.length + ' changes to process! (1)' );
//
//            queues.processQueues();
//        }
//    },
//    30000
//);

//Main function to maintain syncronization
function handleSycronization(user, machine, key, password, origin, target) {
    //Watch for files changes on origin
    fsmonitor.watch(origin, '', function(change) {
        //File added, upload to target
        if (change.addedFiles) {
            //Loop through files added
            change.addedFiles.forEach(
                function(file) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: file, action: 'sendFile'});
                    }
                    else { //We have a ready connection, send file
                        commands.sendFile(file, connection);
                    }
                }
            );
        }
        //Test change updated file
        if (change.modifiedFiles) {
            //Loop through files updated
            change.modifiedFiles.forEach(
                function(file) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: file, action: 'sendFile'});
                    }
                    else { //We have a ready connection, send file
                        commands.sendFile(file, connection);
                    }
                }
            );
        }
        //Test change removed file
        if (change.removedFiles) { //File removed, upload to target
            //Loop through files removed
            change.removedFiles.forEach(
                function(file) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: file, action: 'removeFile'});
                    }
                    else { //We have a ready connection, send file
                        commands.removeFile(file, connection);
                    }
                }
            );
        }
        //Test change added folder
        if (change.addedFolders) { //Folder added, create on target
            //Loop through files removed
            change.addedFolders.forEach(
                function(folder) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: folder, action: 'addFolder'});
                    }
                    else { //We have a ready connection, send file
                        commands.addFolder(folder, connection);
                    }
                }
            );
        }
        //Test change modified folder
        if (change.modifiedFolders) { //Folder updated, change on target
            //Loop through files removed
            change.modifiedFolders.forEach(
                function(folder) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: folder, action: 'updateFolder' });
                    }
                    else { //We have a ready connection, send file
                        commands.updateFolder(folder, connection);
                    }
                }
            );
        }
        //Test change remove folder
        if (change.removedFolders) { //Folder removed, removed from target
            //Loop through files removed
            change.removedFolders.forEach(
                function(folder) {
                    if (!active_connection) { //Queue file
                        fileActionsQueue.push({path: folder, action: 'deleteFolder'});
                    }
                    else { //We have a ready connection, send file
                        commands.deleteFolder(folder, connection);
                    }
                }
            );
        }
    });

    console.log(color('Syncronization started...', 'green'));
}

//Handle Process Exceptions
process.on('SIGUSR2', function() {
    //Log signal
    console.log(color('SIGUSR2 signal thriggered!', 'red'));
});

//Handle uncaught exceptions
process.on('uncaughtException', function(err) {
    //Get error trace
    var stack = new Error(err).stack;
    //Log exception
    console.log(color('Uncaught Exception:', 'red+underline'));
    //Log error
    console.error(err);
    //Log stack trace
    console.log(stack);
    //Log error to file
    errors_log.error(err, 'Uncaught Exception');
    //Just as a failsafe rsync files
    //Syncronize file with target
    rsync.execute(function(error, code, cmd) {
        console.log(color('NEED TO RESTART SYNCRONIZATION...', 'red+underline'));
        //Re-Handle Syncronization
        handleSycronization(user, machine, key, password, origin, target);
    });
});
