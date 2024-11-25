<?php

namespace SilverStripe\AssetAdmin\Extensions;

use Embed\Http\NetworkException;
use Embed\Http\RequestException;
use SilverStripe\Admin\ModalController;
use SilverStripe\AssetAdmin\Forms\RemoteFileFormFactory;
use SilverStripe\AssetAdmin\Exceptions\InvalidRemoteUrlException;
use SilverStripe\Control\HTTPRequest;
use SilverStripe\Control\HTTPResponse;
use SilverStripe\Core\Extension;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\Forms\FieldList;
use SilverStripe\Forms\Form;
use SilverStripe\Core\Validation\ValidationResult;

/**
 * Decorates ModalController with an insert-oembed modal
 *
 * @extends Extension<ModalController>
 */
class RemoteFileModalExtension extends Extension
{
    private static $allowed_actions = array(
        'remoteCreateForm',
        'remoteEditForm',
        'remoteEditFormSchema',
    );

    /**
     * Form for creating a new OEmbed object in the WYSIWYG, used by the InsertEmbedModal component
     *
     * @return Form
     */
    public function remoteCreateForm()
    {
        return Injector::inst()->get(RemoteFileFormFactory::class)
            ->getForm(
                $this->getOwner(),
                'remoteCreateForm',
                ['type' => 'create']
            );
    }

    /**
     * Form for editing a OEmbed object in the WYSIWYG, used by the InsertEmbedModal component
     *
     * @return Form
     */
    public function remoteEditForm()
    {
        $url = $this->getOwner()->getRequest()->requestVar('embedurl');
        $form = null;
        $form = Injector::inst()->get(RemoteFileFormFactory::class)
            ->getForm(
                $this->getOwner(),
                'remoteEditForm',
                ['type' => 'edit', 'url' => $url]
            );
        return $form;
    }

    /**
     * Capture the schema handling process, as there is validation done to the URL provided before form is generated
     *
     * @param HTTPRequest $request
     * @return HTTPResponse
     */
    public function remoteEditFormSchema(HTTPRequest $request)
    {
        $schemaID = $request->getURL();
        try {
            $form = $this->remoteEditForm();
            return $this->getOwner()->getSchemaResponse($schemaID, $form);
        } catch (NetworkException | RequestException | InvalidRemoteUrlException $exception) {
            $errors = ValidationResult::create()
                ->addError($exception->getMessage());
            $form = Form::create(null, 'Form', FieldList::create(), FieldList::create());
            $code = $exception->getCode();

            if ($code < 300) {
                $code = 500;
            }

            return $this
                ->getOwner()
                ->getSchemaResponse($schemaID, $form, $errors)
                ->setStatusCode($code);
        }
    }
}
