<?php

namespace SilverStripe\AssetAdmin\Forms;

use InvalidArgumentException;
use SilverStripe\Assets\File;
use SilverStripe\Control\RequestHandler;
use SilverStripe\Core\Config\Configurable;
use SilverStripe\Core\Extensible;
use SilverStripe\Core\Injector\Injectable;
use SilverStripe\Forms\FieldList;
use SilverStripe\Forms\Form;
use SilverStripe\Forms\FormAction;
use SilverStripe\Forms\FormFactory;
use SilverStripe\Forms\HeaderField;
use SilverStripe\Forms\HiddenField;
use SilverStripe\Forms\PopoverField;
use SilverStripe\Forms\RequiredFields;
use SilverStripe\Forms\Tab;
use SilverStripe\Forms\TabSet;
use SilverStripe\Forms\TextField;

abstract class AssetFormFactory implements FormFactory
{
    use Extensible;
    use Injectable;
    use Configurable;

    /**
     * Insert into HTML content area
     */
    const TYPE_INSERT = 'insert';

    /**
     * Select file by ID only
     */
    const TYPE_SELECT = 'select';

    /**
     * Edit form: Default
     */
    const TYPE_ADMIN = 'admin';

    public function __construct()
    {
        $this->constructExtensions();
    }

    /**
     * @param RequestHandler $controller
     * @param string $name
     * @param array $context
     * @return Form
     */
    public function getForm(RequestHandler $controller = null, $name = FormFactory::DEFAULT_NAME, $context = [])
    {
        // Validate context
        foreach ($this->getRequiredContext() as $required) {
            if (!isset($context[$required])) {
                throw new InvalidArgumentException("Missing required context $required");
            }
        }

        $fields = $this->getFormFields($controller, $name, $context);
        $actions = $this->getFormActions($controller, $name, $context);
        $validator = $this->getValidator($controller, $name, $context);
        $form = Form::create($controller, $name, $fields, $actions, $validator);

        // Extend form
        $this->invokeWithExtensions('updateForm', $form, $controller, $name, $context);

        // Populate form from record
        if (isset($context['Record'])) {
            $form->loadDataFrom($context['Record']);
        }

        $form->addExtraClass('form--fill-height form--padded');

        return $form;
    }

    /**
     * Get the validator for the form to be built
     *
     * @param RequestHandler $controller
     * @param $formName
     * @param $context
     * @return RequiredFields
     */
    protected function getValidator(RequestHandler $controller = null, $formName, $context = [])
    {
        $validator = new RequiredFields('Name');

        return $validator;
    }

    /**
     * Get form type from 'type' context
     *
     * @param array $context
     * @return string
     */
    protected function getFormType($context)
    {
        return empty($context['Type']) ? static::TYPE_ADMIN : $context['Type'];
    }

    /**
     * Gets the main tabs for the file edit form
     *
     * @param File $record
     * @param array $context
     * @return TabSet
     */
    protected function getFormFieldTabs($record, $context = [])
    {
        $tabs = TabSet::create('Editor', $this->getFormFieldDetailsTab($record));

        return $tabs;
    }

    /**
     * @param File $record
     * @return FormAction
     */
    protected function getSaveAction($record)
    {
        if ($record && $record->isInDB() && $record->canEdit()) {
            return FormAction::create('save', _t('SilverStripe\\CMS\\Controllers\\CMSMain.SAVE', 'Save'))
                ->setIcon('save');
        }
        return null;
    }

    /**
     * Get delete action, if this record is deletable
     *
     * @param File $record
     * @return FormAction
     */
    protected function getDeleteAction($record)
    {
        // Delete action
        if ($record && $record->isInDB() && $record->canDelete()) {
            $deleteText = _t('SilverStripe\\AssetAdmin\\Controller\\AssetAdmin.DELETE_BUTTON', 'Delete');
            return FormAction::create('delete', $deleteText)
                ->setIcon('trash-bin');
        }
        return null;
    }

    /**
     * @param RequestHandler $controller
     * @param $formName
     * @param array $context
     * @return FieldList
     */
    protected function getFormActions(RequestHandler $controller = null, $formName, $context = [])
    {
        $record = isset($context['Record']) ? $context['Record'] : null;

        $actions = new FieldList();
        if ($saveAction = $this->getSaveAction($record)) {
            $actions->push($saveAction);
        }
        $menu = $this->getPopoverMenu($record);
        if ($menu && $menu->FieldList()->count()) {
            $actions->push($menu);
        }

        $this->invokeWithExtensions('updateFormActions', $actions, $controller, $formName, $context);
        return $actions;
    }

    /**
     * Get fields for this form
     *
     * @param RequestHandler $controller
     * @param string $formName
     * @param array $context
     * @return FieldList
     */
    protected function getFormFields(RequestHandler $controller = null, $formName, $context = [])
    {
        $record = isset($context['Record']) ? $context['Record'] : null;

        // Build standard fields for all folders / files
        /** @var File $record */
        $fields = new FieldList(
            HeaderField::create('TitleHeader', $record ? $record->Title : null, 1)
                ->addExtraClass('editor__heading'),
            $this->getFormFieldTabs($record, $context)
        );
        if ($record) {
            $fields->push(HiddenField::create('ID', $record->ID));
            $fields->insertAfter(
                'TitleHeader',
                PreviewImageField::create('PreviewImage')
                    ->setRecordID($record->ID)
                    ->addExtraClass('editor__file-preview')
            );
        }

        $this->invokeWithExtensions('updateFormFields', $fields, $controller, $formName, $context);
        return $fields;
    }

    /**
     * Build popup menu
     *
     * @param File $record
     * @return PopoverField
     */
    protected function getPopoverMenu($record)
    {
        // Build popover actions
        $popoverActions = $this->getPopoverActions($record);
        if ($popoverActions) {
            return PopoverField::create($popoverActions)
                ->setPlacement('top')
                ->setName('PopoverActions')
                ->setButtonTooltip(_t(
                    'SilverStripe\\AssetAdmin\\Forms\\FileFormFactory.OTHER_ACTIONS',
                    'Other actions'
                ));
        }
        return null;
    }

    /**
     * Get actions that go into the Popover menu
     *
     * @param File $record
     * @return array
     */
    protected function getPopoverActions($record)
    {
        $actions = [
            $this->getDeleteAction($record)
        ];

        $this->invokeWithExtensions('updatePopoverActions', $actions, $record);
        return array_filter($actions);
    }

    /**
     * Build "details" formfield tab
     *
     * @param File $record
     * @param array $context
     * @return Tab
     */
    protected function getFormFieldDetailsTab($record, $context = [])
    {
        return Tab::create(
            'Details',
            TextField::create('Name', File::singleton()->fieldLabel('Filename'))
        );
    }

    public function getRequiredContext()
    {
        return ['Record'];
    }
}
