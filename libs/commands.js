//Get my libs
var moment = require( 'moment' );

//Auxiliary function to add or modify files
function sendFile(file, connection) {
    //Check active connection or enqueue request
    if ( active_connection ) {
        active_sftp.fastPut(
            origin + file,
            target + file,
            {
                flags: 'w',
                encoding: 'utf-8',
                mode: 0666,
                autoClose: true
            },
            function(err) {
                if (err) {
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                  console.log('added file ' + moment().format('YYYY/MM/DD h:mm:ss') + ' ' + file);
                }
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push( { path: file, action: 'sendFile' })
    }
}

//Auxiliary function to remove files
function removeFile(file, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.unlink(
            target + file,
            function(err) {
                if (err) {
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                  console.log('removed file ' + moment().format('YYYY/MM/DD h:mm:ss') + ' ' + file);
                }
            }
        );
    }
    else {  //Ok, queue file remove
        fileActionsQueue.push({path: file, action: 'removeFile'});
    }
}

//Auxiliary function to create folder
function addFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.mkdir(
            target + folder,
            function(err) {
                if (err) {
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                  console.log('added folder ' + moment().format('YYYY/MM/DD h:mm:ss') + ' /' + folder);
                }
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: folder, action: 'addFolder'});
    }
}

//Auxiliary function to create folder
function updateFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.rename(
            origin + folder,
            target + folder,
            function(err) {
                if ( err ) {
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                  console.log('updated folder ' + moment().format('YYYY/MM/DD h:mm:ss') + ' /' + folder );
                }
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: folder, action: 'updateFolder'});
    }
}

//Auxiliary function to create folder
function deleteFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.rmdir(
            target + folder,
            function(err) {
                if (err) {
                    //console.log('FAILED to remove folder: ' + target + folder);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                  console.log('removed folder ' + moment().format('YYYY/MM/DD h:mm:ss') + ' /' + folder);
                }
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: folder, action: 'deleteFolder'});
    }
}

//SSH and SFTP commands public API
module.exports = {
    sendFile:     sendFile,
    removeFile:   removeFile,
    addFolder:    addFolder,
    updateFolder: updateFolder,
    deleteFolder: deleteFolder
};