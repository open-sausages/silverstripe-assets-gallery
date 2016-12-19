<?php

namespace SilverStripe\AssetAdmin\Tests\Forms;

use SilverStripe\AssetAdmin\Controller\AssetAdmin;
use SilverStripe\Assets\File;
use SilverStripe\AssetAdmin\Forms\UploadField;
use SilverStripe\Assets\Image;
use SilverStripe\Assets\Tests\Storage\AssetStoreTest\TestAssetStore;
use SilverStripe\Control\Controller;
use SilverStripe\Dev\Debug;
use SilverStripe\Dev\SapphireTest;
use SilverStripe\Forms\FieldList;
use SilverStripe\Forms\Form;
use SilverStripe\ORM\ArrayList;

class UploadFieldTest extends SapphireTest
{
    protected static $fixture_file = 'FileFormBuilderTest.yml';

    public function setUp()
    {
        parent::setUp();

        // Set backend and base url
        TestAssetStore::activate('FileFormBuilderTest');

        /** @var File $testfile */
        $testfile = $this->objFromFixture(File::class, 'file1');
        $testfile->setFromLocalFile(__DIR__ . '/fixtures/testfile.txt', 'files/testfile.txt');
        $testfile->write();

        /** @var Image $testimage */
        $testimage = $this->objFromFixture(Image::class, 'image1');
        $testimage->setFromLocalFile(__DIR__ . '/fixtures/testimage.png', 'files/testimage.png');
    }

    public function tearDown()
    {
        TestAssetStore::reset();
        parent::tearDown();
    }

    public function testGetAttributes()
    {
        $field = UploadField::create('MyField');
        $field->addExtraClass('myfield');
        $field->setIsMultiUpload(false);
        $field->setFolderName('/');
        /** @var Image $image */
        $image = $this->objFromFixture(Image::class, 'image1');
        $field->setItems(new ArrayList([$image]));
        Form::create(new Controller(), 'MyForm', FieldList::create($field), FieldList::create());
        $admin = new AssetAdmin();

        $attributes = $field->getAttributes();
        $schema = [
            'name' => 'MyField',
            'id' => 'Form_MyForm_MyField',
            'type' => 'Custom',
            'component' => 'UploadField',
            'holderId' => 'Form_MyForm_MyField_Holder',
            'title' => 'My Field',
            'source' => null,
            'extraClass' => 'entwine-uploadfield uploadfield myfield',
            'description' => null,
            'rightTitle' => null,
            'leftTitle' => null,
            'readOnly' => false,
            'disabled' => false,
            'customValidationMessage' => '',
            'validation' => [],
            'attributes' => [],
            'data' => [
                'createFileEndpoint' => [
                    'url' => 'admin/assets/api/createFile',
                    'method' => 'post',
                    'payloadFormat' => 'urlencoded',
                ],
                'multi' => false,
                'parentid' => 0,
            ],
        ];
        $state = [
            'name' => 'MyField',
            'id' => 'Form_MyForm_MyField',
            'value' => [ 'Files' => [$image->ID] ],
            'message' => null,
            'data' => [
                'files' => [ $admin->getObjectFromData($image) ],
            ],
        ];
        $this->assertArraySubset(
            [
                'class' => 'entwine-uploadfield uploadfield myfield',
                'type' => 'file',
                'multiple' => false,
                'id' => 'Form_MyForm_MyField'
            ],
            $attributes
        );

        // Check schema / state are encoded in this field
        $this->assertEquals($schema, json_decode($attributes['data-schema'], true));
        $this->assertEquals($state, json_decode($attributes['data-state'], true));
    }
}
