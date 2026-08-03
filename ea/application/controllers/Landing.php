<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Shalibo Wellness — Booking Hub Landing Page
 *
 * Serves as the main entry point: customers choose their service.
 * Each card links to a dedicated EA booking URL with ?service=ID&provider=ID
 * so each customer only sees their relevant provider and service.
 *
 * @package     EasyAppointments
 * @since       v1.5.0
 * ---------------------------------------------------------------------------- */

/**
 * Landing controller.
 *
 * @package Controllers
 */
class Landing extends EA_Controller
{
    /**
     * Landing constructor.
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Render the landing page.
     */
    public function index(): void
    {
        method('get');

        $company_name = setting('company_name');

        html_vars([
            'page_title' => 'Book an Appointment',
            'company_name' => $company_name,
        ]);

        $this->load->view('pages/landing');
    }
}
