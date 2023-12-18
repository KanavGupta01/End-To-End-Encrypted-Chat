# End to End Enccrypted Chat

This project implements an end to end encrypted chat session using Diffie-Hellman Key Exchange. This method of key sharing along with AES 256 encryption makes your chat immune to man-in-the-middle attacks.

The server is implemented using NodeJS. It facilitates connections and helps relay messages without ever being able to decrypt the messages as it does not have the keys.

The frontend client is implemented using angular.

You can find the source code in /src