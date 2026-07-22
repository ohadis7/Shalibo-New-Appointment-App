<?php
/**
 * Test MongoDB seed syntax - run inside the ea-php-fpm-1 container
 * Usage: docker exec -i ea-php-fpm-1 php /tmp/test-mongo-seed.php
 */

require_once "/var/www/html/vendor/autoload.php";
require_once "/var/www/html/config.php";

echo "MONGODB_URI defined: " . (defined('Config::MONGODB_URI') ? 'YES' : 'NO') . "\n";
echo "MONGODB_DATABASE defined: " . (defined('Config::MONGODB_DATABASE') ? 'YES' : 'NO') . "\n";

if (!defined('Config::MONGODB_URI')) {
    echo "❌ MONGODB_URI constant not defined\n";
    exit(1);
}

$uri = Config::MONGODB_URI;
echo "URI: " . substr($uri, 0, 30) . "...\n";

try {
    $client = new MongoDB\Client($uri, ["serverSelectionTimeoutMS" => 5000]);
    $db = $client->selectDatabase(Config::MONGODB_DATABASE);
    echo "✅ MongoDB connection OK\n";

    $collection = $db->selectCollection("ea_provider_email_mappings");

    $result = $collection->updateOne(
        ["email" => "nuna@shalibowellness.com"],
        ["\$set" => [
            "email" => "nuna@shalibowellness.com",
            "lastSyncedAt" => new MongoDB\BSON\UTCDateTime(time() * 1000),
        ]],
        ["upsert" => true]
    );

    echo "✅ Mapping upserted: " . ($result->getUpsertedCount() ?: $result->getModifiedCount()) . " documents\n";
} catch (Exception $e) {
    echo "❌ Failed: " . $e->getMessage() . "\n";
    exit(1);
}
