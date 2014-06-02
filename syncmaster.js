#!/usr/bin/env node

//Modules Required
var spawn      = require( 'child_process' ).spawn;
var color      = require( 'ansi-color'    ).set;
var fs         = require( 'fs'            );
var vm         = require( 'vm'            );
var jsonlint   = require( 'jsonlint'      );
var bunyan     = require( 'bunyan'        );
var moment     = require( 'moment'        );
var fsmonitor  = require( 'fsmonitor'     );
var Rsync      = require( 'rsync'         );
var Connection = require( 'ssh2'          );
var util       = require(  'util'         );
var domain     = require( 'domain'        );
var cluster    = require( 'cluster'       );

//Define variables needed
var argv, re, tmp, user, machine, origin, target, key, password, active_connection = false;

//Initialize sript
console.log( color( 'SyncMaster started...', 'green' ) );

//Load argv
argv = process.argv;

//Check if valid args
if ( argv.length < 5 ) {
    console.log( "\n" + color( 'Usage:', 'yellow' ) +
        ' ./syncmaster ' + color( 'USER@MACHINE', 'green' ) +
        ' ' + color( 'ORIGIN_PATH', 'red' ) + ' ' +
        color( 'DESTINATION_PATH', 'blue' ) + "\n");

    //End process
    return;
}

//Initialize logs
var errors_log = bunyan.createLogger({
        name: 'errors_log',
        streams: [{
            type: 'rotating-file',
            path: 'logs/errors.log',
            period: '1d', // daily rotation
            count: 30, // keep 30 back copies
            level: 'error'
        }]
    });

//Retrieve args data
var origin = argv[3];
var target = argv[4];

//Parse user/machine
re  = /(.+)@(.+)/;
tmp = argv[2].match( re );

//Check valid user and machine
if ( tmp && tmp.length == 3 ) {
    user    = tmp[1];
    machine = tmp[2];
}
else {
    //Log error
    errors_log.error( 'Invalid user@machine data: ' + argv[2] );

    //Exit with error
    console.log( "\n" + color( 'Invalid user@machine data: ', 'red' ) + ' ' + color( argv[2], 'blue' ) + "\n");

    //End process
    return;
}

//Load configs
try {
    var config = fs.readFileSync( './config/user_list.json', 'utf8' );

    //Parse user list setup JSON
    config = jsonlint.parse( config );
}
catch ( error ) {
     //Log error
    errors_log.error( 'Failed to load user key files config' );

    //Exit with error
    console.log( "\n" + color( 'Failed to load user key files config', 'red' ) + "\n");

    //End process
    return;
}

//Verify if key/password is configured for user/machine
if ( config[user] && config[user][machine] && config[user][machine].key && config[user][machine].password ) {
    key      = config[user][machine].key;
    password = config[user][machine].password;
}
else {
    //Log error
    errors_log.error( 'Failed to retrieve ssh key/password for user ' + user + ' to machine ' + machine );

    //Exit with error
    console.log( "\n" + color( 'Failed to retrieve ssh key/password for user' + user + ' to machine ' + machine, 'red' ) + "\n");

    //End process
    return;
}

//Setup options for sending files through connection
var OptionsForSFTP = {
    host:       machine,
    port:       22,
    username:   user,
    passphrase: password,
    privateKey: fs.readFileSync( key )
};

//Sync origin with target destination first
var rsync = new Rsync()
    .shell('ssh')
    .flags('arz')
    .delete()
    .quiet()
    .source( origin )
    .destination( user + '@' + machine + ':' + target )
    .debug(false);

//Log rsync errors
rsync.output(
    function(data){
        //nothing to do on success
    }, function(data) {
        //Log to file the std err
        errors_log.error( data );
    }
);

// Execute the rsync command
rsync.execute(function(error, code, cmd) {
    //Print rsync success
    console.log(color('Target is syncronized! Lets wait for changes...', 'green'));

    //Log errors too
    if ( error ) {
        errors_log.error( error );
    }

    //Handle Syncronization
    handleSycronization(user, machine, key, password, origin, target);
});

//Main function to maintain syncronization
function handleSycronization( user, machine, key, password, origin, target ) {
    console.log( color( 'Handle syncronization', 'green') );

    //Initialize the ssh connection
    var connection = new Connection(),
        handler = domain.create();

    //Handle connection errors
    handler.on( 'error', function( error ) {
        //Log connection errors
        errors_log.error( error );
    });

    // Handling "error" event inside domain handler.
    handler.add( connection );

    connection.on('error', function() {
        //Log connection errors
        errors_log.error( error );
    });

    connection.on('connect', function() {
        console.log( color( 'Connection :: connect', 'green' ) );
    });

    //Handle connection end
    connection.on( 'end', function() {
        console.log( color( 'Connection end!', 'red' ) );

        //show new file
        connection.on( 'ready', function () {
            console.log( color( 'Connection restarted...', 'red' ) );

            //Syncronize file with target
            rsync.execute( function( error, code, cmd ) {
                console.log( color('NEED TO RESTART SYNCRONIZATION', 'red'));

                handleSycronization( user, machine, key, password, origin, target );
            });
        });

        //Create a new connection again
        connection.connect( OptionsForSFTP );
    });

    connection.on( 'close', function() {
        console.log( color( 'Connection closed!', 'red' ) );

        //show new file
        connection.on( 'ready', function () {
            console.log( color( 'Connection restarted...', 'red' ) );

            //Syncronize file with target
            rsync.execute( function( error, code, cmd ) {
                console.log( color('NEED TO RESTART SYNCRONIZATION', 'red'));

                handleSycronization( user, machine, key, password, origin, target );
            });
        });

        //Create a new connection again
        connection.connect( OptionsForSFTP );
    });

    //Watch for files changes on origin
    fsmonitor.watch( origin, '', function(change) {
        //File added, upload to target
        if ( change.addedFiles ) {
            //Loop through files added
            change.addedFiles.forEach(
                function( file ) {
                    if ( !active_connection ) { //only connect once
                        //show new file
                        connection.on( 'ready', function () {
                            sendFile( file, connection );
                        });

                        connection.connect( OptionsForSFTP );

                        //Mark active connection
                        active_connection = true;
                    }
                    else {  //We have a ready connection, send file
                        sendFile( file, connection );
                    }
                }
            );
        }

        //File modified, upload to target
        if ( change.modifiedFiles ) {
            //Loop through files added
            change.modifiedFiles.forEach(
                function( file ) {
                    if ( !active_connection ) { //only connect once
                        //show new file
                        connection.on( 'ready', function () {
                            sendFile( file, connection );
                        });

                        connection.connect( OptionsForSFTP );

                        //Mark active connection
                        active_connection = true;
                    }
                    else {  //We have a ready connection, send file
                        sendFile( file, connection );
                    }
                }
            );
        }

        if ( change.removedFiles ) {  //File added, upload to target
            //Loop through files added
            change.removedFiles.forEach(
                function( file ) {
                    if ( !active_connection ) { //only connect once
                        //show new file
                        connection.on( 'ready', function () {
                            removeFile( file, connection );
                        });

                        connection.connect( OptionsForSFTP );

                        //Mark active connection
                        active_connection = true;
                    }
                    else {  //We have a ready connection, send file
                        removeFile( file, connection );
                    }
                }
            );
        }

        /*console.log("Change detected:\n" + change);  //has a nice toString
        console.log("Added folders:    %j", change.addedFolders);
        console.log("Modified folders: %j", change.modifiedFolders);
        console.log("Removed folders:  %j", change.removedFolders);*/
    });
}

//Auxiliary function to add or modify files
function sendFile( file, connection ) {
    //Initialize operation
    connection.sftp(
        function( err, sftp) {
            if ( err ) {
                console.log( "Error, problem starting SFTP: %s", err );
                return;
            }

            sftp.fastPut( origin + file, target + '/' + file,
                {
                    flags: 'w',
                    encoding: 'utf-8',
                    mode: 0666,
                    autoClose: true
                },
                function(err) {
                    if ( err ) {
                        console.log( "Error, transfering file: %s", err );
                    }

                    console.log( 'sendFile: ' + file );

                    //End operation
                    sftp.end();
                }
            );
        }
    );
}

//Auxiliary function to remove files
function removeFile( file, connection ) {
    //Initialize operation
    connection.sftp(
        function( err, sftp) {
            if ( err ) {
                console.log( "Error, problem starting SFTP: %s", err );
                return;
            }

            sftp.unlink( target + '/' + file,
                function(err) {
                    if ( err ) {
                        console.log( 'FAILED to unlink ' + file );
                    }

                    console.log( 'removeFile:' + file );

                    //End operation
                    sftp.end();
                }
            );

        }
    );
}

//Handle Process Exceptions
process.on('SIGUSR2', function () {
    //Log signal
    console.log( color( 'SIGUSR2 signal thriggered!', 'red' ) );
});

process.on('uncaughtException', function (err) {
    //Get error trace
    var stack = new Error(err).stack;

    console.log( color('Uncaught Exception:', 'red+underline'));

    console.error( err );

    //Show stack trace
    console.log( stack );

    //Log to file
    errors_log.error( err, 'Uncaught Exception' );

    //Just as a failsafe rsync files
    //Syncronize file with target
    rsync.execute( function( error, code, cmd ) {
        console.log( color('NEED TO RESTART SYNCRONIZATION', 'red'));

        handleSycronization( user, machine, key, password, origin, target );
    });
});
