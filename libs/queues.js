//Modules Required
var color = require( 'ansi-color' ).set;

//Get my libs
var commands = require( './commands.js' );

//Auxiliary function to initialize/re-initialize ssh connection
function processQueues() {
    //Check valid connection
    if (!active_connection) {
        console.log(color('No active connection, process queue later.', 'red'));

        //Defer this call
        setTimeout(
            function() {
                processQueues();
            },
            5000
        );

        return;
    }

    if (fileActionsQueue.length > 0) {
        console.log(color('Processing change queues...', 'yellow'));
    }
    else {
        console.log(color('Empty queue, nothing to do for now...', 'white'));
    }

    //Process queue
    while( fileActionsQueue.length > 0 ) {
        //Retrieve change to process
        var change = fileActionsQueue.pop();
        //Loop through actions
        switch(change.action) {
            case 'sendFile':
                commands.sendFile(change.path, connection);
                break;
            case 'removeFile':
                commands.removeFile(change.path, connection);
                break;
            case 'addFolder':
                commands.addFolder(change.path, connection);
                break;
            case 'updateFolder':
                commands.updateFolder(change.path, connection);
                break;
            case 'deleteFolder':
                commands.deleteFolder(change.path, connection);
                break;
        }
    }
}

//Expose handlers public API
module.exports = {
    processQueues: processQueues
};
