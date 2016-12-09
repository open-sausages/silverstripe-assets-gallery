<?php

namespace SilverStripe\AssetAdmin\Tests\Behat\Context;

use Behat\Mink\Element\DocumentElement;
use Behat\Mink\Element\NodeElement;
use SilverStripe\BehatExtension\Context\FixtureContext as BaseFixtureContext;

/**
 * Context used to create fixtures in the SilverStripe ORM.
 */
class FixtureContext extends BaseFixtureContext
{

    /**
     * Select a gallery item by type and name
     *
     * @Given /^I (?:(?:click on)|(?:select)) the "([^"]+)" named "([^"]+)" in the gallery$/
     * @param string $type
     * @param string $name
     */
    public function stepISelectGalleryItem($type, $name)
    {
        $item = $this->getGalleryItem($type, $name);
        assertNotNull($item, ucfirst($type) . " named $name could not be found");
        $item->click();
    }

    /**
     * Check the checkbox for a given gallery item
     * @Given /^I check the "([^"]+)" named "([^"]+)" in the gallery$/
     * @param string $type
     * @param string $name
     */
    public function stepICheckTheGalleryItem($type, $name)
    {
        $item = $this->getGalleryItem($type, $name);
        assertNotNull($item, ucfirst($type) . " named $name could not be found");
        $checkbox = $item->find('css', 'input[type="checkbox"]');
        assertNotNull($checkbox, "Could not find checkbox for file named {$name}");
        $checkbox->check();
    }

    /**
     * @Then /^I should see the "([^"]+)" named "([^"]+)" in the gallery$/
     * @param $type
     * @param $name
     */
    public function iShouldSeeTheGalleryItem($type, $name)
    {
        $item = $this->getGalleryItem($type, $name);
        assertNotNull($item, ucfirst($type) . " named {$name} could not be found");
    }

    /**
     * @Then /^I should not see the "([^"]+)" named "([^"]+)" in the gallery$/
     * @param $type
     * @param $name
     */
    public function iShouldNotSeeTheGalleryItem($type, $name)
    {
        $item = $this->getGalleryItem($type, $name, 0);
        assertNull($item, ucfirst($type) . " named {$name} was found when it should not be visible");
    }

    /**
     * @Then /^I should see the "([^"]*)" form$/
     * @param string $id HTML ID of form
     */
    public function iShouldSeeTheForm($id)
    {
        /** @var DocumentElement $page */
        $page = $this->getSession()->getPage();
        $form = $this->retry(function () use ($page, $id) {
            return $page->find('css', "form#{$id}");
        });
        assertNotNull($form, "form with id $id could not be found");
        assertTrue($form->isVisible(), "form with id $id is not visible");
    }

    /**
     * @Given /^I click on the latest history item$/
     */
    public function iClickOnTheLatestHistoryItem()
    {
        $this->getSession()->wait(
            5000,
            "window.jQuery && window.jQuery('.file-history__list li').size() > 0"
        );

        $page = $this->getSession()->getPage();

        $elements = $page->find('css', '.file-history__list li');

        if (null === $elements) {
            throw new \InvalidArgumentException(sprintf('Could not find list item'));
        }

        $elements->click();
    }

    /**
     * @Given /^I attach the file "([^"]*)" to dropzone$/
     * @see MinkContext::attachFileToField()
     */
    public function iAttachTheFileToDropzone($path)
    {
        // Get path
        $filesPath = $this->getMainContext()->getMinkParameter('files_path');
        if ($filesPath) {
            $fullPath = rtrim(realpath($filesPath), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$path;
            if (is_file($fullPath)) {
                $path = $fullPath;
            }
        }

        // Find field
        $input = $this->getSession()->getPage()->find('css', 'input[type="file"].dz-hidden-input');
        assertNotNull($input, "Could not find dz-hidden-input");

        // Make visible temporarily while attaching
        $this->getSession()->executeScript(
            <<<EOS
window.jQuery('.dz-hidden-input')
    .css('visibility', 'visible')
    .width(1)
    .height(1);
EOS
        );

        // Attach via html5
        $input->attachFile($path);

        // Restore hidden state
        $this->getSession()->executeScript(
            <<<EOS
window.jQuery('.dz-hidden-input')
    .css('visibility', 'hidden')
    .width(0)
    .height(0);
EOS
        );
    }

    /**
     * Helper for finding items in the visible gallery view
     *
     * @param string $type type. E.g. 'folder', 'image'
     * @param string $name Title of item
     * @param int $timeout
     * @return NodeElement
     */
    protected function getGalleryItem($type, $name, $timeout = 3)
    {
        /** @var DocumentElement $page */
        $page = $this->getSession()->getPage();
        return $this->retry(function () use ($page, $type, $name) {
            return $page->find(
                'xpath',
                "//div[contains(@class, 'gallery-item--{$type}')]//div[contains(text(), '{$name}')]"
            );
        }, $timeout);
    }

    /**
     * Invoke $try callback for a non-empty result with a given timeout
     *
     * @param callable $try
     * @param int $timeout Number of seconds to retry for
     * @return mixed Result of invoking $try, or null if timed out
     */
    protected function retry($try, $timeout = 3)
    {
        do {
            $result = $try();
            if ($result) {
                return $result;
            }
            sleep(1);
        } while (--$timeout >= 0);
        return null;
    }
}
