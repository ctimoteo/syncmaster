#!/usr/bin/env node

//Modules Required
var spawn     = require( 'child_process' ).spawn;
var color     = require( 'ansi-color'    ).set;
var fs        = require( 'fs'            );
var vm        = require( 'vm'            );
var jsonlint  = require( 'jsonlint'      );
var bunyan    = require( 'bunyan'        );
var moment    = require( 'moment'        );
var fsmonitor = require( 'fsmonitor'     );
var Rsync     = require( 'rsync'         );

//Define variables
var argv, re, tmp, user, machine, origin, target, key;

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
        streams: [
            {
                type: 'rotating-file',
                path: 'logs/errors.log',
                period: '1d', // daily rotation
                count: 30, // keep 30 back copies
                level: 'error'
            }
        ]
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

//Load config
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

//Verify if key is configured for user/machine
if ( config[user] && config[user].machine[machine] ) {
    key = config[user].machine[machine];
}
else {
    //Log error
    errors_log.error( 'Failed to retrieve ssh key for user ' + user + ' to machine ' + machine );

    //Exit with error
    console.log( "\n" + color( 'Failed to retrieve ssh key for user' + user + ' to machine ' + machine, 'red' ) + "\n");

    //End process
    return;
}

//Sync origin with target destination
var rsync = new Rsync()
    .shell('ssh')
    .flags('avrz')
    .delete()
    .source( origin )
    .destination( user + '@' + machine + ':' + target )
    .debug(true);

rsync.output(
    function(data){
        // do things like parse progress
    }, function(data) {

        console.log( 'err: ' + data );

        // do things like parse error output
    }
);

// Execute the command
rsync.execute(function(error, code, cmd) {
    //Monitor origin folder
    fsmonitor.watch( origin, '', function(change) {
        //Syncronize file with target
        rsync.execute( function( error, code, cmd ) {} );

        /*console.log("Change detected:\n" + change);  //has a nice toString
        console.log("Added files:    %j", change.addedFiles);
        console.log("Modified files: %j", change.modifiedFiles);
        console.log("Removed files:  %j", change.removedFiles);

        console.log("Added folders:    %j", change.addedFolders);
        console.log("Modified folders: %j", change.modifiedFolders);
        console.log("Removed folders:  %j", change.removedFolders);*/
    });
});

//Handle Process Exceptions
process.on('SIGUSR2', function () {
    log.reopenFileStreams();
});

process.on('uncaughtException', function (err) {
    //Get error trace
    var stack = new Error(err).stack;

    console.log(color('Uncaught Exception:', 'red+underline'));

    console.error(err);

    //Show stack trace
    console.log(stack);

    errors_log.error(err, 'Uncaught Exception');
});
