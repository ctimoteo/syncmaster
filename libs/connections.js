//Get required modules
var Connection = require( 'ssh2'   );
var domain     = require( 'domain' );

//Auxiliary function to initialize/re-initialize ssh connection
function initializeConnection() {
    //Add my libs
    var handlers = require( './handlers.js' );

    //Initialize the ssh connection
    connection = new Connection(),
        handler = domain.create();
    //Handling "error" event inside domain handler.
    handler.add(connection);
    //Add global connection handlers
    handlers.setGlobalConnectionHandlers();
    //Start connection
    connection.connect(OptionsForSFTP);
}

function resetConnection() {
    //Mark inactive connection
    active_connection = false;
    //Start connection
    connection.connect(OptionsForSFTP);
}

//Expose handlers public API
module.exports = {
    resetConnection: resetConnection,
    initializeConnection: initializeConnection
};
