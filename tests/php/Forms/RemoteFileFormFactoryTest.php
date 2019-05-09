<?php

namespace SilverStripe\AssetAdmin\Tests\Forms;

use Embed\Exceptions\InvalidUrlException;
use SilverStripe\AssetAdmin\Forms\RemoteFileFormFactory;
use SilverStripe\AssetAdmin\Tests\Forms\RemoteFileFormFactoryTest\MockEmbed;
use SilverStripe\Core\Injector\Injector;
use SilverStripe\Dev\SapphireTest;
use SilverStripe\Forms\Form;
use SilverStripe\View\Embed\Embeddable;

class RemoteFileFormFactoryTest extends SapphireTest
{

    protected function setUp()
    {
        parent::setUp();

        // Reset all configs
        RemoteFileFormFactory::config()->set('fileurl_scheme_whitelist', []);
        RemoteFileFormFactory::config()->set('fileurl_scheme_blacklist', []);
        RemoteFileFormFactory::config()->set('fileurl_port_whitelist', []);
        RemoteFileFormFactory::config()->set('fileurl_port_blacklist', []);
        RemoteFileFormFactory::config()->set('fileurl_domain_whitelist', []);
        RemoteFileFormFactory::config()->set('fileurl_domain_blacklist', []);

        // mock embed
        Injector::inst()->load([
            Embeddable::class => [
                'class' => MockEmbed::class,
            ]
        ]);
    }

    public function providerTestAcceptedURLs()
    {
        return [
            [
                ['fileurl_scheme_blacklist' => ['https']],
                'http://www.google.com',
            ],
            [
                ['fileurl_scheme_whitelist' => ['http']],
                'http://www.google.com',
            ],
            [
                ['fileurl_domain_blacklist' => ['www.amazon.com']],
                'http://www.google.com',
            ],
            [
                ['fileurl_domain_whitelist' => ['www.google.com']],
                'http://www.google.com',
            ],
            [
                # port-ommitted urls ignored. Needs schema blacklist also
                ['fileurl_port_blacklist' => [80]],
                'http://www.google.com',
            ],
            [
                # port-ommitted urls ignored
                ['fileurl_port_whitelist' => [80]],
                'http://www.google.com',
            ],
            [
                ['fileurl_port_blacklist' => [443]],
                'http://www.google.com:80',
            ],
            [
                ['fileurl_port_whitelist' => [443]],
                'https://www.google.com:443',
            ],
        ];
    }

    /**
     * @dataProvider providerTestAcceptedURLs
     * @param array $config Config to merge
     * @param string $acceptedURL OK url
     */
    public function testAcceptedURLs($config, $acceptedURL)
    {
        foreach ($config as $key => $value) {
            RemoteFileFormFactory::config()->set($key, $value);
        }

        // Should pass
        $builder = new RemoteFileFormFactory();
        $fields = $builder->getForm(null, 'Form', [
            'type' => 'edit',
            'url' => $acceptedURL,
        ]);
        $this->assertInstanceOf(Form::class, $fields);
    }

    public function providerTestRejectedURLs()
    {
        return [
            [
                ['fileurl_scheme_blacklist' => ['https']],
                'https://www.google.com'
            ],
            [
                ['fileurl_scheme_whitelist' => ['http']],
                'https://www.google.com'
            ],
            [
                ['fileurl_domain_blacklist' => ['www.amazon.com']],
                'http://www.amazon.com'
            ],
            [
                ['fileurl_domain_whitelist' => ['www.google.com']],
                'http://www.amazon.com'
            ],
            [
                # ipv4 blacklist
                ['fileurl_domain_blacklist' => ['127.0.0.1']],
                'http://127.0.0.1/'
            ],
            [
                # ipv6 blacklist
                ['fileurl_domain_blacklist' => ['[0:0:0:0:0:0:0:1]']],
                'http://[0:0:0:0:0:0:0:1]/'
            ],
            [
                # ipv6 blacklist
                ['fileurl_domain_blacklist' => ['[::1]']],
                'http://[::1]/'
            ],
            [
                ['fileurl_port_blacklist' => [80]],
                'http://www.google.com:80'
            ],
            [
                # port-ommitted urls ignored
                ['fileurl_port_whitelist' => [80]],
                'http://www.google.com:443'
            ],
        ];
    }

    /**
     * @dataProvider providerTestRejectedURLs
     * @param array $config Config to merge
     * @param string $rejectedURL rejected url
     * @param string $rejectedMessage
     */
    public function testRejectedURLS($config, $rejectedURL)
    {
        $this->expectException(InvalidUrlException::class);

        // Set config
        foreach ($config as $key => $value) {
            RemoteFileFormFactory::config()->set($key, $value);
        }

        // Should throw error
        $builder = new RemoteFileFormFactory();
        $builder->getForm(null, 'Form', [
            'type' => 'edit',
            'url' => $rejectedURL,
        ]);
    }
}
