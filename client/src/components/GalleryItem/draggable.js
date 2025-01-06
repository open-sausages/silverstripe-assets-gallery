import React from 'react';
import PropTypes from 'prop-types';
import { useDraggable } from '@dnd-kit/core';

export default function draggable(Item) {
  function DraggableItem(props) {
    const canDrag = typeof props.canDrag === 'boolean' ? props.canDrag : true;
    const { attributes, listeners, setNodeRef } = useDraggable({ disabled: !canDrag, id: props.item.id, data: { props } });
    const item = <Item {...props} />;

    return <div
      className="gallery-item__draggable"
      // The `draggable` attribute is needed to tell react-selectable to not start selecting on mousedown
      draggable
      ref={setNodeRef}
      {...listeners}
      {...attributes}
    >{ item }</div>;
  }

  DraggableItem.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.number.isRequired,
    }).isRequired,
    canDrag: PropTypes.bool,
  };

  return DraggableItem;
}
