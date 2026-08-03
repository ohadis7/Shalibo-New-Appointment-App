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
 * Services page.
 *
 * This module implements the functionality of the services page.
 */
App.Pages.Services = (function () {
    const $services = $('#services');
    const $id = $('#id');
    const $name = $('#name');
    const $duration = $('#duration');
    const $price = $('#price');
    const $currency = $('#currency');
    const $serviceCategoryId = $('#service-category-id');
    const $slotInterval = $('#slot-interval');
    const $attendantsNumber = $('#attendants-number');
    const $isPrivate = $('#is-private');
    const $location = $('#location');
    const $description = $('#description');
    const $filterServices = $('#filter-services');
    const $color = $('#color');
    const $dateRestrictionsTable = $('#date-restrictions-table tbody');
    const $addDateRestriction = $('#add-date-restriction');
    let dateRestrictions = []; // Array of {start, end} objects
    let filterResults = {};
    let filterLimit = 20;

    /**
     * Add page event listeners.
     */
    function addEventListeners() {
        /**
         * Event: Filter Services Form "Submit"
         *
         * @param {jQuery.Event} event
         */
        $services.on('submit', '#filter-services form', (event) => {
            event.preventDefault();
            const key = $filterServices.find('.key').val();
            $filterServices.find('.selected').removeClass('selected');
            App.Pages.Services.resetForm();
            App.Pages.Services.filter(key);
        });

        /**
         * Event: Filter Service Row "Click"
         *
         * Display the selected service data to the user.
         */
        $services.on('click', '.service-row', (event) => {
            if ($filterServices.find('.filter').prop('disabled')) {
                $filterServices.find('.results').css('color', '#AAA');
                return; // exit because we are on edit mode
            }

            const serviceId = $(event.currentTarget).attr('data-id');

            const service = filterResults.find((filterResult) => Number(filterResult.id) === Number(serviceId));

            // Add dedicated provider link.
            const dedicatedUrl = App.Utils.Url.siteUrl('?service=' + encodeURIComponent(service.id));

            const $link = $('<a/>', {
                'href': dedicatedUrl,
                'target': '_blank',
                'data-bs-toggle': 'tooltip',
                'title': lang('booking_link'),
                'aria-label': lang('booking_link'),
                'html': [
                    $('<i/>', {
                        'class': 'fas fa-link',
                    }),
                ],
            });

            $services.find('.record-details h4').find('a').remove().end().append($link);
            new bootstrap.Tooltip($link[0]);

            App.Pages.Services.display(service);
            $filterServices.find('.selected').removeClass('selected');
            $(event.currentTarget).addClass('selected');
            $('#edit-service, #delete-service').prop('disabled', false);

            // Automatically enter edit mode
            $('#services-page').addClass('editing');
            $services.find('.add-edit-delete-group').hide();
            $services.find('.save-cancel-group').show();
            $services.find('#delete-service').show(); // Show delete button when editing
            $services.find('.record-details').find('input, select, textarea').prop('disabled', false);
            $services.find('.record-details .form-label span').prop('hidden', false);
            $filterServices.find('button').prop('disabled', true);
            $filterServices.find('.results').css('color', '#AAA');
            App.Components.ColorSelection.enable($color);
            $('#service-providers input:checkbox').prop('disabled', false);
            $('#select-all-providers, #select-none-providers').prop('disabled', false);
            // Enable date restriction editing
            $('#add-date-restriction').prop('disabled', false);
        });

        /**
         * Event: Add New Service Button "Click"
         */
        $services.on('click', '#add-service', () => {
            App.Pages.Services.resetForm();
            $('#services-page').addClass('editing');
            $services.find('.add-edit-delete-group').hide();
            $services.find('.save-cancel-group').show();
            $services.find('#delete-service').hide(); // Hide delete button when adding
            $services.find('.record-details').find('input, select, textarea').prop('disabled', false);
            $services.find('.record-details .form-label span').prop('hidden', false);
            $filterServices.find('button').prop('disabled', true);
            $filterServices.find('.results').css('color', '#AAA');
            App.Components.ColorSelection.enable($color);
            $('#service-providers input:checkbox').prop('disabled', false);
            $('#select-all-providers, #select-none-providers').prop('disabled', false);
            // Enable date restriction editing
            $('#add-date-restriction').prop('disabled', false);

            // Default values
            $name.val('Service');
            $duration.val('30');
            $price.val('0');
            $currency.val('');
            $serviceCategoryId.val('');
            $slotInterval.val('15');
            $attendantsNumber.val('1');
        });

        /**
         * Event: Cancel Service Button "Click"
         *
         * Cancel add or edit of a service record.
         */
        $services.on('click', '#cancel-service', () => {
            const id = $id.val();

            App.Pages.Services.resetForm();
            $('#services-page').removeClass('editing');

            if (id !== '') {
                App.Pages.Services.select(id, true);
            }
        });

        /**
         * Event: Save Service Button "Click"
         */
        $services.on('click', '#save-service', () => {
            const service = {
                name: $name.val(),
                duration: $duration.val(),
                price: $price.val(),
                currency: $currency.val(),
                description: $description.val(),
                location: $location.val(),
                color: App.Components.ColorSelection.getColor($color),
                slot_interval: $slotInterval.val(),
                attendants_number: $attendantsNumber.val(),
                is_private: Number($isPrivate.prop('checked')),
                id_service_categories: $serviceCategoryId.val() || undefined,
            };

            // Include service providers.
            service.providers = [];
            $('#service-providers input:checkbox').each((index, checkboxEl) => {
                if ($(checkboxEl).prop('checked')) {
                    service.providers.push($(checkboxEl).attr('data-id'));
                }
            });

            if ($id.val() !== '') {
                service.id = $id.val();
            }

            if (!App.Pages.Services.validate()) {
                return;
            }

            App.Pages.Services.save(service);
        });

        /**
         * Event: Edit Service Button "Click"
         */
        $services.on('click', '#edit-service', () => {
            $('#services-page').addClass('editing');
            $services.find('.add-edit-delete-group').hide();
            $services.find('.save-cancel-group').show();
            $services.find('.record-details').find('input, select, textarea').prop('disabled', false);
            $services.find('.record-details .form-label span').prop('hidden', false);
            $filterServices.find('button').prop('disabled', true);
            $filterServices.find('.results').css('color', '#AAA');
            App.Components.ColorSelection.enable($color);
            $('#service-providers input:checkbox').prop('disabled', false);
            $('#select-all-providers, #select-none-providers').prop('disabled', false);
            // Enable date restriction editing
            $('#add-date-restriction').prop('disabled', false);
        });

        /**
         * Event: Delete Service Button "Click"
         */
        $services.on('click', '#delete-service', () => {
            const serviceId = $id.val();
            const buttons = [
                {
                    text: lang('cancel'),
                    click: (event, messageModal) => {
                        messageModal.hide();
                    },
                },
                {
                    text: lang('delete'),
                    click: (event, messageModal) => {
                        App.Pages.Services.remove(serviceId);
                        messageModal.hide();
                    },
                },
            ];

            App.Utils.Message.show(lang('delete_service'), lang('delete_record_prompt'), buttons);
        });

        /**
         * Event: Select All Providers Button "Click"
         */
        $services.on('click', '#select-all-providers', () => {
            $('#service-providers input:checkbox').prop('checked', true);
        });

        /**
         * Event: Select None Providers Button "Click"
         */
        $services.on('click', '#select-none-providers', () => {
            $('#service-providers input:checkbox').prop('checked', false);
        });

        /**
         * Event: Add Date Restriction Button "Click"
         */
        $services.on('click', '#add-date-restriction', () => {
            dateRestrictions.push({start: '', end: ''});
            renderDateRestrictions();
        });

        /**
         * Event: Date Restriction Input Change
         */
        $services.on('change', '.date-restriction-start', (event) => {
            const index = $(event.currentTarget).closest('tr').index();
            dateRestrictions[index].start = $(event.currentTarget).val();
        });

        $services.on('change', '.date-restriction-end', (event) => {
            const index = $(event.currentTarget).closest('tr').index();
            dateRestrictions[index].end = $(event.currentTarget).val();
        });

        /**
         * Event: Delete Date Restriction Button "Click"
         */
        $services.on('click', '.delete-date-restriction', (event) => {
            const index = $(event.currentTarget).closest('tr').index();
            dateRestrictions.splice(index, 1);
            renderDateRestrictions();
        });
    }

    /**
     * Save service record to database.
     *
     * @param {Object} service Contains the service record data. If an 'id' value is provided
     * then the update operation is going to be executed.
     */
    function save(service) {
        // Attach date restrictions
        service.date_restrictions = JSON.stringify(dateRestrictions.filter(function (dr) {
            return dr.start && dr.end;
        }));

        App.Http.Services.save(service).then((response) => {
            App.Layouts.Backend.displayNotification(lang('service_saved'));
            App.Pages.Services.resetForm();
            $('#services-page').removeClass('editing');
            $filterServices.find('.key').val('');
            App.Pages.Services.filter('', response.id, true);
        });
    }

    /**
     * Delete a service record from database.
     *
     * @param {Number} id Record ID to be deleted.
     */
    function remove(id) {
        App.Http.Services.destroy(id).then(() => {
            App.Layouts.Backend.displayNotification(lang('service_deleted'));
            App.Pages.Services.resetForm();
            $('#services-page').removeClass('editing');
            App.Pages.Services.filter($filterServices.find('.key').val());
        });
    }

    /**
     * Validates a service record.
     *
     * @return {Boolean} Returns the validation result.
     */
    function validate() {
        $services.find('.is-invalid').removeClass('is-invalid');
        $services.find('.form-message').removeClass('alert-danger').hide();
        // Clear any previous date restriction validation highlights
        $dateRestrictionsTable.find('tr').removeClass('table-danger');

        try {
            // Validate required fields.
            let missingRequired = false;

            $services.find('.required').each((index, requiredField) => {
                if (!$(requiredField).val()) {
                    $(requiredField).addClass('is-invalid');
                    missingRequired = true;
                }
            });

            if (missingRequired) {
                throw new Error(lang('fields_are_required'));
            }

            // Validate the duration.
            if (Number($duration.val()) < vars('event_minimum_duration')) {
                $duration.addClass('is-invalid');
                throw new Error(lang('invalid_duration'));
            }

            // Validate date restrictions: start must be <= end when both are provided.
            for (let i = 0; i < dateRestrictions.length; i++) {
                const dr = dateRestrictions[i];
                if (dr.start && dr.end) {
                    if (dr.start > dr.end) {
                        // Highlight the row with an error class
                        $dateRestrictionsTable.find('tr').eq(i).addClass('table-danger');
                        throw new Error(lang('date_restriction_start_after_end'));
                    }
                }
            }

            return true;
        } catch (error) {
            $services.find('.form-message').addClass('alert-danger').text(error.message).show();
            return false;
        }
    }

    /**
     * Resets the service tab form back to its initial state.
     */
    function resetForm() {
        $filterServices.find('.selected').removeClass('selected');
        $filterServices.find('button').prop('disabled', false);
        $filterServices.find('.results').css('color', '');

        $services.find('.record-details').find('input, select, textarea').val('').prop('disabled', true);
        $services.find('.record-details .form-label span').prop('hidden', true);
        $services.find('.record-details #is-private').prop('checked', false);
        $services.find('.record-details h4 a').remove();

        $services.find('.add-edit-delete-group').show();
        $services.find('.save-cancel-group').hide();
        $('#edit-service, #delete-service').prop('disabled', true);

        $services.find('.record-details .is-invalid').removeClass('is-invalid');
        $services.find('.record-details .form-message').hide();

        // Reset providers checkboxes
        $('#service-providers input:checkbox').prop('disabled', true).prop('checked', false);
        $('#select-all-providers, #select-none-providers').prop('disabled', true);
        $('#service-providers a').remove();

        // Reset date restrictions
        dateRestrictions = [];
        renderDateRestrictions();
        $('#add-date-restriction').prop('disabled', true);

        App.Components.ColorSelection.disable($color);
    }

    /**
     * Display a service record into the service form.
     *
     * @param {Object} service Contains the service record data.
     */
    function display(service) {
        $id.val(service.id);
        $name.val(service.name);
        $duration.val(service.duration);
        $price.val(service.price);
        $currency.val(service.currency);
        $description.val(service.description);
        $location.val(service.location);
        $slotInterval.val(service.slot_interval);
        $attendantsNumber.val(service.attendants_number);
        $isPrivate.prop('checked', service.is_private);
        App.Components.ColorSelection.setColor($color, service.color);

        const serviceCategoryId = service.id_service_categories !== null ? service.id_service_categories : '';
        $serviceCategoryId.val(serviceCategoryId);

        // Display providers
        $('#service-providers a').remove();
        $('#service-providers input:checkbox').prop('checked', false);

        if (service.providers) {
            service.providers.forEach((serviceProviderId) => {
                const $checkbox = $('#service-providers input[data-id="' + serviceProviderId + '"]');

                if (!$checkbox.length) {
                    return;
                }

                $checkbox.prop('checked', true);

                // Add dedicated service-provider link.
                const dedicatedUrl = App.Utils.Url.siteUrl(
                    '?service=' + encodeURIComponent(service.id) + '&provider=' + encodeURIComponent(serviceProviderId),
                );

                const $link = $('<a/>', {
                    'href': dedicatedUrl,
                    'target': '_blank',
                    'data-bs-toggle': 'tooltip',
                    'title': lang('booking_link'),
                    'aria-label': lang('booking_link'),
                    'html': [
                        $('<i/>', {
                            'class': 'fas fa-link',
                        }),
                    ],
                });

                $checkbox.parent().append($link);
                new bootstrap.Tooltip($link[0]);
            });
        }

        // Display date restrictions
        if (service.date_restrictions && Array.isArray(service.date_restrictions)) {
            dateRestrictions = JSON.parse(JSON.stringify(service.date_restrictions));
        } else {
            dateRestrictions = [];
        }
        renderDateRestrictions();
    }

    /**
     * Filters service records depending on a string keyword.
     *
     * @param {String} keyword This is used to filter the service records of the database.
     * @param {Number} selectId Optional, if set then after the filter operation the record with this
     * ID will be selected (but not displayed).
     * @param {Boolean} show Optional (false), if true then the selected record will be displayed on the form.
     */
    function filter(keyword, selectId = null, show = false) {
        App.Http.Services.search(keyword, filterLimit).then((response) => {
            filterResults = response;

            $filterServices.find('.results').empty();

            response.forEach((service) => {
                $filterServices.find('.results').append(App.Pages.Services.getFilterHtml(service)).append($('<hr/>'));
            });

            if (response.length === 0) {
                $filterServices.find('.results').append(
                    $('<em/>', {
                        'text': lang('no_records_found'),
                    }),
                );
            } else if (response.length === filterLimit) {
                $('<button/>', {
                    'type': 'button',
                    'class': 'btn btn-outline-secondary w-100 load-more text-center',
                    'text': lang('load_more'),
                    'click': () => {
                        filterLimit += 20;
                        App.Pages.Services.filter(keyword, selectId, show);
                    },
                }).appendTo('#filter-services .results');
            }

            if (selectId) {
                App.Pages.Services.select(selectId, show);
            }
        });
    }

    /**
     * Get Filter HTML
     *
     * Get a service row HTML code that is going to be displayed on the filter results list.
     *
     * @param {Object} service Contains the service record data.
     *
     * @return {String} The HTML code that represents the record on the filter results list.
     */
    function getFilterHtml(service) {
        const name = service.name;

        const info = service.duration + ' min - ' + service.price + ' ' + service.currency;

        return $('<div/>', {
            'class': 'service-row entry',
            'data-id': service.id,
            'html': [
                $('<strong/>', {
                    'text': name,
                }),
                $('<br/>'),
                $('<small/>', {
                    'class': 'text-muted',
                    'text': info,
                }),
                $('<br/>'),
            ],
        });
    }

    /**
     * Select a specific record from the current filter results. If the service id does not exist
     * in the list then no record will be selected.
     *
     * @param {Number} id The record id to be selected from the filter results.
     * @param {Boolean} show Optional (false), if true then the method will display the record on the form.
     */
    function select(id, show = false) {
        $filterServices.find('.selected').removeClass('selected');

        $filterServices.find('.service-row[data-id="' + id + '"]').addClass('selected');

        if (show) {
            const service = filterResults.find((filterResult) => Number(filterResult.id) === Number(id));

            App.Pages.Services.display(service);

            $('#edit-service, #delete-service').prop('disabled', false);
        }
    }

    /**
     * Update the service-category list box.
     *
     * Use this method every time a change is made to the service categories db table.
     */
    function updateAvailableServiceCategories() {
        App.Http.ServiceCategories.search('', 999).then((response) => {
            $serviceCategoryId.empty();

            $serviceCategoryId.append(new Option('', '')).val('');

            response.forEach((serviceCategory) => {
                $serviceCategoryId.append(new Option(serviceCategory.name, serviceCategory.id));
            });
        });
    }

    /**
     * Initialize the module.
     */
    /**
     * Render the date restrictions table.
     */
    function renderDateRestrictions() {
        $dateRestrictionsTable.empty();

        if (!dateRestrictions.length) {
            $dateRestrictionsTable.append(
                $('<tr/>').append(
                    $('<td/>', {
                        'colspan': 3,
                        'class': 'text-muted text-center',
                        'text': lang('no_date_restrictions'),
                    }),
                ),
            );
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        dateRestrictions.forEach(function (restriction, index) {
            const $row = $('<tr/>');

            // Check if this range is expired (end date is before today)
            // Parse end date as local time to avoid UTC timezone offset issues
            let isExpired = false;
            if (restriction.end) {
                const endParts = restriction.end.split('-');
                const endDate = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));
                isExpired = endDate < today;
            }

            if (isExpired) {
                $row.addClass('date-restriction-expired');
            }

            // Start date
            const $startTd = $('<td/>');
            const $startInput = $('<input/>', {
                'type': 'date',
                'class': 'form-control form-control-sm date-restriction-start' + (isExpired ? ' text-muted' : ''),
                'value': restriction.start || '',
            });
            $startTd.append($startInput);
            $row.append($startTd);

            // End date
            const $endTd = $('<td/>');
            const $endInput = $('<input/>', {
                'type': 'date',
                'class': 'form-control form-control-sm date-restriction-end' + (isExpired ? ' text-muted' : ''),
                'value': restriction.end || '',
            });
            $endTd.append($endInput);
            $row.append($endTd);

            // Expired badge + Actions
            const $actionsTd = $('<td/>');

            if (isExpired) {
                const $expiredBadge = $('<span/>', {
                    'class': 'badge bg-secondary me-2',
                    'text': lang('expired'),
                });
                $actionsTd.append($expiredBadge);
            }

            const $deleteBtn = $('<button/>', {
                'type': 'button',
                'class': 'btn btn-outline-danger btn-sm delete-date-restriction',
                'html': $('<i/>', {'class': 'fas fa-trash-alt'}),
            });
            $actionsTd.append($deleteBtn);
            $row.append($actionsTd);

            $dateRestrictionsTable.append($row);
        });
    }

    function initialize() {
        App.Pages.Services.resetForm();
        App.Pages.Services.filter('');
        App.Pages.Services.addEventListeners();
        updateAvailableServiceCategories();
    }

    document.addEventListener('DOMContentLoaded', initialize);

    return {
        filter,
        save,
        remove,
        validate,
        getFilterHtml,
        resetForm,
        display,
        select,
        addEventListeners,
    };
})();
