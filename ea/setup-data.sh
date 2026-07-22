#!/usr/bin/env bash
# ── Shalibo Wellness — EA Data Migration Script ────────
# Run after the first start to seed working plans,
# provider-service links, and MongoDB mappings.
#
# Uses names/emails instead of IDs so it works in any environment.
#
# Usage:
#   ./ea/setup-data.sh
# ───────────────────────────────────────────────────────
set -euo pipefail

MYSQL="docker exec -i ea-mysql-1 mysql -u root --password=secret easyappointments"

echo "╔════════════════════════════════════════════════╗"
echo "║   Shalibo Wellness — EA Data Setup           ║"
echo "╚════════════════════════════════════════════════╝"

# ── 1. Link Nails Tech to moon test manicure ──
echo "🔗 Linking Nails Tech -> moon test manicure..."
$MYSQL -e "
INSERT IGNORE INTO ea_services_providers (id_services, id_users)
SELECT s.id, u.id
FROM ea_services s
CROSS JOIN ea_users u
WHERE s.name LIKE '%Nails%Tech%'
  AND u.email = 'nuna1@shalibowellness.com';
" 2>&1 || echo "   (might already exist)"

# ── 2. Set GM and Madanes working plans (Sun-Thu 09:00-20:00) ──
# Uses PHP PDO with json_encode() to avoid shell escaping bugs that corrupt JSON
echo "📅 Setting working plans..."
docker exec -i ea-php-fpm-1 php -r '
$plan = [
    "sunday" => ["start" => "09:00", "end" => "20:00", "breaks" => []],
    "monday" => ["start" => "09:00", "end" => "20:00", "breaks" => []],
    "tuesday" => ["start" => "09:00", "end" => "20:00", "breaks" => []],
    "wednesday" => ["start" => "09:00", "end" => "20:00", "breaks" => []],
    "thursday" => ["start" => "09:00", "end" => "20:00", "breaks" => []],
    "friday" => null,
    "saturday" => null
];
$json = json_encode($plan);

try {
    $pdo = new PDO("mysql:host=ea-mysql-1;dbname=easyappointments;charset=utf8", "root", "secret");
    
    // Update GM
    $stmt = $pdo->prepare("UPDATE ea_user_settings us JOIN ea_users u ON us.id_users = u.id SET us.working_plan = ? WHERE u.email = ? AND u.first_name LIKE ?");
    $stmt->execute([$json, "nuna@shalibowellness.com", "%GM%"]);
    echo "  ✅ GM working plan set (rows: " . $stmt->rowCount() . ")\n";
    
    // Update Madanes (unique email, no name filter needed)
    $stmt_m = $pdo->prepare("UPDATE ea_user_settings us JOIN ea_users u ON us.id_users = u.id SET us.working_plan = ? WHERE u.email = ?");
    $stmt_m->execute([$json, "yotam@shalibowellness.com"]);
    echo "  ✅ Madanes working plan set (rows: " . $stmt_m->rowCount() . ")\n";
} catch (Exception $e) {
    echo "  ❌ Failed: " . $e->getMessage() . "\n";
}
' 2>&1

# ── 4. Seed MongoDB mapping for nuna@shalibowellness.com ──
echo "🍃 Seeding MongoDB email mapping..."
docker exec -i ea-php-fpm-1 php -r '
require_once "/var/www/html/vendor/autoload.php";
require_once "/var/www/html/config.php";

try {
    $client = new MongoDB\\Client(Config::MONGODB_URI, ["serverSelectionTimeoutMS" => 5000]);
    $db = $client->selectDatabase(Config::MONGODB_DATABASE);
    $collection = $db->selectCollection("ea_provider_email_mappings");
    
    $result = $collection->updateOne(
        ["email" => "nuna@shalibowellness.com"],
        ["$set" => [
            "email" => "nuna@shalibowellness.com",
            "lastSyncedAt" => new MongoDB\\BSON\\UTCDateTime(time() * 1000),
        ]],
        ["upsert" => true]
    );
    echo "✅ MongoDB mapping seeded\n";
} catch (Exception $e) {
    echo "⚠️ MongoDB seed skipped: " . $e->getMessage() . "\n";
    echo "   (MongoDB connector works for non-shared emails without this)\n";
}
' 2>&1

echo ""
echo "✅ Data setup complete!"
echo "  - Nails Tech linked to moon test manicure"
echo "  - GM working plan: Sun-Thu 09:00-20:00"
echo "  - Madanes working plan: Sun-Thu 09:00-20:00"
echo "  - MongoDB mapping seeded (if MongoDB available)"
