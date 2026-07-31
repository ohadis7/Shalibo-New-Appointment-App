<?php defined('BASEPATH') or exit('No direct script access allowed');

// Add custom values by settings them to the  array.
// Example: ['smtp_host'] = 'smtp.gmail.com';
// @link https://codeigniter.com/user_guide/libraries/email.html

$config['useragent'] = 'Shalibo Wellness';
$config['protocol'] = 'smtp'; // or 'smtp'
$config['mailtype'] = 'html'; // or 'text'
$config['smtp_debug'] = '0'; // or '1'
$config['smtp_auth'] = 1; //or FALSE for anonymous relay.
$config['smtp_host'] = 'smtp.resend.com';
$config['smtp_user'] = 'resend';
$config['smtp_pass'] = getenv('MAIL_SMTP_PASS') ?: ''; // Never commit the real key — set MAIL_SMTP_PASS (e.g. SSM param /easyappt/SMTP_PASS) in the environment.
$config['smtp_crypto'] = 'tls'; // or 'tls'
$config['smtp_port'] = 587;
$config['from_name'] = 'Shalibo Wellness';
$config['from_address'] = 'app@shalibowellness.com';
$config['reply_to'] = 'app@shalibowellness.com';
$config['crlf'] = "\r\n";
$config['newline'] = "\r\n";
