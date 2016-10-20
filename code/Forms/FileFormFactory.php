<?php

namespace SilverStripe\AssetAdmin\Forms;

use SilverStripe\Assets\File;
use SilverStripe\Control\Controller;
use SilverStripe\Core\Convert;
use SilverStripe\Forms\DatetimeField;
use SilverStripe\Forms\FieldList;
use SilverStripe\Forms\FormAction;
use SilverStripe\Forms\HTMLReadonlyField;
use SilverStripe\Forms\LiteralField;
use SilverStripe\Forms\PopoverField;
use SilverStripe\Forms\ReadonlyField;
use SilverStripe\Forms\Tab;
use SilverStripe\Forms\TabSet;
use SilverStripe\Forms\TextField;

class FileFormFactory extends AssetFormFactory
{

    /**
     * Get markdown for clickable link
     *
     * @param File $record
     * @return string HTML markdown for link
     */
    protected function getClickableLinkMarkdown($record)
    {
        if (!$record || !$record->isInDB()) {
            return null;
        }
        $link = $record->Link();
        $clickableLink = sprintf(
            '<i class="%1$s"></i><a href="%2$s" target="_blank">%2$s</a>',
            'font-icon-link btn--icon-large form-control-static__icon',
            Convert::raw2xml($link)
        );
        return $clickableLink;
    }

    protected function getFormFieldTabs($record)
    {
        // Add extra tab
        $tabs = TabSet::create(
            'Editor',
            $this->getFormFieldDetailsTab($record),
            $this->getFormFieldUsageTab($record)
        );
        return $tabs;
    }

    /**
     * Build "Usage" tab
     *
     * @param File $record
     * @return Tab
     */
    protected function getFormFieldUsageTab($record)
    {
        // Add new tab for usage
        return Tab::create(
            'Usage',
            DatetimeField::create("Created", _t('AssetTableField.CREATED', 'First uploaded'))
                ->setReadonly(true),
            DatetimeField::create("LastEdited", _t('AssetTableField.LASTEDIT', 'Last changed'))
                ->setReadonly(true)
        );
    }

    protected function getFormFieldDetailsTab($record)
    {
        // Update details tab
        return Tab::create(
            'Details',
            TextField::create("Title", File::singleton()->fieldLabel('Title')),
            TextField::create('Name', File::singleton()->fieldLabel('Filename')),
            ReadonlyField::create("Path", _t('AssetTableField.PATH', 'Path'), $this->getPath($record)),
            HTMLReadonlyField::create(
                'ClickableURL',
                _t('AssetTableField.URL', 'URL'),
                $this->getClickableLinkMarkdown($record)
            )
        );
    }

    protected function getFormFields(Controller $controller, $name, $context = [])
    {
        $record = $context['Record'];

        // Add status flag before extensions are triggered
        $this->beforeExtending('updateFormFields', function (FieldList $fields) use ($record) {
            $fields->insertAfter(
                'TitleHeader',
                LiteralField::create('FileSpecs', $this->getSpecsMarkup($record))
            );
        });

        return parent::getFormFields($controller, $name, $context);
    }

    /**
     * Get publish action
     *
     * @param File $record
     * @return FormAction
     */
    protected function getPublishAction($record)
    {
        if (!$record || !$record->canPublish()) {
            return null;
        }

        // Build action
        $publishText = _t('SilverStripe\\AssetAdmin\\Controller\\AssetAdmin.PUBLISH_BUTTON', 'Publish');
        return FormAction::create('publish', $publishText)
            ->setIcon('rocket')
            ->setSchemaData(['data' => ['buttonStyle' => 'primary']]);
    }

    protected function getFormActions(Controller $controller, $name, $context = [])
    {
        $record = $context['Record'];

        // Build top level bar
        $actions = new FieldList(array_filter([
            $this->getSaveAction($record),
            $this->getPublishAction($record),
            $this->getPopoverMenu($record)
        ]));

        // Update
        $this->invokeWithExtensions('updateFormActions', $actions, $controller, $name, $context);
        return $actions;
    }

    /**
     * get HTML for status icon
     *
     * @param File $record
     * @return null|string
     */
    protected function getSpecsMarkup($record)
    {
        if (!$record || !$record->exists()) {
            return null;
        }
        return sprintf(
            '<div class="editor__specs">%s %s</div>',
            $record->getSize(),
            $this->getStatusFlagMarkup($record)
        );
    }

    /**
     * Get published status flag
     *
     * @param File $record
     * @return null|string
     */
    protected function getStatusFlagMarkup($record)
    {
        if ($record && ($statusTitle = $record->getStatusTitle())) {
            return "<span class=\"editor__status-flag\">{$statusTitle}</span>";
        }
        return null;
    }

    /**
     * Get user-visible "Path" for this record
     *
     * @param File $record
     * @return string
     */
    protected function getPath($record)
    {
        if ($record && $record->isInDB()) {
            if ($record->ParentID) {
                return $record->Parent()->getFilename();
            } else {
                return '/';
            }
        }
        return null;
    }

    /**
     * Get action for adding to campaign
     *
     * @param File $record
     * @return FormAction|null
     */
    protected function getAddToCampaignAction($record)
    {
        if ($record && $record->canPublish()) {
            return FormAction::create(
                'addtocampaign',
                _t('SilverStripe\\AssetAdmin\\Controller\\AssetAdmin.ADDTOCAMPAIGN', 'Add to campaign')
            );
        }
        return null;
    }

    /**
     * Get action for publishing
     *
     * @param File $record
     * @return FormAction
     */
    protected function getUnpublishAction($record)
    {
        // Check if record is unpublishable
        if (!$record || !$record->isPublished() || !$record->canUnpublish()) {
            return null;
        }

        // Build action
        $unpublishText = _t(
            'SilverStripe\\AssetAdmin\\Controller\\AssetAdmin.UNPUBLISH_BUTTON',
            'Unpublish'
        );
        return FormAction::create('unpublish', $unpublishText)
            ->setIcon('cancel-circled');
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
        $popoverActions = array_filter([
            $this->getAddToCampaignAction($record),
            $this->getUnpublishAction($record),
            $this->getDeleteAction($record)
        ]);
        if ($popoverActions) {
            return PopoverField::create($popoverActions)
                ->setPlacement('top');
        }
        return null;
    }
}
