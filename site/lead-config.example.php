<?php
// Скопируйте этот файл в lead-config.php (в ту же папку www/drillharmony.com/) и впишите пароль ящика info@drillharmony.com.
// Файл .php выполняется сервером, через браузер его содержимое не видно.
return [
  'smtp_host' => 'mail.hosting.reg.ru',   // SMTP-сервер почты REG.RU
  'smtp_port' => 465,                     // 465 — SSL; если не работает, попробуйте 587
  'smtp_user' => 'info@drillharmony.com',
  'smtp_pass' => '',                      // пароль от ящика info@drillharmony.com
];
