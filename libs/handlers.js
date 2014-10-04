//Modules Required
var color = require( 'ansi-color' ).set;

//Load my libs
var queues = require( './queues.js' );

function setGlobalConnectionHandlers() {
    //Check for connection errors
    connection.on('error', function() {
        //Log connection errors
        errors_log.error(error);
    });
    //Start connection
    connection.on('connect', function() {
        console.log(color('Connection::connect', 'white'));
    });
    //Connection is ready
    connection.on('ready', function(){
        console.log(color('Connection ready...', 'yellow'));

        //Ensure all files are processed
        queues.processQueues();

        //Initialize operation
        connection.sftp(
            function(err, sftp) {
                if (err) {
                    console.log("Error, problem starting SFTP: %s", err);
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
        console.log(color('Connection end!', 'red'));
        //Create a new connection again
        connection.resetConnection();
    });
    //Handle connection close
    connection.on('close', function() {
        console.log(color('Connection closed!', 'red+underlined'));
        //Create a new connection again
        connection.resetConnection();
    });
}

//Expose handlers public API
module.exports = {
    setGlobalConnectionHandlers: setGlobalConnectionHandlers
};
