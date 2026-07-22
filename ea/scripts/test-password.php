<?php
/**
 * Test login credentials directly against the database
 * Run: docker exec -i ea-php-fpm-1 php /tmp/test-password.php
 */
require_once "/var/www/html/config.php";

$pdo = new PDO("mysql:host=ea-mysql-1;dbname=easyappointments;charset=utf8", "root", "secret");

// Check developer@shalibowellness.com password
$stmt = $pdo->prepare("SELECT u.id, u.email, u.first_name, u.last_name, s.password 
FROM ea_users u 
JOIN ea_user_settings s ON u.id = s.id_users 
WHERE u.email = ?");
$stmt->execute(["developer@shalibowellness.com"]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if ($user) {
    echo "User: {$user['email']} ({$user['first_name']} {$user['last_name']})\n";
    echo "Hash: " . $user['password'] . "\n";
    
    if (password_verify("Shalibo1234567", $user['password'])) {
        echo "✅ Password 'Shalibo1234567' MATCHES\n";
    } else {
        echo "❌ Password 'Shalibo1234567' does NOT match\n";
    }
} else {
    echo "❌ User not found\n";
}

// Also try nuna@shalibowellness.com (GM)
$stmt->execute(["nuna@shalibowellness.com"]);
echo "\n";
while ($user = $stmt->fetch(PDO::FETCH_ASSOC)) {
    echo "User ID {$user['id']}: {$user['email']} ({$user['first_name']})\n";
    echo "Hash: " . $user['password'] . "\n";
    if (password_verify("Shalibo1234567", $user['password'])) {
        echo "✅ Password 'Shalibo1234567' MATCHES\n";
    } else {
        echo "❌ Password 'Shalibo1234567' does NOT match\n";
    }
}
