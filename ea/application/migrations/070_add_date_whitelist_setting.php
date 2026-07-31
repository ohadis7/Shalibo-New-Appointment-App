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
 * Migration: Add date_whitelist_enabled column to user_settings table.
 *
 * Enables "Date Whitelist Mode" for providers: when enabled, the provider is
 * unavailable by default and only available on explicitly defined exception dates.
 */
class Migration_Add_date_whitelist_setting extends EA_Migration
{
    /**
     * Upgrade method.
     */
    public function up(): void
    {
        if (!$this->db->field_exists('date_whitelist_enabled', 'user_settings')) {
            $this->dbforge->add_column('user_settings', [
                'date_whitelist_enabled' => [
                    'type' => 'TINYINT',
                    'constraint' => 4,
                    'default' => 0,
                    'null' => false,
                    'after' => 'calendar_view',
                ],
            ]);
        }
    }

    /**
     * Downgrade method.
     */
    public function down(): void
    {
        if ($this->db->field_exists('date_whitelist_enabled', 'user_settings')) {
            $this->dbforge->drop_column('user_settings', 'date_whitelist_enabled');
        }
    }
}
