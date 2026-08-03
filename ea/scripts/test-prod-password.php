<?php
/**
 * Test the exact production password Shalibo@1234567 against bcrypt
 * Run: docker exec -i ea-php-fpm-1 php /tmp/test-prod-password.php
 */
define("BASEPATH", "/var/www/html/system/");
require_once "/var/www/html/config.php";
require_once "/var/www/html/application/config/constants.php";
require_once "/var/www/html/application/helpers/password_helper.php";

$pw = "Shalibo@1234567";
echo "Testing password: [$pw] (length: " . strlen($pw) . ")\n";

// 1. Generate a fresh hash from this password
$hash = hash_password("", $pw);
echo "1. Fresh bcrypt hash: $hash\n";
echo "   Verify fresh: " . (verify_password("", $pw, $hash) ? "OK" : "FAIL") . "\n";

// 2. Test with the current stored hash (from when I reset it locally)
// The hash I stored earlier was: $2y$12$pWffshd2s.cTyEOUYt05iOsHMvwd8WReWa8cZOGc0TTLUdEIriCfy
echo "\n2. Testing against the locally stored hash:\n";
$stored_local = '$2y$12$pWffshd2s.cTyEOUYt05iOsHMvwd8WReWa8cZOGc0TTLUdEIriCfy';
echo "   verify_password: " . (verify_password("", $pw, $stored_local) ? "OK" : "FAIL") . "\n";
echo "   password_verify: " . (password_verify($pw, $stored_local) ? "OK" : "FAIL") . "\n";

// 3. Try with different special characters
echo "\n3. Testing password_verify fundamental behavior:\n";
$variants = [
    "Shalibo1234567",
    "shalibo@1234567",
    "SHALIBO@1234567",
    "Shalibo@1234567 ",
    " Shalibo@1234567",
    "Shalibo@1234567\n",
];
foreach ($variants as $v) {
    $h = password_hash($v, PASSWORD_BCRYPT, ["cost" => 12]);
    echo "   [" . substr($v, 0, 20) . "]: hash=" . substr($h, 0, 30) . "... verify=" . (password_verify($v, $h) ? "OK" : "FAIL") . "\n";
}

// 4. Check the DB for all user password hashes (without changing them)
echo "\n4. Current DB password hashes (read-only):\n";
$pdo = new PDO("mysql:host=ea-mysql-1;dbname=easyappointments;charset=utf8", "root", "secret");
$stmt = $pdo->query("SELECT u.id, u.email, LEFT(s.password, 40) AS pw_prefix, 
    CASE WHEN s.password LIKE '\$2y$%' THEN 'bcrypt' WHEN LENGTH(s.password)=64 THEN 'sha256' ELSE 'other' END AS algo
    FROM ea_users u JOIN ea_user_settings s ON u.id=s.id_users WHERE s.password IS NOT NULL ORDER BY u.id");
echo "   ID | Email                     | Algorithm | Hash prefix\n";
echo "   ---+---------------------------+-----------+----------------------------------------\n";
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    printf("   %2d | %-25s | %-9s | %s\n", $row['id'], $row['email'], $row['algo'], $row['pw_prefix']);
}
