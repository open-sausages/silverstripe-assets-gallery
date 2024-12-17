/* global window */
import React, { useCallback, useState } from 'react';
import classnames from 'classnames';
import GalleryItemDragLayer from 'components/GalleryItem/GalleryItemDragLayer';
import PropTypes from 'prop-types';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';

/**
 * Provides drag-and-drop capabilities to the gallery
 */
function GalleryDND({ className, selectedFiles, onDragStartEnd, onDropFiles, children }) {
  const [dragging, setDragging] = useState(false);
  const [draggingItemID, setDraggingItemID] = useState(null);
  const [draggingItemProps, setDraggingItemProps] = useState(null);
  const [lastDropSuccess, setLastDropSuccess] = useState(false);

  const sensors = useSensors(
    // Pointer sensor is for touch and mouse.
    // The activation constraint allows clicking and small twitches without starting a "drag".
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10
      }
    }),
  );

  const draggingItems = [...selectedFiles];
  if (!draggingItems.includes(draggingItemID)) {
    draggingItems.push(draggingItemID);
  }

  const handleDragStart = useCallback((event) => {
    if (typeof onDragStartEnd === 'function') {
      onDragStartEnd(true);
    }
    setDragging(true);
    setDraggingItemID(event.active.id);
    setDraggingItemProps(event.active.data.current.props);
    setLastDropSuccess(false);
  });

  const handleDragEnd = useCallback((event) => {
    if (typeof onDragStartEnd === 'function') {
      onDragStartEnd(false);
    }
    if (event.over && typeof onDropFiles === 'function') {
      setLastDropSuccess(true);
      onDropFiles(event.over.id, draggingItems);
    }
    setDragging(false);
    setDraggingItemID(null);
    setDraggingItemProps(null);
  });

  // Disable the drop animation if the file we're dragging got moved out of this folder.
  const dropAnimationDuration = lastDropSuccess ? 0 : 250;

  return (
    <div className={classnames(className, { 'gallery__main--dragging': dragging })}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} modifiers={[snapCenterToCursor]}>
        {children}
        <DragOverlay dropAnimation={{ duration: dropAnimationDuration }}>{dragging && <GalleryItemDragLayer draggingItemProps={draggingItemProps} draggingItems={draggingItems} />}</DragOverlay>
      </DndContext>
    </div>
  );
}
GalleryDND.contextTypes = {
  dragDropManager: PropTypes.object,
};

GalleryDND.propTypes = {
  selectedFiles: PropTypes.arrayOf(PropTypes.number).isRequired,
  className: PropTypes.string,
  onDropFiles: PropTypes.func,
  onDragStartEnd: PropTypes.func,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

export default GalleryDND;
