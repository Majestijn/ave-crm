<?php
$lines = file('storage/logs/laravel.log');
$count = count($lines);
$start = max(0, $count - 200);
for ($i = $start; $i < $count; $i++) {
    $line = $lines[$i];
    if (strpos($line, 'local.INFO') !== false || strpos($line, 'local.ERROR') !== false || strpos($line, 'testing.ERROR') !== false) {
        echo $line;
    }
}
