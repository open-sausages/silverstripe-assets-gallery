/* global alert, confirm */
import React from 'react';
import PropTypes from 'prop-types';
import i18n from 'i18n';
import { Component as PlainBreadcrumb } from 'components/Breadcrumb/Breadcrumb';
import { hasFilters } from 'components/Search/Search';

/**
 * Display a breadcrumb based on the current folder, bypassing the stateful Breadcrumb component.
 * @param {Object} folder Info about the current folder.
 * @param {Object} query  Info about the current search query.
 *                        Used to figure out if looking at search results.
 * @param {Function} getUrl Method used to compute the URL for a given file or folder.
 * @param {Function} onBrowse Callback for when the user click on one of the breadcrumb element.
 * @param {Function} onFolderIcon Callback for when the user decide to edit the info for a folder.
 */
const AssetAdminBreadcrumb = ({ folder, query, getUrl, onBrowse, onFolderIcon }) => {
  // Simple wrapper method around onBrowse that suppress the event
  const handleClick = (...args) => (event) => {
    event.preventDefault();
    onBrowse(...args);
  };

  // Simple wrapper around getURL to make sure a callback has been provided
  const hrefBuilder = (...args) => getUrl && getUrl(...args);

  // Set root breadcrumb
  const breadcrumbs = [{
    text: i18n._t('AssetAdmin.FILES', 'Files'),
    href: hrefBuilder(),
    onClick: handleClick(),
  }];

  if (folder && folder.id) {
    // Add parent folders
    if (folder.parents) {
      folder.parents.forEach((parent) => {
        breadcrumbs.push({
          text: parent.title,
          href: hrefBuilder(parent.id),
          onClick: handleClick(parent.id)
        });
      });
    }

    // Add current folder
    breadcrumbs.push({
      text: folder.title,
      href: hrefBuilder(folder.id),
      onClick: handleClick(folder.id),
      icon: {
        className: 'icon font-icon-edit-list',
        onClick: (e) => {
          e.preventDefault();
          onFolderIcon();
        },
      },
    });
  }
  // Search leaf if there was a search entered
  if (hasFilters(query.filter)) {
    breadcrumbs.push({
      text: i18n._t('LeftAndMain.SEARCHRESULTS', 'Search results'),
    });
  }

  return <PlainBreadcrumb multiline crumbs={breadcrumbs} />;
};

AssetAdminBreadcrumb.propTypes = {
  onBrowse: PropTypes.func,
  onFolderIcon: PropTypes.func,
  getUrl: PropTypes.func,
  query: PropTypes.shape({
    sort: PropTypes.string,
    limit: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    page: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    filter: PropTypes.object,
  }),
  folder: PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    parents: PropTypes.array,
    parentId: PropTypes.number,
    canView: PropTypes.bool,
    canEdit: PropTypes.bool,
  }),
};

export default AssetAdminBreadcrumb;
