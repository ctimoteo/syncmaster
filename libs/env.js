//Load necessary modules
var fs     = require( 'fs'         );
var Rsync  = require( 'rsync'      );
var bunyan = require( 'bunyan'     );
var color  = require( 'ansi-color' ).set;

//Function to set all global variables
function setGlobalVariables() {
    //Define global variables
    GLOBAL.handler           = null;
    GLOBAL.errors_log        = null;
    GLOBAL.rsync             = null;
    GLOBAL.rsync2            = null;
    GLOBAL.user              = null;
    GLOBAL.origin            = null;
    GLOBAL.target            = null;
    GLOBAL.machine           = null;
    GLOBAL.key               = null;
    GLOBAL.password          = null;
    GLOBAL.OptionsForSFTP    = null;
    GLOBAL.argv              = null;
    GLOBAL.connection        = null;
    GLOBAL.config            = null;
    GLOBAL.active_connection = false;
    GLOBAL.active_sftp       = null;

    //Set files queues
    GLOBAL.fileActionsQueue = [];
}

//Function to check script arguments
function checkScriptArgs() {
    //Initialize vars
    var re, tmp;

    //Check if valid args
    if (argv.length < 5) {
        console.log("\n" + color('Usage:', 'yellow') +
            ' ./syncmaster ' + color('USER@MACHINE', 'green') +
            ' ' + color('ORIGIN_PATH', 'red') + ' ' +
            color('DESTINATION_PATH', 'blue') + "\n"
        );
        //End process
        return;
    }
    //Retrieve args data
    origin = argv[3];
    target = argv[4];
    //Ensure that origin ends with /
    if ( origin[origin.length - 1] !== '/' ) {
        //Add slash to origin
        origin += '/';
    }
    //Ensure that target ends with /
    if ( target[target.length - 1] !== '/' ) {
        //Add slash to origin
        target += '/';
    }
    //Parse user/machine
    re = /(.+)@(.+)/;
    tmp = argv[2].match(re);

    //Check valid user and machine
    if (tmp && tmp.length === 3) {
        user = tmp[1];
        machine = tmp[2];
    }
    else {
        //Log error
        errors_log.error('Invalid user@machine data: ' + argv[2]);
        //Exit with error
        console.log("\n" + color('Invalid user@machine data: ', 'red') + ' ' + color(argv[2], 'blue') + "\n");
        //End process
        return;
    }
    //Verify if key/password is configured for user/machine
    if (config[user] && config[user][machine] && config[user][machine].key && config[user][machine].password) {
        key = config[user][machine].key;
        password = config[user][machine].password;
    }
    else {
        //Log error
        errors_log.error('Failed to retrieve ssh key/password for user ' + user + ' to machine ' + machine);
        //Exit with error
        console.log("\n" + color('Failed to retrieve ssh key/password for user' + user + ' to machine ' + machine, 'red') + "\n");
        //End process
        return;
    }
}

//Lib with auxiliary functions to load start env
function loadSyncEnv(machine, origin, target, user, password, key) {
    //Setup options for sending files through connection
    OptionsForSFTP = {
        host: machine,
        port: 22,
        username: user,
        passphrase: password,
        privateKey: fs.readFileSync(key),
        readyTimeout: 300000
    };
    //Ensure that origin ends with /
    if ( origin[origin.length - 1] !== '/' ) {
        //Add slash to origin
        new_origin = origin + '/';
    }
    else {
        new_origin = origin;
    }
    //Ensure that target ends with /
    if ( target[target.length - 1] !== '/' ) {
        //Add slash to origin
        new_target = target + '/';
    }
    else {
        new_target = target;
    }
    //Sync target with origin
    rsync = new Rsync()
        .shell('ssh')
        .flags('avrz')
        .delete()
        .quiet()
        .source(new_origin)
        .destination(user + '@' + machine + ':' + new_target)
        .debug(false);
    //Sync origin with target
    rsync2 = new Rsync()
        .shell('ssh')
        .flags('avrz')
        .delete()
        .quiet()
        .source(user + '@' + machine + ':' + new_target)
        .destination(new_origin)
        .debug(false);
}

function initializeLogs() {
    //Initialize logs
    errors_log = bunyan.createLogger({
        name: 'sycmaster',
        streams: [{
            type: 'rotating-file',
            path: 'logs/syncmaster.log',
            period: '1d', // daily rotation
            count: 30, // keep 30 back copies
            level: 'debug'
        }]
    });
}

//Expose public API
module.exports = {
    loadSyncEnv: loadSyncEnv,
    checkScriptArgs: checkScriptArgs,
    initializeLogs: initializeLogs,
    setGlobalVariables: setGlobalVariables
};
