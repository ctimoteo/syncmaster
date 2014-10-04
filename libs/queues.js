//Auxiliary function to initialize/re-initialize ssh connection
function processQueues() {
    //Process queue
    while( fileActionsQueue.length > 0 ) {
        //Retrieve file
        var file = fileActionsQueue.pop();

        //Loop through actions
        switch(file.action) {
            case 'sendFile':
                commands.sendFile(file.path, connection);
                break;
        }
    }
}

//Expose handlers public API
module.exports = {
    processQueues: processQueues
};
