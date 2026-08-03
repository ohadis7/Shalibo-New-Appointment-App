<?php defined('BASEPATH') or exit('No direct script access allowed');

/* ----------------------------------------------------------------------------
 * Shalibo Wellness — MongoDB Connector for Easy!Appointments
 *
 * Provides a direct MongoDB connection for checking email-to-provider mappings.
 * Allows multiple EA providers to use the same email address by storing the
 * mapping in MongoDB and resolving duplicates at validation time.
 *
 * Usage (in Providers_model):
 *   $this->load->library('mongodb_client');
 *   if ($this->mongodb_client->is_email_mapped($email)) {
 *       // Allow duplicate — it's a known merge scenario
 *   }
 * ---------------------------------------------------------------------------- */

/**
 * MongoDB client library.
 *
 * @package Libraries
 */
class Mongodb_client
{
    /**
     * @var MongoDB\Client|null
     */
    protected $client = null;

    /**
     * @var MongoDB\Collection|null
     */
    protected $collection = null;

    /**
     * @var string
     */
    protected string $connection_uri = '';

    /**
     * @var string
     */
    protected string $database_name = '';

    /**
     * @var string
     */
    protected string $collection_name = 'ea_provider_email_mappings';

    /**
     * Mongodb_client constructor.
     */
    public function __construct()
    {
        // Load connection details from Config (set in config-sample.php)
        // Use ReflectionClass to check for class constants (defined() only works for global constants)
        try {
            $reflector = new ReflectionClass('Config');
            $this->connection_uri = $reflector->hasConstant('MONGODB_URI') && !empty(Config::MONGODB_URI)
                ? Config::MONGODB_URI
                : '';

            $this->database_name = $reflector->hasConstant('MONGODB_DATABASE') && !empty(Config::MONGODB_DATABASE)
                ? Config::MONGODB_DATABASE
                : 'heroku_zcsmsvgj';
        } catch (Throwable $e) {
            // Config class not available, use defaults
            $this->connection_uri = '';
            $this->database_name = 'heroku_zcsmsvgj';
        }
    }

    /**
     * Initialize the MongoDB connection (lazy-loaded).
     *
     * @throws RuntimeException If MongoDB extension is not installed or connection fails
     */
    protected function ensure_connection(): void
    {
        if ($this->client !== null) {
            return;
        }

        if (!class_exists('\\MongoDB\\Client')) {
            throw new RuntimeException(
                'MongoDB PHP library is not installed. Run: composer require mongodb/mongodb'
            );
        }

        if (empty($this->connection_uri)) {
            // Connector is not configured — silently skip MongoDB checks
            return;
        }

        try {
            $this->client = new MongoDB\Client($this->connection_uri, [
                'serverSelectionTimeoutMS' => 3000, // 3 second timeout
            ]);

            $this->collection = $this->client
                ->selectDatabase($this->database_name)
                ->selectCollection($this->collection_name);
        } catch (Throwable $e) {
            log_message('error', 'MongoDB connection failed: ' . $e->getMessage());
            throw new RuntimeException('Could not connect to MongoDB for provider email resolution.');
        }
    }

    /**
     * Check if an email is already mapped to one or more EA providers in MongoDB.
     *
     * @param string $email The email to check.
     * @return bool True if the email exists in the mapping.
     */
    public function is_email_mapped(string $email): bool
    {
        try {
            $this->ensure_connection();
        } catch (RuntimeException $e) {
            // If MongoDB is not configured/available, fall back to default EA behavior
            log_message('info', 'MongoDB not available, falling back to default EA email uniqueness: ' . $e->getMessage());
            return false;
        }

        if ($this->collection === null) {
            return false;
        }

        try {
            $normalized = strtolower(trim($email));
            $count = $this->collection->countDocuments(['email' => $normalized]);
            return $count > 0;
        } catch (Throwable $e) {
            log_message('error', 'MongoDB query failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get all EA provider IDs mapped to an email.
     *
     * @param string $email The email to look up.
     * @return array Array of EA provider IDs (integers).
     */
    public function get_mapped_provider_ids(string $email): array
    {
        try {
            $this->ensure_connection();
        } catch (RuntimeException $e) {
            return [];
        }

        if ($this->collection === null) {
            return [];
        }

        try {
            $normalized = strtolower(trim($email));
            $doc = $this->collection->findOne(['email' => $normalized]);

            if ($doc === null) {
                return [];
            }

            $ids = $doc['eaProviderIds'] ?? [];

            if (!empty($doc['mappings'])) {
                $ids = [];
                foreach ($doc['mappings'] as $mapping) {
                    if (isset($mapping['eaProviderId'])) {
                        $ids[] = (int) $mapping['eaProviderId'];
                    }
                }
            }

            return $ids;
        } catch (Throwable $e) {
            log_message('error', 'MongoDB query failed: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Add or update an email-to-provider mapping in MongoDB.
     *
     * @param string $email The email address.
     * @param int $ea_provider_id The EA provider ID.
     * @param string $provider_name The provider display name.
     * @return bool True on success.
     */
    public function add_mapping(string $email, int $ea_provider_id, string $provider_name = ''): bool
    {
        try {
            $this->ensure_connection();
        } catch (RuntimeException $e) {
            return false;
        }

        if ($this->collection === null) {
            return false;
        }

        try {
            $normalized = strtolower(trim($email));

            $this->collection->updateOne(
                ['email' => $normalized],
                [
                    '$addToSet' => [
                        'eaProviderIds' => $ea_provider_id,
                    ],
                    '$push' => [
                        'mappings' => [
                            'eaProviderId' => $ea_provider_id,
                            'eaProviderName' => $provider_name,
                            'lastSyncedAt' => new MongoDB\Model\UTCDateTime(time() * 1000),
                        ],
                    ],
                    '$set' => [
                        'lastSyncedAt' => new MongoDB\Model\UTCDateTime(time() * 1000),
                    ],
                ],
                ['upsert' => true]
            );

            return true;
        } catch (Throwable $e) {
            log_message('error', 'MongoDB insert failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Remove an EA provider ID from an email mapping.
     *
     * @param string $email The email address.
     * @param int $ea_provider_id The EA provider ID to remove.
     * @return bool True on success.
     */
    public function remove_mapping(string $email, int $ea_provider_id): bool
    {
        try {
            $this->ensure_connection();
        } catch (RuntimeException $e) {
            return false;
        }

        if ($this->collection === null) {
            return false;
        }

        try {
            $normalized = strtolower(trim($email));

            $this->collection->updateOne(
                ['email' => $normalized],
                [
                    '$pull' => [
                        'eaProviderIds' => $ea_provider_id,
                        'mappings' => ['eaProviderId' => $ea_provider_id],
                    ],
                ]
            );

            return true;
        } catch (Throwable $e) {
            log_message('error', 'MongoDB remove failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if the MongoDB connector is properly configured and connected.
     *
     * @return bool True if configured and connected.
     */
    public function is_configured(): bool
    {
        return !empty($this->connection_uri) && class_exists('\\MongoDB\\Client');
    }
}
