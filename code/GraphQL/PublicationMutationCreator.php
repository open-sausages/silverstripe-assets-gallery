<?php

namespace SilverStripe\AssetAdmin\GraphQL;

use Psr\Log\LogLevel;
use SilverStripe\Assets\File;
use SilverStripe\Versioned\Versioned;
use SilverStripe\GraphQL\MutationCreator;
use SilverStripe\GraphQL\OperationResolver;
use GraphQL\Type\Definition\ResolveInfo;
use GraphQL\Type\Definition\Type;
use SilverStripe\Security\Member;
use InvalidArgumentException;

abstract class PublicationMutationCreator extends MutationCreator implements OperationResolver
{
    /**
     * @var string The name of the mutation
     */
    protected $name;

    /**
     * @var string The description of the mutation
     */
    protected $description;

    /**
     * @return array
     */
    public function attributes()
    {
        return [
            'name '=> $this->name,
            'description' => $this->description,
        ];
    }

    /**
     * @return Type
     */
    public function type()
    {
        return Type::listOf($this->manager->getType('PublicationResult'));
    }

    /**
     * @return array
     */
    public function args()
    {
        return [
            'IDs' => [
                'type' => Type::nonNull(Type::listOf(Type::id())),
            ],
            'Force' => [
                'type' => Type::boolean(),
                'description' => 'If true, disregard warnings',
            ],
        ];
    }

    /**
     * @param mixed $object
     * @param array $args
     * @param mixed $context
     * @param ResolveInfo $info
     * @return array
     */
    public function resolve($object, array $args, $context, ResolveInfo $info)
    {
        if (!isset($args['IDs']) || !is_array($args['IDs'])) {
            throw new InvalidArgumentException('IDs must be an array');
        }

        $result = [];
        $idList = $args['IDs'];
        $files = Versioned::get_by_stage(File::class, $this->sourceStage())
            ->byIds($idList);

        if ($files->count() < count($idList)) {
            // Find out which files count not be found
            $missingIds = array_diff($idList, $files->column('ID'));
            foreach($missingIds as $id) {
                $result[] = new OperationError(
                    _t(
                        __CLASS__ . 'NON_EXISTENT_FILE',
                        'File #{id} either does not exist or is not on stage {stage}.',
                        [
                            'id' => $id,
                            'stage' => $this->sourceStage()
                        ]
                    ),
                    'NON_EXISTENT',
                    LogLevel::ERROR,
                    [$id]
                );
            }
        }

        foreach ($files as $file) {
            if ($this->hasPermission($file, $context['currentUser'])) {
                $result[] = $this->mutateFile($file, $args);
            } else {
                $result[] = new OperationError(
                    _t(
                        __CLASS__ . 'PERMISSION_FAILURE',
                        'User does not have permission to perform this operation on file "{file}"',
                        [
                            'file' => $file->Title
                        ]
                    ),
                    'NOT_ALLOWED',
                    LogLevel::WARNING,
                    [$file->ID]
                );
            }
        }

        return $result;
    }

    /**
     * The stage that the file should be fetched from before mutation
     *
     * @return string
     */
    abstract protected function sourceStage();

    /**
     * Apply the mutation
     *
     * @param File $file
     * @param array $args
     * @return File|OperationError
     */
    abstract protected function mutateFile(File $file, $args = []);

    /**
     * Return true if the member has permission to do the mutation
     *
     * @param File $file
     * @param Member $member
     * @return boolean
     */
    abstract protected function hasPermission(File $file, Member $member);
}
