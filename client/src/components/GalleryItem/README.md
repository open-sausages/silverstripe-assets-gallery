# GalleryItem Component

Displays a file/folder as a thumbnail with relevant actions.

## Example
```js
<GalleryItem item={{id: 2, exists: true, type: 'file', category: 'document'}} selectable={true} />
<GalleryItem item={{id: 2, exists: true, type: 'folder', category: 'folder'}} selectable={true} />
```

## Properties

* `item` (object): File details to display for.
* `highlights` (boolean): Defines whether the item is highlighted (from being open)
* `selected` (boolean): Defines whether the item is actively selected.
* `enlarged` (boolean): Whether the item should apply the enlarged class (e.g. when hovered over)
* `message` (object):
    * `value` (string): The message to display over the preview area.
    * `type` (string): The type of message.
* `selectable` (boolean): Defines whether the item can be selected.
* `onActivate` (function): Callback for when the item is activated (normally by Click)
* `onSelect` (function): Callback for when the item is selected.
* `onCancelUpload` (function): Callback for when the item is cancelled from uploading.
* `onRemoveErroredUpload` (function): Callback for when the item should be removed, can be called after it errors during upload.

# draggable HOC

Helps apply drag-and-drop functionality to Files, so that the file can interact with dragging.

## Example

```js
const draggableComponent = draggable(Component);
```

## Properties

* `item` (object) (required): File details to display for. Minimally needs a unique `id` property.
* `canDrag` (bool): Whether this item can be dragged right now. Assumed `true` if missing.

# droppable HOC

Helps apply drag-and-drop functionality to Folders, so that a file could be dragged on it with the proper interactive response.

## Example

```js
const droppableComponent = droppable(Component);
```

## Properties

* `item` (object) (required): File details to display for. Minimally needs a unique `id` property.

# GalleryItemDragLayer Component

The custom preview item to show instead of just dragging the existing file/folder presentation

## Example

```js
<GalleryItemDragLayer />
```

## Properties

* `draggingItemProps` (object) (required): Props for the item being dragged.
* `draggingItems` (array) (required): Array of IDs of all items being dragged (includes selected items).
