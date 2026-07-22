<?php
/**
 * Reset production passwords for Shalibo Wellness EA
 * 
 * Run via ECS Exec:
 *   aws ecs execute-command --cluster easyappt-cluster --task $(aws ecs list-tasks --cluster easyappt-cluster --region eu-central-1 --profile shalibo-eb-manage --query 'taskArns[0]' --output text) --container easyappt --command "php /tmp/reset-passwords.php" --region eu-central-1 --profile shalibo-eb-manage --interactive
 * 
 * First, copy this file to the container:
 *   aws ecs execute-command --cluster easyappt-cluster --task <TASK_ID> --container easyappt --command "bash -c 'cat > /tmp/reset-passwords.php'" --region eu-central-1 --profile shalibo-eb-manage < reset-prod-passwords.php
 */

define('BASEPATH', '/var/www/html/system/');
require_once '/var/www/html/config.php';
require_once '/var/www/html/application/config/constants.php';
require_once '/var/www/html/application/helpers/password_helper.php';

$pdo = new PDO('mysql:host=localhost;dbname=easyappointments;charset=utf8', 'root', 'secret');

$resets = [
    ['id' => 1,  'email' => 'developer@shalibowellness.com', 'password' => 'Shalibo1234567'],
    ['id' => 18, 'email' => 'nuna@shalibowellness.com',     'password' => 'Shalibo1234567'],
];

echo "Resetting passwords...\n";

foreach ($resets as $user) {
    $hash = hash_password('', $user['password']);
    $stmt = $pdo->prepare('UPDATE ea_user_settings SET password = ?, salt = "" WHERE id_users = ?');
    $stmt->execute([$hash, $user['id']]);
    
    // Verify
    $stmt = $pdo->prepare('SELECT password FROM ea_user_settings WHERE id_users = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $ok = password_verify($user['password'], $row['password']);
    echo ($ok ? '✅' : '❌') . " {$user['email']} (ID {$user['id']}): " . ($ok ? 'PASSWORD RESET OK' : 'FAILED') . "\n";
}
