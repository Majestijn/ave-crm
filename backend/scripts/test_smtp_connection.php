<?php

$host = 'ssl://mail.zxcs.nl';
$port = 465;
$timeout = 10;

echo "Attempting to connect to $host:$port...\n";

$fp = fsockopen($host, $port, $errno, $errstr, $timeout);

if (!$fp) {
    echo "ERROR: $errno - $errstr\n";
} else {
    echo "SUCCESS: Connected to $host:$port\n";
    $response = fgets($fp, 512);
    echo "Server response: $response\n";
    
    // Say EHLO
    fwrite($fp, "EHLO " . gethostname() . "\r\n");
    echo "Sent: EHLO " . gethostname() . "\n";
    
    // Read response (may be multiple lines)
    while($line = fgets($fp, 512)) {
        echo "Server: $line";
        if(substr($line, 3, 1) == ' ') break;
    }
    
    fclose($fp);
}
