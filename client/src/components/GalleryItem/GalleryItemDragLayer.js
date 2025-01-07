import React from 'react';
import PropTypes from 'prop-types';
import Badge from 'components/Badge/Badge';
import GalleryItem from './GalleryItem';

function GalleryItemDragLayer(props) {
  const { draggingItems, draggingItemProps } = props;
  const selectionCount = draggingItems.length;
  const shadows = [
    selectionCount > 1
      ? <div key="1" className="gallery-item__drag-shadow" />
      : null,
    selectionCount > 2
      ? <div key="2" className="gallery-item__drag-shadow gallery-item__drag-shadow--second" />
      : null,
  ];

  return (
    <div className="gallery-item__drag-layer">
      <div className="gallery-item__drag-layer-preview">
        {shadows}
        <GalleryItem {...draggingItemProps} isDragging />
        {selectionCount > 1 && <Badge
          className="gallery-item__drag-layer-count"
          status="info"
          message={`${selectionCount}`}
        />}
      </div>
    </div>
  );
}

GalleryItemDragLayer.propTypes = {
  draggingItems: PropTypes.arrayOf(PropTypes.number).isRequired,
  draggingItemProps: PropTypes.object.isRequired,
};

export default GalleryItemDragLayer;
