<?php extend('layouts/account_layout'); ?>

<?php section('styles'); ?>

<style>
/* ── Shalibo Login Overrides ── */

body {
  background-image:
    radial-gradient(ellipse 55% 45% at 8% 6%,  rgba(91,181,176,.10) 0%, transparent 55%),
    radial-gradient(ellipse 50% 40% at 92% 94%, rgba(91,181,176,.08) 0%, transparent 55%);
}

.card {
  border: 1px solid rgba(255,255,255,.92);
  border-top: 3px solid var(--shalibo-teal);
  box-shadow: 0 4px 6px -1px rgba(30,43,42,.06), 0 16px 40px -4px rgba(30,43,42,.10);
  transition: box-shadow 0.25s ease;
  border-radius: 1rem !important;
}

.card:hover {
  box-shadow: 0 8px 12px -2px rgba(30,43,42,.08), 0 24px 48px -6px rgba(30,43,42,.14);
}

img[alt="Shalibo Wellness"] {
  border: 3px solid rgba(91,181,176,.15);
  box-shadow: 0 8px 28px rgba(0,0,0,.10), 0 0 0 2px rgba(91,181,176,.16) !important;
  transition: all 0.3s ease;
}

img[alt="Shalibo Wellness"]:hover {
  box-shadow: 0 12px 36px rgba(0,0,0,.13), 0 0 0 3px rgba(91,181,176,.30) !important;
}

.text-primary.fw-semibold {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.35rem;
  letter-spacing: -0.2px;
  color: var(--shalibo-text) !important;
}

.small.mb-0 {
  color: var(--shalibo-text-gray);
  font-size: 0.82rem;
}

.input-group-text {
  border: 1px solid #e0e0e0;
  border-right: none;
  color: var(--shalibo-teal);
}

.form-control {
  border: 1px solid #e0e0e0;
  border-left: none;
  padding-left: 0.5rem !important;
  font-size: 0.9rem;
}

.form-control:focus {
  border-color: var(--shalibo-teal);
  box-shadow: 0 0 0 3px rgba(91,181,176,.12);
}

.form-control::placeholder {
  color: #b5b5b5;
  font-size: 0.85rem;
}

.form-label {
  font-size: 0.85rem;
  color: var(--shalibo-text);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.btn-primary {
  border-radius: 0.5rem;
  padding: 0.7rem 1.25rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, var(--shalibo-teal) 0%, #3D8B87 100%) !important;
  border: none;
  box-shadow: 0 4px 18px rgba(91,181,176,.30);
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(91,181,176,.45);
  background: linear-gradient(135deg, var(--shalibo-teal) 0%, #3D8B87 100%);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(91,181,176,.25);
}

a[href*="recovery"] {
  color: var(--shalibo-text-gray);
  font-size: 0.82rem;
  transition: color 0.2s ease;
}

a[href*="recovery"]:hover {
  color: var(--shalibo-teal);
}

.card-footer {
  background: transparent;
  border-top: 1px solid rgba(0,0,0,.05);
  padding: 1rem;
}

.card-footer small {
  color: var(--shalibo-text-gray) !important;
  font-size: 0.78rem;
}

@media (max-width: 480px) {
  .card-body.p-5 {
    padding: 2rem 1.5rem !important;
  }
}
</style>

<?php end_section('styles'); ?>

<?php section('content'); ?>

<div class="text-center mb-4">
    <img src="<?= asset_url('assets/img/shalibo-logo.png') ?>" 
         alt="Shalibo Wellness" class="shadow mb-3" width="96" height="96" style="border-radius: 50%; object-fit: cover;">
    <h4 class="text-primary fw-semibold mb-1"><?= lang('backend_section') ?></h4>
    <p class=" small mb-0"><?= lang('you_need_to_login') ?></p>
</div>

<div class="alert d-none"></div>

<form id="login-form">
    <div class="mb-3">
        <label for="username" class="form-label fw-medium">
            <?= lang('username') ?>
        </label>
        <div class="input-group">
            <span class="input-group-text bg-light border-end-0">
                <i class="fas fa-user"></i>
            </span>
            <input type="text" id="username"
                   placeholder="you@example.com" inputmode="email"
                   class="form-control border-start-0 ps-2" required/>
        </div>
    </div>

    <div class="mb-4">
        <label for="password" class="form-label fw-medium">
            <?= lang('password') ?>
        </label>
        <div class="input-group">
            <span class="input-group-text bg-light border-end-0">
                <i class="fas fa-lock"></i>
            </span>
            <input type="password" id="password"
                   placeholder="&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;"
                   class="form-control border-start-0 ps-2" required/>
        </div>
    </div>

    <?php if (vars('require_captcha')): ?>
        <?php if (vars('altcha_enabled') === '1'): ?>
            <div class="mb-4">
                <div id="altcha-widget" class="altcha-widget"></div>
                <input type="hidden" id="altcha-payload" value="">
                <span id="altcha-hint" class="help-block text-danger small" style="opacity:0">&nbsp;</span>
            </div>
        <?php else: ?>
            <div class="mb-4">
                <label class="captcha-title form-label fw-medium" for="captcha-text">
                    CAPTCHA
                    <button type="button" class="btn btn-link text-dark text-decoration-none py-0 px-1">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </label>
                <img class="captcha-image d-block mb-2 rounded" src="<?= site_url('captcha') ?>" alt="CAPTCHA">
                <input id="captcha-text" class="captcha-text form-control" type="text" placeholder="<?= lang('enter_captcha_here') ?>"/>
                <span id="captcha-hint" class="help-block text-danger small" style="opacity:0">&nbsp;</span>
            </div>
        <?php endif; ?>
    <?php endif; ?>

    <div class="d-grid gap-2 mb-3">
        <button type="submit" id="login" class="btn btn-primary">
            <i class="fas fa-sign-in-alt me-2"></i>
            <?= lang('login') ?>
        </button>
    </div>

    <div class="text-center">
        <a href="<?= site_url('recovery') ?>" class="text-decoration-none small">
            <i class="fas fa-key me-1"></i>
            <?= lang('forgot_your_password') ?>
        </a>
    </div>
</form>
<?php end_section('content'); ?>

<?php section('scripts'); ?>

<script src="<?= asset_url('assets/js/http/login_http_client.js') ?>"></script>
<script src="<?= asset_url('assets/js/pages/login.js') ?>"></script>

<script>
/* ── Shalibo login refinements ── */
(function() {
  'use strict';

  /* Update button text — only if English "Login" */
  var btn = document.getElementById('login');
  if (btn && btn.textContent.trim() === 'Login') {
    var icon = btn.querySelector('i');
    btn.innerHTML = '';
    if (icon) btn.appendChild(icon);
    btn.insertAdjacentText('beforeend', ' Sign In');
  }

  /* Remove key icon from forgot link for a cleaner look */
  var link = document.querySelector('a[href*="recovery"]');
  if (link) {
    var icon = link.querySelector('i');
    if (icon) icon.remove();
  }
})();
</script>

<?php end_section('scripts'); ?>
