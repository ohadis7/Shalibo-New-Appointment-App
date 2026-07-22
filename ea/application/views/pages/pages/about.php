<?php extend('layouts/backend_layout'); ?>

<?php section('content'); ?>

<div id="about-page" class="container backend-page py-3">
    <div id="about" class="col-lg-8 offset-lg-2">

        <div class="text-center my-5">
            <img src="<?= base_url('assets/img/shalibo-logo.png') ?>" alt="Shalibo Logo" class="mb-4" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover;">

            <h3 class="fw-bold" style="letter-spacing: 2px;">S H A L I B O</h3>
            <h6 class="text-primary fw-semibold">
                Wellness Appointment Scheduler
            </h6>
        </div>

        <p class="mb-5 text-muted text-center">
            Shalibo Wellness helps you manage your wellness appointments with ease. 
            Schedule, reschedule, and manage all your wellness services in one place.
        </p>

        <div class="card mb-5">
            <div class="card-header">
                <h5 class="fw-light mb-0">
                    <?= lang('current_version') ?>
                </h5>
            </div>
            <div class="card-body">
                <strong>
                    <?= config('version') ?>
                </strong>
            </div>
        </div>

        <div class="text-center mb-5 py-4">
            <a class="btn btn-primary d-block w-50 m-auto" href="https://shalibowellness.com" target="_blank">
                <i class="fas fa-globe me-2"></i>
                Visit Shalibo Wellness
            </a>
        </div>

        <h4 class="fw-light mb-3">
            <?= lang('license') ?>
        </h4>

        <p>
            <?= lang('about_app_license') ?>
        </p>

        <div class="mb-5">
            <a class="btn btn-outline-secondary d-block w-50 m-auto" href="https://www.gnu.org/licenses/gpl-3.0.en.html"
               target="_blank">
                <i class="fas fa-external-link-alt me-2"></i>
                GPL-3.0
            </a>
        </div>
    </div>
</div>

<?php end_section('content'); ?>

