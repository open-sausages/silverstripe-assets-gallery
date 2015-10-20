<?php

namespace SilverStripe\Forms;

use Controller;
use File;
use Folder;
use FormField;
use Member;
use Requirements;
use SS_HTTPRequest;
use SS_HTTPResponse;
use SS_List;

class AssetGalleryField extends FormField {

	/**
	 * @var SS_List
	 */
	protected $source = null;

	/**
	 * Create a new AssetGalleryField
	 *
	 * @param string $name The internal field name, passed to forms.
	 * @param null|string $title The human-readable field label.
	 * @param SS_List $source Data source
	 */
	public function __construct($name, $title = null, SS_List $source = null) {
		parent::__construct($name, $title);
		if($source) {
			$this->setSource($source);
		}
	}

	/**
	 * Get datasource for this list.
	 *
	 * @return SS_List
	 */
	public function getSource() {
		return $this->source ?: File::get();
	}

	/**
	 * Assign a new datasource
	 *
	 * @param SS_List $source
	 */
	public function setSource(SS_List $source) {
		$this->source = $source;
	}

	/**
	 * @var array
	 */
	private static $allowed_actions = array(
		'search',
		'update',
		'delete',
	);

	/**
	 * @config
	 *
	 * @var string
	 */
	private static $defaultPath = 'Uploads';

	/**
	 * @var string
	 */
	protected $currentPath;

	/**
	 * @var int
	 */
	protected $limit = 10;

	/**
	 * @return $this
	 */
	public function performReadonlyTransformation() {
		return $this;
	}

	/**
	 * @return string
	 */
	public function Type() {
		return 'asset-gallery';
	}

	/**
	 * @param SS_HTTPRequest $request
	 *
	 * @return SS_HTTPResponse
	 */
	public function search(SS_HTTPRequest $request) {
		$filters = array();

		if ($folder = $request->getVar('folder')) {
			$filters['folder'] = $folder;
		}

		$filters['page'] = 1;
		$filters['limit'] = 10;

		if ($page = $request->getVar('page')) {
			$filters['page'] = $page;
		}

		if ($limit = $request->getVar('limit')) {
			$filters['limit'] = $limit;
		}

		$data = $this->getData($filters);

		$response = new SS_HTTPResponse();
		$response->addHeader('Content-Type', 'application/json');
		$response->setBody(json_encode(array(
			'files' => $data['items'],
			'count' => $data['count'],
		)));

		return $response;
	}

	/**
	 * @param SS_HTTPRequest $request
	 *
	 * @return SS_HTTPResponse
	 */
	public function update(SS_HTTPRequest $request) {
		$id = $request->getVar('id');
		$file = File::get()->filter('id', (int) $id)->first();

		$code = 500;

		$body = array(
			'status' => 'error'
		);

		if ($file) {
			$title = $request->getVar('title');
			$basename = $request->getVar('basename');

			if (!empty($title)) {
				$file->Title = $title;
			}

			if (!empty($basename)) {
				$file->Name = $basename;
			}

			$file->write();

			$code = 200;

			$body = array(
				'status' => 'ok'
			);
		}

		$response = new SS_HTTPResponse(json_encode($body), $code);
		$response->addHeader('Content-Type', 'application/json');

		return $response;
	}

	/**
	 * @param SS_HTTPRequest $request
	 *
	 * @return SS_HTTPResponse
	 */
	public function delete(SS_HTTPRequest $request) {
		$file = File::get()->filter("id", (int) $request->getVar("id"))->first();

		$response = new SS_HTTPResponse();
		$response->addHeader('Content-Type', 'application/json');

		if ($file) {
			$file->delete();

			$response->setBody(json_encode(array(
				'status' => 'file was deleted',
			)));
		} else {
			$response->setStatusCode(500);

			$response->setBody(json_encode(array(
				'status' => 'could not find the file',
			)));
		}

		return $response;
	}

	/**
	 * @param array $filters
	 *
	 * @return array
	 */
	protected function getData($filters = array()) {
		// Re-apply folder filter to search
		$files = $this->getSource();

		// @todo - make sure that AssetAdmin::currentPageID returns the ID of the folder in
		// the 'folder' querystring. Otherwise this filter won't work
		if (isset($filters['folder'])) {
			$folder = $this->getFolder($filters['folder']);
			$files = $files->filter('ParentID', $folder->ID);
		}
		
		$files = $files->sort(
			'(CASE WHEN "File"."ClassName" = \'Folder\' THEN 0 ELSE 1 END), "Name"'
		);

		// Total count before applying limit
		$count = $files->count();

		// Page this list
		if (isset($filters['page']) && isset($filters['limit'])) {
			$page = $filters['page'];
			$limit = $filters['limit'];
			$offset = ($page - 1) * $limit;
			$files = $files->limit($limit, $offset);
		}

		$items = array();
		foreach($files as $file) {
			$items[] = $this->getObjectFromData($file);
		}

		return array(
			"items" => $items,
			"count" => $count,
		);
	}

	/**
	 * @param null|string $folder
	 *
	 * @return null|Folder
	 */
	protected function getFolder($folder = null) {
		if ($folder) {
			return Folder::find_or_make($folder);
		}

		$path = $this->config()->defaultPath;

		if($this->getCurrentPath() !== null) {
			$path = $this->getCurrentPath();
		}

		if (empty($path)) {
			return null;
		}

		return Folder::find_or_make($path);
	}

	/**
	 * @inheritdoc
	 *
	 * @param array $properties
	 *
	 * @return string
	 */
	public function Field($properties = array()) {
		$name = $this->getName();

		Requirements::css(ASSET_GALLERY_FIELD_DIR . "/public/dist/main.css");
		Requirements::add_i18n_javascript(ASSET_GALLERY_FIELD_DIR . "/javascript/lang");
		Requirements::javascript(ASSET_GALLERY_FIELD_DIR . "/public/dist/bundle.js");

		$searchURL = $this->getSearchURL();
		$updateURL = $this->getUpdateURL();
		$deleteURL = $this->getDeleteURL();
		$initialFolder = $this->getCurrentPath();
		$limit = $this->getLimit();

		return "<div
			class='asset-gallery'
			data-asset-gallery-name='{$name}'
			data-asset-gallery-limit='{$limit}'
			data-asset-gallery-search-url='{$searchURL}'
			data-asset-gallery-update-url='{$updateURL}'
			data-asset-gallery-delete-url='{$deleteURL}'
			data-asset-gallery-initial-folder='{$initialFolder}'
			></div>";
	}

	/**
	 * @return string
	 */
	protected function getSearchURL() {
		return Controller::join_links($this->Link(), 'search');
	}

	/**
	 * @return string
	 */
	protected function getUpdateURL() {
		return Controller::join_links($this->Link(), 'update');
	}

	/**
	 * @return string
	 */
	protected function getDeleteURL() {
		return Controller::join_links($this->Link(), 'delete');
	}

	/**
	 * @return string
	 */
	public function getCurrentPath() {
		return $this->currentPath;
	}

	/**
	 * @param string $currentPath
	 *
	 * @return $this
	 */
	public function setCurrentPath($currentPath) {
		$this->currentPath = $currentPath;

		return $this;
	}

	/**
	 * @param File $file
	 *
	 * @return array
	 */
	protected function getObjectFromData(File $file) {
		$object = array(
			'id' => $file->ID,
			'created' => $file->Created,
			'lastUpdated' => $file->LastEdited,
			'owner' => null,
			'parent' => null,
			'attributes' => array(
				'dimensions' => array(),
			),
			'title' => $file->Title,
			'type' => $file->is_a('Folder') ? 'folder' : $file->FileType,
			'category' => $file->is_a('Folder') ? 'folder' : $file->appCategory(),
			'basename' => $file->Name,
			'filename' => $file->Filename,
			'extension' => $file->Extension,
			'size' => $file->Size,
			'url' => $file->AbsoluteURL,
		);

		/** @var Member $owner */
		$owner = $file->Owner();

		if($owner) {
			$object['owner'] = array(
				'id' => $owner->ID,
				'title' => trim($owner->FirstName . ' ' . $owner->Surname),
			);
		}

		/** @var Folder $parent */
		$parent = $file->Parent();

		if($parent) {
			$object['parent'] = array(
				'id' => $parent->ID,
				'title' => $parent->Title,
				'filename' => $parent->Filename,
			);
		}

		/** @var File $file */
		if($file->hasMethod('getWidth') && $file->hasMethod('getHeight')) {
			$object['attributes']['dimensions']['width'] = $file->Width;
			$object['attributes']['dimensions']['height'] = $file->Height;
		}

		return $object;
	}

	/**
	 * @param int $limit
	 *
	 * @return $this
	 */
	public function setLimit($limit) {
		$this->limit = $limit;

		return $this;
	}

	/**
	 * @return int
	 */
	public function getLimit() {
		return $this->limit;
	}
}
