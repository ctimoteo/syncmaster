# Sync Master #

I made this code to solve one basic problem i had. How to work with local files and keep code syncronized with a remote location.

## Setup ##

Get all dependencies:

    npm install

Create one user_list.json config file:

    cp config/user_list.json.dist config/user_list.json

edit the file to add user, machine, private key location and private key passphrase password

## Usage ##

    ./syncmaster USER@MACHINE ORIGIN_PATH/ DESTINATION_PATH/

ensure that origin path is one folder and ends with /, destination path is one path to a folder and ends with a / too.

# Main modules used: #

https://www.npmjs.org/package/rsync - to synchronize code at script start, or if connection fails

https://www.npmjs.org/package/ssh2 - to send all changes to remote server

https://www.npmjs.org/package/fsmonitor - to get local changes in files/folders

Thanks to all developers that had developed and published the necessary modules (see package.json)
