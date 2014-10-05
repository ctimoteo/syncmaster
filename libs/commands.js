//Auxiliary function to add or modify files
function sendFile(file, connection) {
    //Check active connection or enqueue request
    if ( active_connection ) {
        active_sftp.fastPut(
            origin + file,
            target + '/' + file,
            {
                flags: 'w',
                encoding: 'utf-8',
                mode: 0666,
                autoClose: true
            },
            function(err) {
                if (err) {
                    console.log('Error, transfering file: ' + origin + file);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                    console.log('sendedFile: ' + file);
                }
                //End operation
                //active_sftp.end();
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push( { path: origin + file, dest_path: target + '/' + file, action: 'sendFile' })
    }
}

//Auxiliary function to remove files
function removeFile(file, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.unlink(
            target + '/' + file,
            function(err) {
                if (err) {
                    console.log('FAILED to remove file: ' + target + '/' + file);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                    console.log('removedFile: ' + file);
                }
                //End operation
                //active_sftp.end();
            }
        );
    }
    else {  //Ok, queue file remove
        fileActionsQueue.push({path: target + '/' + file, action: 'removeFile'});
    }
}

//Auxiliary function to create folder
function addFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.mkdir(
            target + '/' + folder,
            function(err) {
                if (err) {
                    console.log('FAILED to remove file: ' + target + '/' + folder);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                    console.log('addedFolder: ' + folder);
                }
                //End operation
                //active_sftp.end();
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: target + '/' + folder, action: 'addFolder'});
    }
}

//Auxiliary function to create folder
function updateFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.rename(
            origin + '/' + folder,
            target + '/' + folder,
            function(err) {
                if ( err ) {
                    console.log('FAILED to unlink ' + target + '/' + folder);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                    console.log( 'removeFile:' + file );
                }
                //End operation
                //active_sftp.end();
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: origin + '/' + folder, dest_path: target + '/' + folder , action: 'updateFolder'});
    }
}

//Auxiliary function to create folder
function deleteFolder(folder, connection) {
    //Initialize operation
    if (active_connection) {
        active_sftp.rmdir(
            target + '/' + folder,
            function(err) {
                if (err) {
                    console.log('FAILED to remove folder: ' + target + '/' + folder);
                    //Send to logs
                    errors_log.debug(err);
                }
                else {
                    console.log('removedFolder: ' + folder);
                }
                //End operation
                //active_sftp.end();
            }
        );
    }
    else {  //Ok, queue file change
        fileActionsQueue.push({path: target + '/' + folder, action: 'deleteFolder'});
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
