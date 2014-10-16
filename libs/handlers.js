//Modules Required
var color = require( 'ansi-color' ).set;

//Load my libs
var queues = require( './queues.js' );
var connections = require( './connections.js' );

function setGlobalConnectionHandlers() {
    //Check for connection errors
    connection.on('error', function(error) {
        //Log connection errors
       errors_log.error(error);
    });
    //Start connection
    connection.on('connect', function() {
        console.log(color( "\nConnection::connect\n", 'white'));
    });
    //Connection is ready
    connection.on('ready', function() {
        console.log(color("\nConnection ready...\n", 'yellow'));
        //Check if are changes in queue
        if (fileActionsQueue.length > 0) {
            console.log( 'There are ' + fileActionsQueue.length + ' changes to process! (2)' );

            queues.processQueues();
        }
        //Initialize operation
        connection.sftp(
            function(err, sftp) {
                if (err) {
                    console.log("\nError, problem starting SFTP: %s\n", err);
                    return;
                }
                //Use sftp connection in all requests
                active_sftp = sftp;

                //Mark active connection
                active_connection = true;
            }
        );
    });
    //Handle connection end
    connection.on('end', function() {
        console.log(color("\nConnection end!\n", 'red'));
        //Create a new connection again
        connection.resetConnection();
    });
    //Handle connection close
    connection.on('close', function() {
        console.log(color("\nConnection closed!\n", 'red+underline'));
        //Create a new connection again...

        eonnections.resetConnection();
    });
}

//Expose handlers public API
module.exports = {
    setGlobalConnectionHandlers: setGlobalConnectionHandlers
};
