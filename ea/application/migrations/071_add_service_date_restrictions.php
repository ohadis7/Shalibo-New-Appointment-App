<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Easy!Appointments - Online Appointment Scheduler
 *
 * @package     EasyAppointments
 * @author      A.Tselegidis <alextselegidis@gmail.com>
 * @copyright   Copyright (c) Alex Tselegidis
 * @license     https://opensource.org/licenses/GPL-3.0 - GPLv3
 * @link        https://easyappointments.org
 * @since       v1.5.0
 * ---------------------------------------------------------------------------- */

/**
 * Migration: Add date_restrictions column to services table.
 *
 * Enables service-level date restrictions: when set, the service is ONLY
 * available on the explicitly defined date ranges. The column stores a JSON
 * array of {"start": "Y-m-d", "end": "Y-m-d"} objects.
 */
class Migration_Add_service_date_restrictions extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        if (!$this->db->field_exists('date_restrictions', 'services')) {
            $this->dbforge->add_column('services', [
                'date_restrictions' => [
                    'type' => 'TEXT',
                    'null' => true,
                    'after' => 'color',
                ],
            ]);
        }
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        if ($this->db->field_exists('date_restrictions', 'services')) {
            $this->dbforge->drop_column('services', 'date_restrictions');
        }
    }
}
