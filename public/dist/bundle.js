(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
var _bind = Function.prototype.bind;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var FileBackend = (function (_Events) {
	_inherits(FileBackend, _Events);

	_createClass(FileBackend, null, [{
		key: 'create',
		value: function create() {
			for (var _len = arguments.length, parameters = Array(_len), _key = 0; _key < _len; _key++) {
				parameters[_key] = arguments[_key];
			}

			return new (_bind.apply(FileBackend, [null].concat(parameters)))();
		}
	}]);

	function FileBackend(search_url, update_url, delete_url, limit, bulkActions, $folder) {
		_classCallCheck(this, FileBackend);

		_get(Object.getPrototypeOf(FileBackend.prototype), 'constructor', this).call(this);

		this.search_url = search_url;
		this.update_url = update_url;
		this.delete_url = delete_url;
		this.limit = limit;
		this.bulkActions = bulkActions;
		this.$folder = $folder;

		this.page = 1;
	}

	_createClass(FileBackend, [{
		key: 'search',
		value: function search() {
			var _this = this;

			this.page = 1;

			this.request('GET', this.search_url).then(function (json) {
				_this.emit('onSearchData', json);
			});
		}
	}, {
		key: 'more',
		value: function more() {
			var _this2 = this;

			this.page++;

			this.request('GET', this.search_url).then(function (json) {
				_this2.emit('onMoreData', json);
			});
		}
	}, {
		key: 'navigate',
		value: function navigate(folder) {
			var _this3 = this;

			this.page = 1;
			this.folder = folder;

			this.persistFolderFilter(folder);

			this.request('GET', this.search_url).then(function (json) {
				_this3.emit('onNavigateData', json);
			});
		}
	}, {
		key: 'persistFolderFilter',
		value: function persistFolderFilter(folder) {
			if (folder.substr(-1) === '/') {
				folder = folder.substr(0, folder.length - 1);
			}

			this.$folder.val(folder);
		}
	}, {
		key: 'delete',
		value: function _delete(ids) {
			var _this4 = this;

			var filesToDelete = [];

			// Allows users to pass one or more ids to delete.
			if (Object.prototype.toString.call(ids) !== '[object Array]') {
				filesToDelete.push(ids);
			} else {
				filesToDelete = ids;
			}

			this.request('GET', this.delete_url, {
				'ids': filesToDelete
			}).then(function () {
				// Using for loop cos IE10 doesn't handle 'for of',
				// which gets transcompiled into a function which uses Symbol,
				// the thing IE10 dies on.
				for (var i = 0; i < filesToDelete.length; i += 1) {
					_this4.emit('onDeleteData', filesToDelete[i]);
				}
			});
		}
	}, {
		key: 'filter',
		value: function filter(name, type, folder, createdFrom, createdTo, onlySearchInFolder) {
			this.name = name;
			this.type = type;
			this.folder = folder;
			this.createdFrom = createdFrom;
			this.createdTo = createdTo;
			this.onlySearchInFolder = onlySearchInFolder;

			this.search();
		}
	}, {
		key: 'save',
		value: function save(id, values) {
			var _this5 = this;

			values['id'] = id;

			this.request('POST', this.update_url, values).then(function () {
				_this5.emit('onSaveData', id, values);
			});
		}
	}, {
		key: 'request',
		value: function request(method, url) {
			var _this6 = this;

			var data = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

			var defaults = {
				'limit': this.limit,
				'page': this.page
			};

			if (this.name && this.name.trim() !== '') {
				defaults.name = decodeURIComponent(this.name);
			}

			if (this.folder && this.folder.trim() !== '') {
				defaults.folder = decodeURIComponent(this.folder);
			}

			if (this.createdFrom && this.createdFrom.trim() !== '') {
				defaults.createdFrom = decodeURIComponent(this.createdFrom);
			}

			if (this.createdTo && this.createdTo.trim() !== '') {
				defaults.createdTo = decodeURIComponent(this.createdTo);
			}

			if (this.onlySearchInFolder && this.onlySearchInFolder.trim() !== '') {
				defaults.onlySearchInFolder = decodeURIComponent(this.onlySearchInFolder);
			}

			this.showLoadingIndicator();

			return _jquery2['default'].ajax({
				'url': url,
				'method': method,
				'dataType': 'json',
				'data': _jquery2['default'].extend(defaults, data)
			}).always(function () {
				_this6.hideLoadingIndicator();
			});
		}
	}, {
		key: 'showLoadingIndicator',
		value: function showLoadingIndicator() {
			(0, _jquery2['default'])('.cms-content, .ui-dialog').addClass('loading');
			(0, _jquery2['default'])('.ui-dialog-content').css('opacity', '.1');
		}
	}, {
		key: 'hideLoadingIndicator',
		value: function hideLoadingIndicator() {
			(0, _jquery2['default'])('.cms-content, .ui-dialog').removeClass('loading');
			(0, _jquery2['default'])('.ui-dialog-content').css('opacity', '1');
		}
	}]);

	return FileBackend;
})(_events2['default']);

exports['default'] = FileBackend;
module.exports = exports['default'];

},{"events":1,"jquery":"jquery"}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _silverstripeComponent = require('silverstripe-component');

var _silverstripeComponent2 = _interopRequireDefault(_silverstripeComponent);

var _default = (function (_SilverStripeComponent) {
	_inherits(_default, _SilverStripeComponent);

	function _default() {
		_classCallCheck(this, _default);

		_get(Object.getPrototypeOf(_default.prototype), 'constructor', this).apply(this, arguments);
	}

	_createClass(_default, [{
		key: 'bind',
		value: function bind() {
			var _this = this;

			for (var _len = arguments.length, methods = Array(_len), _key = 0; _key < _len; _key++) {
				methods[_key] = arguments[_key];
			}

			methods.forEach(function (method) {
				return _this[method] = _this[method].bind(_this);
			});
		}
	}]);

	return _default;
})(_silverstripeComponent2['default']);

exports['default'] = _default;
module.exports = exports['default'];

},{"react":"react","silverstripe-component":"silverstripe-component"}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _baseComponent = require('./base-component');

var _baseComponent2 = _interopRequireDefault(_baseComponent);

var BulkActionsComponent = (function (_BaseComponent) {
	_inherits(BulkActionsComponent, _BaseComponent);

	function BulkActionsComponent(props) {
		_classCallCheck(this, BulkActionsComponent);

		_get(Object.getPrototypeOf(BulkActionsComponent.prototype), 'constructor', this).call(this, props);

		this.bind('onChangeValue');
	}

	_createClass(BulkActionsComponent, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			var $select = (0, _jquery2['default'])(_react2['default'].findDOMNode(this)).find('.dropdown');

			$select.chosen({
				'allow_single_deselect': true,
				'disable_search_threshold': 20
			});

			// Chosen stops the change event from reaching React so we have to simulate a click.
			$select.change(function () {
				return _react2['default'].addons.TestUtils.Simulate.click($select.find(':selected')[0]);
			});
		}
	}, {
		key: 'render',
		value: function render() {
			var _this = this;

			return _react2['default'].createElement(
				'div',
				{ className: 'gallery__bulk fieldholder-small' },
				_react2['default'].createElement(
					'select',
					{ className: 'dropdown no-change-track no-chzn', tabIndex: '0', 'data-placeholder': this.props.placeholder, style: { width: '160px' } },
					_react2['default'].createElement('option', { selected: true, disabled: true, hidden: true, value: '' }),
					this.props.options.map(function (option, i) {
						return _react2['default'].createElement(
							'option',
							{ key: i, onClick: _this.onChangeValue, value: option.value },
							option.label
						);
					})
				)
			);
		}
	}, {
		key: 'getOptionByValue',
		value: function getOptionByValue(value) {
			// Using for loop cos IE10 doesn't handle 'for of',
			// which gets transcompiled into a function which uses Symbol,
			// the thing IE10 dies on.
			for (var i = 0; i < this.props.options.length; i += 1) {
				if (this.props.options[i].value === value) {
					return this.props.options[i];
				}
			}

			return null;
		}
	}, {
		key: 'applyAction',
		value: function applyAction(value) {
			// We only have 'delete' right now...
			switch (value) {
				case 'delete':
					this.props.backend['delete'](this.props.getSelectedFiles());
				default:
					return false;
			}
		}
	}, {
		key: 'onChangeValue',
		value: function onChangeValue(event) {
			var option = this.getOptionByValue(event.target.value);

			// Make sure a valid option has been selected.
			if (option === null) {
				return;
			}

			this.setState({ value: option.value });

			if (option.destructive === true) {
				if (confirm(ss.i18n.sprintf(ss.i18n._t('AssetGalleryField.BULK_ACTIONS_CONFIRM'), option.label))) {
					this.applyAction(option.value);
				}
			} else {
				this.applyAction(option.value);
			}

			// Reset the dropdown to it's placeholder value.
			(0, _jquery2['default'])(_react2['default'].findDOMNode(this)).find('.dropdown').val('').trigger('liszt:updated');
		}
	}]);

	return BulkActionsComponent;
})(_baseComponent2['default']);

exports['default'] = BulkActionsComponent;
;
module.exports = exports['default'];

},{"./base-component":3,"jquery":"jquery","react":"react"}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _i18n = require('i18n');

var _i18n2 = _interopRequireDefault(_i18n);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _baseComponent = require('./base-component');

var _baseComponent2 = _interopRequireDefault(_baseComponent);

var EditorComponent = (function (_BaseComponent) {
	_inherits(EditorComponent, _BaseComponent);

	function EditorComponent(props) {
		var _this = this;

		_classCallCheck(this, EditorComponent);

		_get(Object.getPrototypeOf(EditorComponent.prototype), 'constructor', this).call(this, props);

		this.state = {
			'title': this.props.file.title,
			'basename': this.props.file.basename
		};

		this.fields = [{
			'label': 'Title',
			'name': 'title',
			'value': this.props.file.title,
			'onChange': function onChange(event) {
				return _this.onFieldChange('title', event);
			}
		}, {
			'label': 'Filename',
			'name': 'basename',
			'value': this.props.file.basename,
			'onChange': function onChange(event) {
				return _this.onFieldChange('basename', event);
			}
		}];

		this.bind('onFieldChange', 'onFileSave', 'onCancel');
	}

	_createClass(EditorComponent, [{
		key: 'onFieldChange',
		value: function onFieldChange(name, event) {
			this.setState(_defineProperty({}, name, event.target.value));
		}
	}, {
		key: 'onFileSave',
		value: function onFileSave(event) {
			this.props.onFileSave(this.props.file.id, this.state, event);
		}
	}, {
		key: 'onCancel',
		value: function onCancel(event) {
			this.props.onCancel(event);
		}
	}, {
		key: 'render',
		value: function render() {
			var _this2 = this;

			return _react2['default'].createElement(
				'div',
				{ className: 'editor' },
				_react2['default'].createElement(
					'div',
					{ className: 'CompositeField composite cms-file-info nolabel' },
					_react2['default'].createElement(
						'div',
						{ className: 'CompositeField composite cms-file-info-preview nolabel' },
						_react2['default'].createElement('img', { className: 'thumbnail-preview', src: this.props.file.url })
					),
					_react2['default'].createElement(
						'div',
						{ className: 'CompositeField composite cms-file-info-data nolabel' },
						_react2['default'].createElement(
							'div',
							{ className: 'CompositeField composite nolabel' },
							_react2['default'].createElement(
								'div',
								{ className: 'field readonly' },
								_react2['default'].createElement(
									'label',
									{ className: 'left' },
									_i18n2['default']._t('AssetGalleryField.TYPE'),
									':'
								),
								_react2['default'].createElement(
									'div',
									{ className: 'middleColumn' },
									_react2['default'].createElement(
										'span',
										{ className: 'readonly' },
										this.props.file.type
									)
								)
							)
						),
						_react2['default'].createElement(
							'div',
							{ className: 'field readonly' },
							_react2['default'].createElement(
								'label',
								{ className: 'left' },
								_i18n2['default']._t('AssetGalleryField.SIZE'),
								':'
							),
							_react2['default'].createElement(
								'div',
								{ className: 'middleColumn' },
								_react2['default'].createElement(
									'span',
									{ className: 'readonly' },
									this.props.file.size
								)
							)
						),
						_react2['default'].createElement(
							'div',
							{ className: 'field readonly' },
							_react2['default'].createElement(
								'label',
								{ className: 'left' },
								_i18n2['default']._t('AssetGalleryField.URL'),
								':'
							),
							_react2['default'].createElement(
								'div',
								{ className: 'middleColumn' },
								_react2['default'].createElement(
									'span',
									{ className: 'readonly' },
									_react2['default'].createElement(
										'a',
										{ href: this.props.file.url, target: '_blank' },
										this.props.file.url
									)
								)
							)
						),
						_react2['default'].createElement(
							'div',
							{ className: 'field date_disabled readonly' },
							_react2['default'].createElement(
								'label',
								{ className: 'left' },
								_i18n2['default']._t('AssetGalleryField.CREATED'),
								':'
							),
							_react2['default'].createElement(
								'div',
								{ className: 'middleColumn' },
								_react2['default'].createElement(
									'span',
									{ className: 'readonly' },
									this.props.file.created
								)
							)
						),
						_react2['default'].createElement(
							'div',
							{ className: 'field date_disabled readonly' },
							_react2['default'].createElement(
								'label',
								{ className: 'left' },
								_i18n2['default']._t('AssetGalleryField.LASTEDIT'),
								':'
							),
							_react2['default'].createElement(
								'div',
								{ className: 'middleColumn' },
								_react2['default'].createElement(
									'span',
									{ className: 'readonly' },
									this.props.file.lastUpdated
								)
							)
						),
						_react2['default'].createElement(
							'div',
							{ className: 'field readonly' },
							_react2['default'].createElement(
								'label',
								{ className: 'left' },
								_i18n2['default']._t('AssetGalleryField.DIM'),
								':'
							),
							_react2['default'].createElement(
								'div',
								{ className: 'middleColumn' },
								_react2['default'].createElement(
									'span',
									{ className: 'readonly' },
									this.props.file.attributes.dimensions.width,
									' x ',
									this.props.file.attributes.dimensions.height,
									'px'
								)
							)
						)
					)
				),
				this.fields.map(function (field, i) {
					return _react2['default'].createElement(
						'div',
						{ className: 'field text', key: i },
						_react2['default'].createElement(
							'label',
							{ className: 'left', htmlFor: 'gallery_' + field.name },
							field.label
						),
						_react2['default'].createElement(
							'div',
							{ className: 'middleColumn' },
							_react2['default'].createElement('input', { id: 'gallery_' + field.name, className: 'text', type: 'text', onChange: field.onChange, value: _this2.state[field.name] })
						)
					);
				}),
				_react2['default'].createElement(
					'div',
					null,
					_react2['default'].createElement(
						'button',
						{
							type: 'submit',
							className: 'ss-ui-button ui-button ui-widget ui-state-default ui-corner-all font-icon-check-mark',
							onClick: this.onFileSave },
						_i18n2['default']._t('AssetGalleryField.SAVE')
					),
					_react2['default'].createElement(
						'button',
						{
							type: 'button',
							className: 'ss-ui-button ui-button ui-widget ui-state-default ui-corner-all font-icon-cancel-circled',
							onClick: this.onCancel },
						_i18n2['default']._t('AssetGalleryField.CANCEL')
					)
				)
			);
		}
	}]);

	return EditorComponent;
})(_baseComponent2['default']);

EditorComponent.propTypes = {
	'file': _react2['default'].PropTypes.shape({
		'id': _react2['default'].PropTypes.number,
		'title': _react2['default'].PropTypes.string,
		'basename': _react2['default'].PropTypes.string,
		'url': _react2['default'].PropTypes.string,
		'size': _react2['default'].PropTypes.string,
		'created': _react2['default'].PropTypes.string,
		'lastUpdated': _react2['default'].PropTypes.string,
		'dimensions': _react2['default'].PropTypes.shape({
			'width': _react2['default'].PropTypes.number,
			'height': _react2['default'].PropTypes.number
		})
	}),
	'onFileSave': _react2['default'].PropTypes.func,
	'onCancel': _react2['default'].PropTypes.func
};

exports['default'] = EditorComponent;
module.exports = exports['default'];

},{"./base-component":3,"i18n":"i18n","jquery":"jquery","react":"react"}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _i18n = require('i18n');

var _i18n2 = _interopRequireDefault(_i18n);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

var _baseComponent = require('./base-component');

var _baseComponent2 = _interopRequireDefault(_baseComponent);

var FileComponent = (function (_BaseComponent) {
	_inherits(FileComponent, _BaseComponent);

	function FileComponent(props) {
		_classCallCheck(this, FileComponent);

		_get(Object.getPrototypeOf(FileComponent.prototype), 'constructor', this).call(this, props);

		this.state = {
			'focussed': false,
			'buttonTabIndex': -1
		};

		this.bind('onFileNavigate', 'onFileEdit', 'onFileDelete', 'onFileSelect', 'handleDoubleClick', 'handleKeyDown', 'handleFocus', 'handleBlur', 'onFileSelect', 'preventFocus');
	}

	_createClass(FileComponent, [{
		key: 'handleDoubleClick',
		value: function handleDoubleClick(event) {
			if (event.target !== this.refs.title.getDOMNode() && event.target !== this.refs.thumbnail.getDOMNode()) {
				return;
			}

			this.onFileNavigate(event);
		}
	}, {
		key: 'onFileNavigate',
		value: function onFileNavigate(event) {
			if (this.isFolder()) {
				this.props.onFileNavigate(this.props, event);
				return;
			}

			this.onFileEdit(event);
		}
	}, {
		key: 'onFileSelect',
		value: function onFileSelect(event) {
			event.stopPropagation(); //stop triggering click on root element
			this.props.onFileSelect(this.props, event);
		}
	}, {
		key: 'onFileEdit',
		value: function onFileEdit(event) {
			event.stopPropagation(); //stop triggering click on root element
			this.props.onFileEdit(this.props, event);
		}
	}, {
		key: 'onFileDelete',
		value: function onFileDelete(event) {
			event.stopPropagation(); //stop triggering click on root element
			this.props.onFileDelete(this.props, event);
		}
	}, {
		key: 'isFolder',
		value: function isFolder() {
			return this.props.category === 'folder';
		}
	}, {
		key: 'getThumbnailStyles',
		value: function getThumbnailStyles() {
			if (this.props.category === 'image') {
				return { 'backgroundImage': 'url(' + this.props.url + ')' };
			}

			return {};
		}
	}, {
		key: 'getThumbnailClassNames',
		value: function getThumbnailClassNames() {
			var thumbnailClassNames = 'item__thumbnail';

			if (this.isImageLargerThanThumbnail()) {
				thumbnailClassNames += ' large';
			}

			return thumbnailClassNames;
		}
	}, {
		key: 'getItemClassNames',
		value: function getItemClassNames() {
			var itemClassNames = 'item ' + this.props.category;

			if (this.state.focussed) {
				itemClassNames += ' focussed';
			}

			if (this.props.selected) {
				itemClassNames += ' selected';
			}

			return itemClassNames;
		}
	}, {
		key: 'isImageLargerThanThumbnail',
		value: function isImageLargerThanThumbnail() {
			var dimensions = this.props.attributes.dimensions;

			return dimensions.height > _constants2['default'].THUMBNAIL_HEIGHT || dimensions.width > _constants2['default'].THUMBNAIL_WIDTH;
		}
	}, {
		key: 'handleKeyDown',
		value: function handleKeyDown(event) {
			event.stopPropagation();

			//if event doesn't come from the root element, do nothing
			if (event.target !== _react2['default'].findDOMNode(this)) {
				return;
			}

			//If space is pressed, allow focus on buttons
			if (this.props.spaceKey === event.keyCode) {
				event.preventDefault(); //Stop page from scrolling
				this.setState({
					'buttonTabIndex': 0
				});
				(0, _jquery2['default'])(_react2['default'].findDOMNode(this)).find('.item__actions__action').first().focus();
			}

			//If return is pressed, navigate folder
			if (this.props.returnKey === event.keyCode) {
				this.onFileNavigate();
			}
		}
	}, {
		key: 'handleFocus',
		value: function handleFocus() {
			this.setState({
				'focussed': true,
				'buttonTabIndex': 0
			});
		}
	}, {
		key: 'handleBlur',
		value: function handleBlur() {
			this.setState({
				'focussed': false,
				'buttonTabIndex': -1
			});
		}
	}, {
		key: 'preventFocus',
		value: function preventFocus(event) {
			//To avoid browser's default focus state when selecting an item
			event.preventDefault();
		}
	}, {
		key: 'render',
		value: function render() {
			return _react2['default'].createElement(
				'div',
				{ className: this.getItemClassNames(), 'data-id': this.props.id, tabIndex: '0', onKeyDown: this.handleKeyDown, onDoubleClick: this.handleDoubleClick },
				_react2['default'].createElement(
					'div',
					{ ref: 'thumbnail', className: this.getThumbnailClassNames(), style: this.getThumbnailStyles(), onClick: this.onFileSelect, onMouseDown: this.preventFocus },
					_react2['default'].createElement(
						'div',
						{ className: 'item__actions' },
						_react2['default'].createElement('button', {
							className: 'item__actions__action item__actions__action--select [ font-icon-tick ]',
							type: 'button',
							title: _i18n2['default']._t('AssetGalleryField.SELECT'),
							tabIndex: this.state.buttonTabIndex,
							onClick: this.onFileSelect,
							onFocus: this.handleFocus,
							onBlur: this.handleBlur }),
						_react2['default'].createElement('button', {
							className: 'item__actions__action item__actions__action--remove [ font-icon-trash ]',
							type: 'button',
							title: _i18n2['default']._t('AssetGalleryField.DELETE'),
							tabIndex: this.state.buttonTabIndex,
							onClick: this.onFileDelete,
							onFocus: this.handleFocus,
							onBlur: this.handleBlur }),
						_react2['default'].createElement('button', {
							className: 'item__actions__action item__actions__action--edit [ font-icon-edit ]',
							type: 'button',
							title: _i18n2['default']._t('AssetGalleryField.EDIT'),
							tabIndex: this.state.buttonTabIndex,
							onClick: this.onFileEdit,
							onFocus: this.handleFocus,
							onBlur: this.handleBlur })
					)
				),
				_react2['default'].createElement(
					'p',
					{ className: 'item__title', ref: 'title' },
					this.props.title
				)
			);
		}
	}]);

	return FileComponent;
})(_baseComponent2['default']);

FileComponent.propTypes = {
	'id': _react2['default'].PropTypes.number,
	'title': _react2['default'].PropTypes.string,
	'category': _react2['default'].PropTypes.string,
	'url': _react2['default'].PropTypes.string,
	'dimensions': _react2['default'].PropTypes.shape({
		'width': _react2['default'].PropTypes.number,
		'height': _react2['default'].PropTypes.number
	}),
	'onFileNavigate': _react2['default'].PropTypes.func,
	'onFileEdit': _react2['default'].PropTypes.func,
	'onFileDelete': _react2['default'].PropTypes.func,
	'spaceKey': _react2['default'].PropTypes.number,
	'returnKey': _react2['default'].PropTypes.number,
	'onFileSelect': _react2['default'].PropTypes.func,
	'selected': _react2['default'].PropTypes.bool
};

exports['default'] = FileComponent;
module.exports = exports['default'];

},{"../constants":8,"./base-component":3,"i18n":"i18n","jquery":"jquery","react":"react"}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _i18n = require('i18n');

var _i18n2 = _interopRequireDefault(_i18n);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _fileComponent = require('./file-component');

var _fileComponent2 = _interopRequireDefault(_fileComponent);

var _editorComponent = require('./editor-component');

var _editorComponent2 = _interopRequireDefault(_editorComponent);

var _bulkActionsComponent = require('./bulk-actions-component');

var _bulkActionsComponent2 = _interopRequireDefault(_bulkActionsComponent);

var _baseComponent = require('./base-component');

var _baseComponent2 = _interopRequireDefault(_baseComponent);

var _constants = require('../constants');

var _constants2 = _interopRequireDefault(_constants);

function getComparator(field, direction) {
	return function (a, b) {
		if (direction === 'asc') {
			if (a[field] < b[field]) {
				return -1;
			}

			if (a[field] > b[field]) {
				return 1;
			}
		} else {
			if (a[field] > b[field]) {
				return -1;
			}

			if (a[field] < b[field]) {
				return 1;
			}
		}

		return 0;
	};
}

function getSort(field, direction) {
	var _this = this;

	var comparator = getComparator(field, direction);

	return function () {
		var folders = _this.state.files.filter(function (file) {
			return file.type === 'folder';
		});
		var files = _this.state.files.filter(function (file) {
			return file.type !== 'folder';
		});

		_this.setState({
			'files': folders.sort(comparator).concat(files.sort(comparator))
		});
	};
}

var GalleryComponent = (function (_BaseComponent) {
	_inherits(GalleryComponent, _BaseComponent);

	function GalleryComponent(props) {
		var _this2 = this;

		_classCallCheck(this, GalleryComponent);

		_get(Object.getPrototypeOf(GalleryComponent.prototype), 'constructor', this).call(this, props);

		this.state = {
			'count': 0, // The number of files in the current view
			'files': [],
			'selectedFiles': [],
			'editing': null
		};

		this.folders = [props.initial_folder];

		this.sort = 'name';
		this.direction = 'asc';

		this.sorters = [{
			'field': 'title',
			'direction': 'asc',
			'label': _i18n2['default']._t('AssetGalleryField.FILTER_TITLE_ASC'),
			'onSort': getSort.call(this, 'title', 'asc')
		}, {
			'field': 'title',
			'direction': 'desc',
			'label': _i18n2['default']._t('AssetGalleryField.FILTER_TITLE_DESC'),
			'onSort': getSort.call(this, 'title', 'desc')
		}, {
			'field': 'created',
			'direction': 'desc',
			'label': _i18n2['default']._t('AssetGalleryField.FILTER_DATE_DESC'),
			'onSort': getSort.call(this, 'created', 'desc')
		}, {
			'field': 'created',
			'direction': 'asc',
			'label': _i18n2['default']._t('AssetGalleryField.FILTER_DATE_ASC'),
			'onSort': getSort.call(this, 'created', 'asc')
		}];

		this.listeners = {
			'onSearchData': function onSearchData(data) {
				_this2.setState({
					'count': data.count,
					'files': data.files
				});
			},
			'onMoreData': function onMoreData(data) {
				_this2.setState({
					'count': data.count,
					'files': _this2.state.files.concat(data.files)
				});
			},
			'onNavigateData': function onNavigateData(data) {
				_this2.setState({
					'count': data.count,
					'files': data.files
				});
			},
			'onDeleteData': function onDeleteData(data) {
				_this2.setState({
					'count': _this2.state.count - 1,
					'files': _this2.state.files.filter(function (file) {
						return data !== file.id;
					})
				});
			},
			'onSaveData': function onSaveData(id, values) {
				var files = _this2.state.files;

				files.forEach(function (file) {
					if (file.id == id) {
						file.title = values.title;
						file.basename = values.basename;
					}
				});

				_this2.setState({
					'files': files,
					'editing': null
				});
			}
		};

		this.bind('onFileSave', 'onFileNavigate', 'onFileSelect', 'onFileEdit', 'onFileDelete', 'onBackClick', 'onMoreClick', 'onNavigate', 'onCancel', 'getSelectedFiles');
	}

	_createClass(GalleryComponent, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			_get(Object.getPrototypeOf(GalleryComponent.prototype), 'componentDidMount', this).call(this);

			for (var _event in this.listeners) {
				this.props.backend.on(_event, this.listeners[_event]);
			}

			if (this.props.initial_folder !== this.props.current_folder) {
				this.onNavigate(this.props.current_folder);
			} else {
				this.props.backend.search();
			}
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			_get(Object.getPrototypeOf(GalleryComponent.prototype), 'componentWillUnmount', this).call(this);

			for (var _event2 in this.listeners) {
				this.props.backend.removeListener(_event2, this.listeners[_event2]);
			}
		}
	}, {
		key: 'componentDidUpdate',
		value: function componentDidUpdate() {
			var $select = (0, _jquery2['default'])(_react2['default'].findDOMNode(this)).find('.gallery__sort .dropdown');

			// We opt-out of letting the CMS handle Chosen because it doesn't re-apply the behaviour correctly.
			// So after the gallery has been rendered we apply Chosen.
			$select.chosen({
				'allow_single_deselect': true,
				'disable_search_threshold': 20
			});

			// Chosen stops the change event from reaching React so we have to simulate a click.
			$select.change(function () {
				return _react2['default'].addons.TestUtils.Simulate.click($select.find(':selected')[0]);
			});
		}
	}, {
		key: 'getFileById',
		value: function getFileById(id) {
			var folder = null,
			    idInt = parseInt(id, 10);

			for (var i = 0; i < this.state.files.length; i += 1) {
				if (this.state.files[i].id === idInt) {
					folder = this.state.files[i];
					break;
				}
			}

			return folder;
		}
	}, {
		key: 'getBackButton',
		value: function getBackButton() {
			if (this.folders.length > 1) {
				return _react2['default'].createElement('button', {
					className: 'gallery__back ss-ui-button ui-button ui-widget ui-state-default ui-corner-all font-icon-level-up no-text',
					onClick: this.onBackClick,
					ref: 'backButton' });
			}

			return null;
		}
	}, {
		key: 'getBulkActionsComponent',
		value: function getBulkActionsComponent() {
			if (this.state.selectedFiles.length > 0 && this.props.backend.bulkActions) {
				return _react2['default'].createElement(_bulkActionsComponent2['default'], {
					options: _constants2['default'].BULK_ACTIONS,
					placeholder: ss.i18n._t('AssetGalleryField.BULK_ACTIONS_PLACEHOLDER'),
					backend: this.props.backend,
					getSelectedFiles: this.getSelectedFiles });
			}

			return null;
		}
	}, {
		key: 'getMoreButton',
		value: function getMoreButton() {
			if (this.state.count > this.state.files.length) {
				return _react2['default'].createElement(
					'button',
					{
						className: 'gallery__load__more',
						onClick: this.onMoreClick },
					_i18n2['default']._t('AssetGalleryField.LOADMORE')
				);
			}

			return null;
		}
	}, {
		key: 'getSelectedFiles',
		value: function getSelectedFiles() {
			return this.state.selectedFiles;
		}
	}, {
		key: 'render',
		value: function render() {
			var _this3 = this;

			if (this.state.editing !== null) {
				return _react2['default'].createElement(
					'div',
					{ className: 'gallery' },
					_react2['default'].createElement(_editorComponent2['default'], {
						file: this.state.editing,
						onFileSave: this.onFileSave,
						onCancel: this.onCancel })
				);
			}

			return _react2['default'].createElement(
				'div',
				{ className: 'gallery' },
				this.getBackButton(),
				this.getBulkActionsComponent(),
				_react2['default'].createElement(
					'div',
					{ className: 'gallery__sort fieldholder-small' },
					_react2['default'].createElement(
						'select',
						{ className: 'dropdown no-change-track no-chzn', tabIndex: '0', style: { width: '160px' } },
						this.sorters.map(function (sorter, i) {
							return _react2['default'].createElement(
								'option',
								{ key: i, onClick: sorter.onSort },
								sorter.label
							);
						})
					)
				),
				_react2['default'].createElement(
					'div',
					{ className: 'gallery__items' },
					this.state.files.map(function (file, i) {
						return _react2['default'].createElement(_fileComponent2['default'], _extends({ key: i }, file, {
							onFileSelect: _this3.onFileSelect,
							spaceKey: _constants2['default'].SPACE_KEY_CODE,
							returnKey: _constants2['default'].RETURN_KEY_CODE,
							onFileDelete: _this3.onFileDelete,
							onFileEdit: _this3.onFileEdit,
							onFileNavigate: _this3.onFileNavigate,
							selected: _this3.state.selectedFiles.indexOf(file.id) > -1 }));
					})
				),
				_react2['default'].createElement(
					'div',
					{ className: 'gallery__load' },
					this.getMoreButton()
				)
			);
		}
	}, {
		key: 'onCancel',
		value: function onCancel() {
			this.setState({
				'editing': null
			});

			this.emitExitFileViewCmsEvent();
		}
	}, {
		key: 'onFileSelect',
		value: function onFileSelect(file, event) {
			event.stopPropagation();

			var currentlySelected = this.state.selectedFiles,
			    fileIndex = currentlySelected.indexOf(file.id);

			if (fileIndex > -1) {
				currentlySelected.splice(fileIndex, 1);
			} else {
				currentlySelected.push(file.id);
			}

			this.setState({
				'selectedFiles': currentlySelected
			});

			this._emitCmsEvent('asset-gallery-field.file-select', file);
		}
	}, {
		key: 'onFileDelete',
		value: function onFileDelete(file, event) {
			if (confirm(_i18n2['default']._t('AssetGalleryField.CONFIRMDELETE'))) {
				this.props.backend['delete'](file.id);
				this.emitFileDeletedCmsEvent();
			}

			event.stopPropagation();
		}
	}, {
		key: 'onFileEdit',
		value: function onFileEdit(file, event) {
			this.setState({
				'editing': file
			});

			this.emitEnterFileViewCmsEvent(file);

			event.stopPropagation();
		}
	}, {
		key: 'onFileNavigate',
		value: function onFileNavigate(file) {
			this.folders.push(file.filename);
			this.props.backend.navigate(file.filename);

			this.setState({
				'selectedFiles': []
			});

			this.emitFolderChangedCmsEvent();
			this.saveFolderNameInSession();
		}
	}, {
		key: 'emitFolderChangedCmsEvent',
		value: function emitFolderChangedCmsEvent() {
			var folderId = 0;

			// The current folder is stored by it's name in our component.
			// We need to get it's id because that's how Entwine components (GridField) reference it.
			for (var i = 0; i < this.state.files.length; i += 1) {
				if (this.state.files[i].filename === this.props.backend.folder) {
					folderId = this.state.files[i].id;
					break;
				}
			}

			this._emitCmsEvent('asset-gallery-field.folder-changed', folderId);
		}
	}, {
		key: 'emitFileDeletedCmsEvent',
		value: function emitFileDeletedCmsEvent() {
			this._emitCmsEvent('asset-gallery-field.file-deleted');
		}
	}, {
		key: 'emitEnterFileViewCmsEvent',
		value: function emitEnterFileViewCmsEvent(file) {
			var id = 0;

			this._emitCmsEvent('asset-gallery-field.enter-file-view', file.id);
		}
	}, {
		key: 'emitExitFileViewCmsEvent',
		value: function emitExitFileViewCmsEvent() {
			this._emitCmsEvent('asset-gallery-field.exit-file-view');
		}
	}, {
		key: 'saveFolderNameInSession',
		value: function saveFolderNameInSession() {
			if (this.props.hasSessionStorage()) {
				window.sessionStorage.setItem((0, _jquery2['default'])(_react2['default'].findDOMNode(this)).closest('.asset-gallery')[0].id, this.props.backend.folder);
			}
		}
	}, {
		key: 'onNavigate',
		value: function onNavigate(folder) {
			var silent = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

			this.folders.push(folder);
			this.props.backend.navigate(folder);

			if (!silent) {
				this.emitFolderChangedCmsEvent();
			}

			this.saveFolderNameInSession();
		}
	}, {
		key: 'onMoreClick',
		value: function onMoreClick(event) {
			event.stopPropagation();

			this.props.backend.more();

			event.preventDefault();
		}
	}, {
		key: 'onBackClick',
		value: function onBackClick(event) {
			if (this.folders.length > 1) {
				this.folders.pop();
				this.props.backend.navigate(this.folders[this.folders.length - 1]);
			}

			this.setState({
				'selectedFiles': []
			});

			this.emitFolderChangedCmsEvent();
			this.saveFolderNameInSession();

			event.preventDefault();
		}
	}, {
		key: 'onFileSave',
		value: function onFileSave(id, state, event) {
			this.props.backend.save(id, state);

			this.emitExitFileViewCmsEvent();

			event.stopPropagation();
			event.preventDefault();
		}
	}]);

	return GalleryComponent;
})(_baseComponent2['default']);

GalleryComponent.propTypes = {
	'hasSessionStorage': _react2['default'].PropTypes.func.isRequired,
	'backend': _react2['default'].PropTypes.object.isRequired
};

exports['default'] = GalleryComponent;
module.exports = exports['default'];

},{"../constants":8,"./base-component":3,"./bulk-actions-component":4,"./editor-component":5,"./file-component":6,"i18n":"i18n","jquery":"jquery","react":"react"}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports['default'] = {
	'THUMBNAIL_HEIGHT': 150,
	'THUMBNAIL_WIDTH': 200,
	'SPACE_KEY_CODE': 32,
	'RETURN_KEY_CODE': 13,
	'BULK_ACTIONS': [{
		value: 'delete',
		label: ss.i18n._t('AssetGalleryField.BULK_ACTIONS_DELETE'),
		destructive: true
	}]
};
module.exports = exports['default'];

},{}],9:[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _componentGalleryComponent = require('./component/gallery-component');

var _componentGalleryComponent2 = _interopRequireDefault(_componentGalleryComponent);

var _backendFileBackend = require('./backend/file-backend');

var _backendFileBackend2 = _interopRequireDefault(_backendFileBackend);

function getVar(name) {
	var parts = window.location.href.split('?');

	if (parts.length > 1) {
		parts = parts[1].split('#');
	}

	var variables = parts[0].split('&');

	for (var i = 0; i < variables.length; i++) {
		var _parts = variables[i].split('=');

		if (decodeURIComponent(_parts[0]) === name) {
			return decodeURIComponent(_parts[1]);
		}
	}

	return null;
}

function hasSessionStorage() {
	return typeof window.sessionStorage !== 'undefined' && window.sessionStorage !== null;
}

_jquery2['default'].entwine('ss', function ($) {

	$('.asset-gallery').entwine({

		Component: null,

		'getCurrentFolder': function getCurrentFolder() {
			var currentFolder = '',
			    initialFolder = this.find('.asset-gallery-component-wrapper').data('asset-gallery-initial-folder'),
			    qFolder = getVar('q[Folder]'),
			    sessionFolder;

			if (qFolder !== null) {
				currentFolder = qFolder;
			} else if (hasSessionStorage()) {
				sessionFolder = window.sessionStorage.getItem(this[0].id);

				if (sessionFolder !== null) {
					currentFolder = sessionFolder;
				}
			} else {
				currentFolder = initialFolder;
			}

			return currentFolder;
		},

		/**
   * @func getProps
   * @param object props - Used to augment defaults.
   * @desc The initial props passed into the GalleryComponent. Can be overridden by other Entwine components.
   */
		'getProps': function getProps(props) {
			var $componentWrapper = this.find('.asset-gallery-component-wrapper'),
			    $search = $('.cms-search-form'),
			    currentFolder = this.getCurrentFolder(),
			    backend,
			    defaults;

			if ($search.find('[type=hidden][name="q[Folder]"]').length == 0) {
				$search.append('<input type="hidden" name="q[Folder]" />');
			}

			// Do we need to set up a default backend?
			if (typeof props === 'undefined' || typeof props.backend === 'undefined') {
				backend = _backendFileBackend2['default'].create($componentWrapper.data('asset-gallery-search-url'), $componentWrapper.data('asset-gallery-update-url'), $componentWrapper.data('asset-gallery-delete-url'), $componentWrapper.data('asset-gallery-limit'), $componentWrapper.data('asset-gallery-bulk-actions'), $search.find('[type=hidden][name="q[Folder]"]'));

				backend.emit('filter', getVar('q[Name]'), getVar('q[AppCategory]'), getVar('q[Folder]'), getVar('q[CreatedFrom]'), getVar('q[CreatedTo]'), getVar('q[CurrentFolderOnly]'));
			}

			defaults = {
				backend: backend,
				current_folder: currentFolder,
				cmsEvents: {
					'cms.fileAdded': function cmsFileAdded() {
						// Reload the gallery
						this.props.backend.navigate(this.props.current_folder);
					},
					'cms.updateSelected': function cmsUpdateSelected(event, selectedFiles) {
						selectedFiles = selectedFiles || [];

						this.setState({
							'selectedFiles': selectedFiles
						});
					},
					'cms.deselectFolder': function cmsDeselectFolder(event, file) {
						var currentlySelected = this.state.selectedFiles,
						    fileIndex = currentlySelected.indexOf(file.id);

						currentlySelected.splice(fileIndex, 1);

						this.setState({
							'selectedFiles': currentlySelected
						});
					},
					'cms.clearSelected': function cmsClearSelected() {
						this.setState({
							'selectedFiles': []
						});
					}
				},
				hasSessionStorage: hasSessionStorage,
				initial_folder: $componentWrapper.data('asset-gallery-initial-folder'),
				name: $componentWrapper.data('asset-gallery-name')
			};

			return $.extend(true, defaults, props);
		},

		'onadd': function onadd() {
			var props = this.getProps();

			this.setComponent(_react2['default'].render(_react2['default'].createElement(_componentGalleryComponent2['default'], props), this.find('.asset-gallery-component-wrapper')[0]));
		}
	});
});

},{"./backend/file-backend":2,"./component/gallery-component":7,"jquery":"jquery","react":"react"}]},{},[9])
<<<<<<< HEAD
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvYmFja2VuZC9maWxlLWJhY2tlbmQuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9iYXNlLWNvbXBvbmVudC5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvY29tcG9uZW50L2J1bGstYWN0aW9ucy1jb21wb25lbnQuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9lZGl0b3ItY29tcG9uZW50LmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9jb21wb25lbnQvZmlsZS1jb21wb25lbnQuanMiLCIvVXNlcnMvc2h1dGNoaW5zb24vRG9jdW1lbnRzL1NpdGVzLzQvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9nYWxsZXJ5LWNvbXBvbmVudC5qcyIsIi9Vc2Vycy9zaHV0Y2hpbnNvbi9Eb2N1bWVudHMvU2l0ZXMvNC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvY29uc3RhbnRzLmpzIiwiL1VzZXJzL3NodXRjaGluc29uL0RvY3VtZW50cy9TaXRlcy80L2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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SDtBQUNELHdCQUFtQixFQUFFLDRCQUFXO0FBQy9CLFVBQUksQ0FBQyxRQUFRLENBQUM7QUFDYixzQkFBZSxFQUFFLEVBQUU7T0FDbkIsQ0FBQyxDQUFBO01BQ0Y7S0FDRDtBQUNELHFCQUFpQixFQUFFLGlCQUFpQjtBQUNwQyxrQkFBYyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyw4QkFBOEIsQ0FBQztBQUN0RSxRQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xELENBQUM7O0FBRUYsVUFBTyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7R0FDdkM7O0FBRUQsU0FBTyxFQUFFLGlCQUFZO0FBQ3BCLE9BQUksS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7QUFFNUIsT0FBSSxDQUFDLFlBQVksQ0FBQyxtQkFBTSxNQUFNLENBQzdCLHlFQUFzQixLQUFLLENBQUksRUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNoRCxDQUFDLENBQUM7R0FDSDtFQUNELENBQUMsQ0FBQztDQUNILENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IEV2ZW50cyBmcm9tICdldmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlQmFja2VuZCBleHRlbmRzIEV2ZW50cyB7XG5cdHN0YXRpYyBjcmVhdGUoLi4ucGFyYW1ldGVycykge1xuXHRcdHJldHVybiBuZXcgRmlsZUJhY2tlbmQoLi4ucGFyYW1ldGVycyk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvcihzZWFyY2hfdXJsLCB1cGRhdGVfdXJsLCBkZWxldGVfdXJsLCBsaW1pdCwgYnVsa0FjdGlvbnMsICRmb2xkZXIpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWFyY2hfdXJsID0gc2VhcmNoX3VybDtcblx0XHR0aGlzLnVwZGF0ZV91cmwgPSB1cGRhdGVfdXJsO1xuXHRcdHRoaXMuZGVsZXRlX3VybCA9IGRlbGV0ZV91cmw7XG5cdFx0dGhpcy5saW1pdCA9IGxpbWl0O1xuXHRcdHRoaXMuYnVsa0FjdGlvbnMgPSBidWxrQWN0aW9ucztcblx0XHR0aGlzLiRmb2xkZXIgPSAkZm9sZGVyO1xuXG5cdFx0dGhpcy5wYWdlID0gMTtcblx0fVxuXG5cdHNlYXJjaCgpIHtcblx0XHR0aGlzLnBhZ2UgPSAxO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25TZWFyY2hEYXRhJywganNvbik7XG5cdFx0fSk7XG5cdH1cblxuXHRtb3JlKCkge1xuXHRcdHRoaXMucGFnZSsrO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25Nb3JlRGF0YScsIGpzb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0bmF2aWdhdGUoZm9sZGVyKSB7XG5cdFx0dGhpcy5wYWdlID0gMTtcblx0XHR0aGlzLmZvbGRlciA9IGZvbGRlcjtcblxuXHRcdHRoaXMucGVyc2lzdEZvbGRlckZpbHRlcihmb2xkZXIpO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25OYXZpZ2F0ZURhdGEnLCBqc29uKTtcblx0XHR9KTtcblx0fVxuXG5cdHBlcnNpc3RGb2xkZXJGaWx0ZXIoZm9sZGVyKSB7XG5cdFx0aWYgKGZvbGRlci5zdWJzdHIoLTEpID09PSAnLycpIHtcblx0XHRcdGZvbGRlciA9IGZvbGRlci5zdWJzdHIoMCwgZm9sZGVyLmxlbmd0aCAtIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMuJGZvbGRlci52YWwoZm9sZGVyKTtcblx0fVxuXG5cdGRlbGV0ZShpZHMpIHtcblx0XHR2YXIgZmlsZXNUb0RlbGV0ZSA9IFtdO1xuXG5cdFx0Ly8gQWxsb3dzIHVzZXJzIHRvIHBhc3Mgb25lIG9yIG1vcmUgaWRzIHRvIGRlbGV0ZS5cblx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlkcykgIT09ICdbb2JqZWN0IEFycmF5XScpIHtcblx0XHRcdGZpbGVzVG9EZWxldGUucHVzaChpZHMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWxlc1RvRGVsZXRlID0gaWRzO1xuXHRcdH1cblxuXHRcdHRoaXMucmVxdWVzdCgnR0VUJywgdGhpcy5kZWxldGVfdXJsLCB7XG5cdFx0XHQnaWRzJzogZmlsZXNUb0RlbGV0ZVxuXHRcdH0pLnRoZW4oKCkgPT4ge1xuXHRcdFx0Ly8gVXNpbmcgZm9yIGxvb3AgY29zIElFMTAgZG9lc24ndCBoYW5kbGUgJ2ZvciBvZicsXG5cdFx0XHQvLyB3aGljaCBnZXRzIHRyYW5zY29tcGlsZWQgaW50byBhIGZ1bmN0aW9uIHdoaWNoIHVzZXMgU3ltYm9sLFxuXHRcdFx0Ly8gdGhlIHRoaW5nIElFMTAgZGllcyBvbi5cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZXNUb0RlbGV0ZS5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHR0aGlzLmVtaXQoJ29uRGVsZXRlRGF0YScsIGZpbGVzVG9EZWxldGVbaV0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZmlsdGVyKG5hbWUsIHR5cGUsIGZvbGRlciwgY3JlYXRlZEZyb20sIGNyZWF0ZWRUbywgb25seVNlYXJjaEluRm9sZGVyKSB7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHRcdHRoaXMuZm9sZGVyID0gZm9sZGVyO1xuXHRcdHRoaXMuY3JlYXRlZEZyb20gPSBjcmVhdGVkRnJvbTtcblx0XHR0aGlzLmNyZWF0ZWRUbyA9IGNyZWF0ZWRUbztcblx0XHR0aGlzLm9ubHlTZWFyY2hJbkZvbGRlciA9IG9ubHlTZWFyY2hJbkZvbGRlcjtcblxuXHRcdHRoaXMuc2VhcmNoKCk7XG5cdH1cblxuXHRzYXZlKGlkLCB2YWx1ZXMpIHtcblx0XHR2YWx1ZXNbJ2lkJ10gPSBpZDtcblxuXHRcdHRoaXMucmVxdWVzdCgnUE9TVCcsIHRoaXMudXBkYXRlX3VybCwgdmFsdWVzKS50aGVuKCgpID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25TYXZlRGF0YScsIGlkLCB2YWx1ZXMpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVxdWVzdChtZXRob2QsIHVybCwgZGF0YSA9IHt9KSB7XG5cdFx0bGV0IGRlZmF1bHRzID0ge1xuXHRcdFx0J2xpbWl0JzogdGhpcy5saW1pdCxcblx0XHRcdCdwYWdlJzogdGhpcy5wYWdlLFxuXHRcdH07XG5cblx0XHRpZiAodGhpcy5uYW1lICYmIHRoaXMubmFtZS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRkZWZhdWx0cy5uYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMubmFtZSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZm9sZGVyICYmIHRoaXMuZm9sZGVyLnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdGRlZmF1bHRzLmZvbGRlciA9IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLmZvbGRlcik7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY3JlYXRlZEZyb20gJiYgdGhpcy5jcmVhdGVkRnJvbS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRkZWZhdWx0cy5jcmVhdGVkRnJvbSA9IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLmNyZWF0ZWRGcm9tKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jcmVhdGVkVG8gJiYgdGhpcy5jcmVhdGVkVG8udHJpbSgpICE9PSAnJykge1xuXHRcdFx0ZGVmYXVsdHMuY3JlYXRlZFRvID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMuY3JlYXRlZFRvKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5vbmx5U2VhcmNoSW5Gb2xkZXIgJiYgdGhpcy5vbmx5U2VhcmNoSW5Gb2xkZXIudHJpbSgpICE9PSAnJykge1xuXHRcdFx0ZGVmYXVsdHMub25seVNlYXJjaEluRm9sZGVyID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMub25seVNlYXJjaEluRm9sZGVyKTtcblx0XHR9XG5cblx0XHR0aGlzLnNob3dMb2FkaW5nSW5kaWNhdG9yKCk7XG5cblx0XHRyZXR1cm4gJC5hamF4KHtcblx0XHRcdCd1cmwnOiB1cmwsXG5cdFx0XHQnbWV0aG9kJzogbWV0aG9kLFxuXHRcdFx0J2RhdGFUeXBlJzogJ2pzb24nLFxuXHRcdFx0J2RhdGEnOiAkLmV4dGVuZChkZWZhdWx0cywgZGF0YSlcblx0XHR9KS5hbHdheXMoKCkgPT4ge1xuXHRcdFx0dGhpcy5oaWRlTG9hZGluZ0luZGljYXRvcigpO1xuXHRcdH0pO1xuXHR9XG5cblx0c2hvd0xvYWRpbmdJbmRpY2F0b3IoKSB7XG5cdFx0JCgnLmNtcy1jb250ZW50LCAudWktZGlhbG9nJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHQkKCcudWktZGlhbG9nLWNvbnRlbnQnKS5jc3MoJ29wYWNpdHknLCAnLjEnKTtcblx0fVxuXG5cdGhpZGVMb2FkaW5nSW5kaWNhdG9yKCkge1xuXHRcdCQoJy5jbXMtY29udGVudCwgLnVpLWRpYWxvZycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0JCgnLnVpLWRpYWxvZy1jb250ZW50JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcblx0fVxufVxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBTaWx2ZXJTdHJpcGVDb21wb25lbnQgZnJvbSAnc2lsdmVyc3RyaXBlLWNvbXBvbmVudCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIGV4dGVuZHMgU2lsdmVyU3RyaXBlQ29tcG9uZW50IHtcblx0YmluZCguLi5tZXRob2RzKSB7XG5cdFx0bWV0aG9kcy5mb3JFYWNoKChtZXRob2QpID0+IHRoaXNbbWV0aG9kXSA9IHRoaXNbbWV0aG9kXS5iaW5kKHRoaXMpKTtcblx0fVxufVxuIiwiaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICcuL2Jhc2UtY29tcG9uZW50JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnVsa0FjdGlvbnNDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblxuXHRcdHRoaXMuYmluZChcblx0XHRcdCdvbkNoYW5nZVZhbHVlJ1xuXHRcdCk7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgJHNlbGVjdCA9ICQoUmVhY3QuZmluZERPTU5vZGUodGhpcykpLmZpbmQoJy5kcm9wZG93bicpO1xuXG5cdFx0JHNlbGVjdC5jaG9zZW4oe1xuXHRcdFx0J2FsbG93X3NpbmdsZV9kZXNlbGVjdCc6IHRydWUsXG5cdFx0XHQnZGlzYWJsZV9zZWFyY2hfdGhyZXNob2xkJzogMjBcblx0XHR9KTtcblxuXHRcdC8vIENob3NlbiBzdG9wcyB0aGUgY2hhbmdlIGV2ZW50IGZyb20gcmVhY2hpbmcgUmVhY3Qgc28gd2UgaGF2ZSB0byBzaW11bGF0ZSBhIGNsaWNrLlxuXHRcdCRzZWxlY3QuY2hhbmdlKCgpID0+IFJlYWN0LmFkZG9ucy5UZXN0VXRpbHMuU2ltdWxhdGUuY2xpY2soJHNlbGVjdC5maW5kKCc6c2VsZWN0ZWQnKVswXSkpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImdhbGxlcnlfX2J1bGsgZmllbGRob2xkZXItc21hbGxcIj5cblx0XHRcdDxzZWxlY3QgY2xhc3NOYW1lPVwiZHJvcGRvd24gbm8tY2hhbmdlLXRyYWNrIG5vLWNoem5cIiB0YWJJbmRleD1cIjBcIiBkYXRhLXBsYWNlaG9sZGVyPXt0aGlzLnByb3BzLnBsYWNlaG9sZGVyfSBzdHlsZT17e3dpZHRoOiAnMTYwcHgnfX0+XG5cdFx0XHRcdDxvcHRpb24gc2VsZWN0ZWQgZGlzYWJsZWQgaGlkZGVuIHZhbHVlPScnPjwvb3B0aW9uPlxuXHRcdFx0XHR7dGhpcy5wcm9wcy5vcHRpb25zLm1hcCgob3B0aW9uLCBpKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIDxvcHRpb24ga2V5PXtpfSBvbkNsaWNrPXt0aGlzLm9uQ2hhbmdlVmFsdWV9IHZhbHVlPXtvcHRpb24udmFsdWV9PntvcHRpb24ubGFiZWx9PC9vcHRpb24+O1xuXHRcdFx0XHR9KX1cblx0XHRcdDwvc2VsZWN0PlxuXHRcdDwvZGl2Pjtcblx0fVxuXG5cdGdldE9wdGlvbkJ5VmFsdWUodmFsdWUpIHtcblx0XHQvLyBVc2luZyBmb3IgbG9vcCBjb3MgSUUxMCBkb2Vzbid0IGhhbmRsZSAnZm9yIG9mJyxcblx0XHQvLyB3aGljaCBnZXRzIHRyYW5zY29tcGlsZWQgaW50byBhIGZ1bmN0aW9uIHdoaWNoIHVzZXMgU3ltYm9sLFxuXHRcdC8vIHRoZSB0aGluZyBJRTEwIGRpZXMgb24uXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnByb3BzLm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh0aGlzLnByb3BzLm9wdGlvbnNbaV0udmFsdWUgPT09IHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnByb3BzLm9wdGlvbnNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRhcHBseUFjdGlvbih2YWx1ZSkge1xuXHRcdC8vIFdlIG9ubHkgaGF2ZSAnZGVsZXRlJyByaWdodCBub3cuLi5cblx0XHRzd2l0Y2ggKHZhbHVlKSB7XG5cdFx0XHRjYXNlICdkZWxldGUnOlxuXHRcdFx0XHR0aGlzLnByb3BzLmJhY2tlbmQuZGVsZXRlKHRoaXMucHJvcHMuZ2V0U2VsZWN0ZWRGaWxlcygpKTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRvbkNoYW5nZVZhbHVlKGV2ZW50KSB7XG5cdFx0dmFyIG9wdGlvbiA9IHRoaXMuZ2V0T3B0aW9uQnlWYWx1ZShldmVudC50YXJnZXQudmFsdWUpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIGEgdmFsaWQgb3B0aW9uIGhhcyBiZWVuIHNlbGVjdGVkLlxuXHRcdGlmIChvcHRpb24gPT09IG51bGwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHZhbHVlOiBvcHRpb24udmFsdWUgfSk7XG5cblx0XHRpZiAob3B0aW9uLmRlc3RydWN0aXZlID09PSB0cnVlKSB7XG5cdFx0XHRpZiAoY29uZmlybShzcy5pMThuLnNwcmludGYoc3MuaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuQlVMS19BQ1RJT05TX0NPTkZJUk0nKSwgb3B0aW9uLmxhYmVsKSkpIHtcblx0XHRcdFx0dGhpcy5hcHBseUFjdGlvbihvcHRpb24udmFsdWUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmFwcGx5QWN0aW9uKG9wdGlvbi52YWx1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVzZXQgdGhlIGRyb3Bkb3duIHRvIGl0J3MgcGxhY2Vob2xkZXIgdmFsdWUuXG5cdFx0JChSZWFjdC5maW5kRE9NTm9kZSh0aGlzKSkuZmluZCgnLmRyb3Bkb3duJykudmFsKCcnKS50cmlnZ2VyKCdsaXN6dDp1cGRhdGVkJyk7XG5cdH1cbn07XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnLi9iYXNlLWNvbXBvbmVudCc7XG5cbmNsYXNzIEVkaXRvckNvbXBvbmVudCBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHQndGl0bGUnOiB0aGlzLnByb3BzLmZpbGUudGl0bGUsXG5cdFx0XHQnYmFzZW5hbWUnOiB0aGlzLnByb3BzLmZpbGUuYmFzZW5hbWVcblx0XHR9O1xuXG5cdFx0dGhpcy5maWVsZHMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdCdsYWJlbCc6ICdUaXRsZScsXG5cdFx0XHRcdCduYW1lJzogJ3RpdGxlJyxcblx0XHRcdFx0J3ZhbHVlJzogdGhpcy5wcm9wcy5maWxlLnRpdGxlLFxuXHRcdFx0XHQnb25DaGFuZ2UnOiAoZXZlbnQpID0+IHRoaXMub25GaWVsZENoYW5nZSgndGl0bGUnLCBldmVudClcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdsYWJlbCc6ICdGaWxlbmFtZScsXG5cdFx0XHRcdCduYW1lJzogJ2Jhc2VuYW1lJyxcblx0XHRcdFx0J3ZhbHVlJzogdGhpcy5wcm9wcy5maWxlLmJhc2VuYW1lLFxuXHRcdFx0XHQnb25DaGFuZ2UnOiAoZXZlbnQpID0+IHRoaXMub25GaWVsZENoYW5nZSgnYmFzZW5hbWUnLCBldmVudClcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0dGhpcy5iaW5kKCdvbkZpZWxkQ2hhbmdlJywgJ29uRmlsZVNhdmUnLCAnb25DYW5jZWwnKTtcblx0fVxuXG5cdG9uRmllbGRDaGFuZ2UobmFtZSwgZXZlbnQpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFtuYW1lXTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkZpbGVTYXZlKGV2ZW50KSB7XG5cdFx0dGhpcy5wcm9wcy5vbkZpbGVTYXZlKHRoaXMucHJvcHMuZmlsZS5pZCwgdGhpcy5zdGF0ZSwgZXZlbnQpO1xuXHR9XG5cblx0b25DYW5jZWwoZXZlbnQpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2FuY2VsKGV2ZW50KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gPGRpdiBjbGFzc05hbWU9J2VkaXRvcic+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nQ29tcG9zaXRlRmllbGQgY29tcG9zaXRlIGNtcy1maWxlLWluZm8gbm9sYWJlbCc+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdDb21wb3NpdGVGaWVsZCBjb21wb3NpdGUgY21zLWZpbGUtaW5mby1wcmV2aWV3IG5vbGFiZWwnPlxuXHRcdFx0XHRcdDxpbWcgY2xhc3NOYW1lPSd0aHVtYm5haWwtcHJldmlldycgc3JjPXt0aGlzLnByb3BzLmZpbGUudXJsfSAvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBjbXMtZmlsZS1pbmZvLWRhdGEgbm9sYWJlbCc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBub2xhYmVsJz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdmaWVsZCByZWFkb25seSc+XG5cdFx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPntpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5UWVBFJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdtaWRkbGVDb2x1bW4nPlxuXHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT0ncmVhZG9ubHknPnt0aGlzLnByb3BzLmZpbGUudHlwZX08L3NwYW4+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIHJlYWRvbmx5Jz5cblx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPntpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5TSVpFJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuZmlsZS5zaXplfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdmaWVsZCByZWFkb25seSc+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz57aTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuVVJMJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+XG5cdFx0XHRcdFx0XHRcdFx0PGEgaHJlZj17dGhpcy5wcm9wcy5maWxlLnVybH0gdGFyZ2V0PSdfYmxhbmsnPnt0aGlzLnByb3BzLmZpbGUudXJsfTwvYT5cblx0XHRcdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIGRhdGVfZGlzYWJsZWQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkNSRUFURUQnKX06PC9sYWJlbD5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdtaWRkbGVDb2x1bW4nPlxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9J3JlYWRvbmx5Jz57dGhpcy5wcm9wcy5maWxlLmNyZWF0ZWR9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIGRhdGVfZGlzYWJsZWQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkxBU1RFRElUJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuZmlsZS5sYXN0VXBkYXRlZH08L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nZmllbGQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkRJTScpfTo8L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG5cdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT0ncmVhZG9ubHknPnt0aGlzLnByb3BzLmZpbGUuYXR0cmlidXRlcy5kaW1lbnNpb25zLndpZHRofSB4IHt0aGlzLnByb3BzLmZpbGUuYXR0cmlidXRlcy5kaW1lbnNpb25zLmhlaWdodH1weDwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0e3RoaXMuZmllbGRzLm1hcCgoZmllbGQsIGkpID0+IHtcblx0XHRcdFx0cmV0dXJuIDxkaXYgY2xhc3NOYW1lPSdmaWVsZCB0ZXh0JyBrZXk9e2l9PlxuXHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnIGh0bWxGb3I9eydnYWxsZXJ5XycgKyBmaWVsZC5uYW1lfT57ZmllbGQubGFiZWx9PC9sYWJlbD5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdDxpbnB1dCBpZD17J2dhbGxlcnlfJyArIGZpZWxkLm5hbWV9IGNsYXNzTmFtZT1cInRleHRcIiB0eXBlPSd0ZXh0JyBvbkNoYW5nZT17ZmllbGQub25DaGFuZ2V9IHZhbHVlPXt0aGlzLnN0YXRlW2ZpZWxkLm5hbWVdfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdH0pfVxuXHRcdFx0PGRpdj5cblx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdHR5cGU9J3N1Ym1pdCdcblx0XHRcdFx0XHRjbGFzc05hbWU9XCJzcy11aS1idXR0b24gdWktYnV0dG9uIHVpLXdpZGdldCB1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGwgZm9udC1pY29uLWNoZWNrLW1hcmtcIlxuXHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlU2F2ZX0+XG5cdFx0XHRcdFx0e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLlNBVkUnKX1cblx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHR0eXBlPSdidXR0b24nXG5cdFx0XHRcdFx0Y2xhc3NOYW1lPVwic3MtdWktYnV0dG9uIHVpLWJ1dHRvbiB1aS13aWRnZXQgdWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYWxsIGZvbnQtaWNvbi1jYW5jZWwtY2lyY2xlZFwiXG5cdFx0XHRcdFx0b25DbGljaz17dGhpcy5vbkNhbmNlbH0+XG5cdFx0XHRcdFx0e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkNBTkNFTCcpfVxuXHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2Pjtcblx0fVxufVxuXG5FZGl0b3JDb21wb25lbnQucHJvcFR5cGVzID0ge1xuXHQnZmlsZSc6IFJlYWN0LlByb3BUeXBlcy5zaGFwZSh7XG5cdFx0J2lkJzogUmVhY3QuUHJvcFR5cGVzLm51bWJlcixcblx0XHQndGl0bGUnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdiYXNlbmFtZSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0J3VybCc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0J3NpemUnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdjcmVhdGVkJzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHQnbGFzdFVwZGF0ZWQnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdkaW1lbnNpb25zJzogUmVhY3QuUHJvcFR5cGVzLnNoYXBlKHtcblx0XHRcdCd3aWR0aCc6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG5cdFx0XHQnaGVpZ2h0JzogUmVhY3QuUHJvcFR5cGVzLm51bWJlclxuXHRcdH0pXG5cdH0pLFxuXHQnb25GaWxlU2F2ZSc6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHQnb25DYW5jZWwnOlJlYWN0LlByb3BUeXBlcy5mdW5jXG59O1xuXG5leHBvcnQgZGVmYXVsdCBFZGl0b3JDb21wb25lbnQ7XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IGNvbnN0YW50cyBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnLi9iYXNlLWNvbXBvbmVudCc7XG5cbmNsYXNzIEZpbGVDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0J2ZvY3Vzc2VkJzogZmFsc2UsXG5cdFx0XHQnYnV0dG9uVGFiSW5kZXgnOiAtMVxuXHRcdH07XG5cblx0XHR0aGlzLmJpbmQoXG5cdFx0XHQnb25GaWxlTmF2aWdhdGUnLFxuXHRcdFx0J29uRmlsZUVkaXQnLFxuXHRcdFx0J29uRmlsZURlbGV0ZScsXG5cdFx0XHQnb25GaWxlU2VsZWN0Jyxcblx0XHRcdCdoYW5kbGVEb3VibGVDbGljaycsXG5cdFx0XHQnaGFuZGxlS2V5RG93bicsXG5cdFx0XHQnaGFuZGxlRm9jdXMnLFxuXHRcdFx0J2hhbmRsZUJsdXInLFxuXHRcdFx0J29uRmlsZVNlbGVjdCcsXG5cdFx0XHQncHJldmVudEZvY3VzJ1xuXHRcdCk7XG5cdH1cblxuXHRoYW5kbGVEb3VibGVDbGljayhldmVudCkge1xuXHRcdGlmIChldmVudC50YXJnZXQgIT09IHRoaXMucmVmcy50aXRsZS5nZXRET01Ob2RlKCkgJiYgZXZlbnQudGFyZ2V0ICE9PSB0aGlzLnJlZnMudGh1bWJuYWlsLmdldERPTU5vZGUoKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMub25GaWxlTmF2aWdhdGUoZXZlbnQpO1xuXHR9XG5cblx0b25GaWxlTmF2aWdhdGUoZXZlbnQpIHtcblx0XHRpZiAodGhpcy5pc0ZvbGRlcigpKSB7XG5cdFx0XHR0aGlzLnByb3BzLm9uRmlsZU5hdmlnYXRlKHRoaXMucHJvcHMsIGV2ZW50KVxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMub25GaWxlRWRpdChldmVudCk7XG5cdH1cblxuXHRvbkZpbGVTZWxlY3QoZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy9zdG9wIHRyaWdnZXJpbmcgY2xpY2sgb24gcm9vdCBlbGVtZW50XG5cdFx0dGhpcy5wcm9wcy5vbkZpbGVTZWxlY3QodGhpcy5wcm9wcywgZXZlbnQpO1xuXHR9XG5cblx0b25GaWxlRWRpdChldmVudCkge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvL3N0b3AgdHJpZ2dlcmluZyBjbGljayBvbiByb290IGVsZW1lbnRcblx0XHR0aGlzLnByb3BzLm9uRmlsZUVkaXQodGhpcy5wcm9wcywgZXZlbnQpO1xuXHR9XG5cblx0b25GaWxlRGVsZXRlKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vc3RvcCB0cmlnZ2VyaW5nIGNsaWNrIG9uIHJvb3QgZWxlbWVudFxuXHRcdHRoaXMucHJvcHMub25GaWxlRGVsZXRlKHRoaXMucHJvcHMsIGV2ZW50KVxuXHR9XG5cblx0aXNGb2xkZXIoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuY2F0ZWdvcnkgPT09ICdmb2xkZXInO1xuXHR9XG5cblx0Z2V0VGh1bWJuYWlsU3R5bGVzKCkge1xuXHRcdGlmICh0aGlzLnByb3BzLmNhdGVnb3J5ID09PSAnaW1hZ2UnKSB7XG5cdFx0XHRyZXR1cm4geydiYWNrZ3JvdW5kSW1hZ2UnOiAndXJsKCcgKyB0aGlzLnByb3BzLnVybCArICcpJ307XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHt9O1xuXHR9XG5cblx0Z2V0VGh1bWJuYWlsQ2xhc3NOYW1lcygpIHtcblx0XHR2YXIgdGh1bWJuYWlsQ2xhc3NOYW1lcyA9ICdpdGVtX190aHVtYm5haWwnO1xuXG5cdFx0aWYgKHRoaXMuaXNJbWFnZUxhcmdlclRoYW5UaHVtYm5haWwoKSkge1xuXHRcdFx0dGh1bWJuYWlsQ2xhc3NOYW1lcyArPSAnIGxhcmdlJztcblx0XHR9XG5cblx0XHRyZXR1cm4gdGh1bWJuYWlsQ2xhc3NOYW1lcztcblx0fVxuXG5cdGdldEl0ZW1DbGFzc05hbWVzKCkge1xuXHRcdHZhciBpdGVtQ2xhc3NOYW1lcyA9ICdpdGVtICcgKyB0aGlzLnByb3BzLmNhdGVnb3J5O1xuXG5cdFx0aWYgKHRoaXMuc3RhdGUuZm9jdXNzZWQpIHtcblx0XHRcdGl0ZW1DbGFzc05hbWVzICs9ICcgZm9jdXNzZWQnO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLnByb3BzLnNlbGVjdGVkKSB7XG5cdFx0XHRpdGVtQ2xhc3NOYW1lcyArPSAnIHNlbGVjdGVkJztcblx0XHR9XG5cblx0XHRyZXR1cm4gaXRlbUNsYXNzTmFtZXM7XG5cdH1cblxuXHRpc0ltYWdlTGFyZ2VyVGhhblRodW1ibmFpbCgpIHtcblx0XHRsZXQgZGltZW5zaW9ucyA9IHRoaXMucHJvcHMuYXR0cmlidXRlcy5kaW1lbnNpb25zO1xuXG5cdFx0cmV0dXJuIGRpbWVuc2lvbnMuaGVpZ2h0ID4gY29uc3RhbnRzLlRIVU1CTkFJTF9IRUlHSFQgfHwgZGltZW5zaW9ucy53aWR0aCA+IGNvbnN0YW50cy5USFVNQk5BSUxfV0lEVEg7XG5cdH1cblxuXHRoYW5kbGVLZXlEb3duKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHQvL2lmIGV2ZW50IGRvZXNuJ3QgY29tZSBmcm9tIHRoZSByb290IGVsZW1lbnQsIGRvIG5vdGhpbmdcblx0XHRpZiAoZXZlbnQudGFyZ2V0ICE9PSBSZWFjdC5maW5kRE9NTm9kZSh0aGlzKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRcblx0XHQvL0lmIHNwYWNlIGlzIHByZXNzZWQsIGFsbG93IGZvY3VzIG9uIGJ1dHRvbnNcblx0XHRpZiAodGhpcy5wcm9wcy5zcGFjZUtleSA9PT0gZXZlbnQua2V5Q29kZSkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTsgLy9TdG9wIHBhZ2UgZnJvbSBzY3JvbGxpbmdcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHQnYnV0dG9uVGFiSW5kZXgnOiAwXG5cdFx0XHR9KTtcblx0XHRcdCQoUmVhY3QuZmluZERPTU5vZGUodGhpcykpLmZpbmQoJy5pdGVtX19hY3Rpb25zX19hY3Rpb24nKS5maXJzdCgpLmZvY3VzKCk7XG5cdFx0fVxuXG5cdFx0Ly9JZiByZXR1cm4gaXMgcHJlc3NlZCwgbmF2aWdhdGUgZm9sZGVyXG5cdFx0aWYgKHRoaXMucHJvcHMucmV0dXJuS2V5ID09PSBldmVudC5rZXlDb2RlKSB7XG5cdFx0XHR0aGlzLm9uRmlsZU5hdmlnYXRlKCk7XG5cdFx0fVxuXHR9XG5cblx0aGFuZGxlRm9jdXMoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHQnZm9jdXNzZWQnOiB0cnVlLFxuXHRcdFx0J2J1dHRvblRhYkluZGV4JzogMFxuXHRcdH0pO1xuXHR9XG5cblx0aGFuZGxlQmx1cigpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdCdmb2N1c3NlZCc6IGZhbHNlLFxuXHRcdFx0J2J1dHRvblRhYkluZGV4JzogLTFcblx0XHR9KTtcblx0fVxuXHRcblx0cHJldmVudEZvY3VzKGV2ZW50KSB7XG5cdFx0Ly9UbyBhdm9pZCBicm93c2VyJ3MgZGVmYXVsdCBmb2N1cyBzdGF0ZSB3aGVuIHNlbGVjdGluZyBhbiBpdGVtXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gPGRpdiBjbGFzc05hbWU9e3RoaXMuZ2V0SXRlbUNsYXNzTmFtZXMoKX0gZGF0YS1pZD17dGhpcy5wcm9wcy5pZH0gdGFiSW5kZXg9XCIwXCIgb25LZXlEb3duPXt0aGlzLmhhbmRsZUtleURvd259IG9uRG91YmxlQ2xpY2s9e3RoaXMuaGFuZGxlRG91YmxlQ2xpY2t9PlxuXHRcdFx0PGRpdiByZWY9XCJ0aHVtYm5haWxcIiBjbGFzc05hbWU9e3RoaXMuZ2V0VGh1bWJuYWlsQ2xhc3NOYW1lcygpfSBzdHlsZT17dGhpcy5nZXRUaHVtYm5haWxTdHlsZXMoKX0gb25DbGljaz17dGhpcy5vbkZpbGVTZWxlY3R9IG9uTW91c2VEb3duPXt0aGlzLnByZXZlbnRGb2N1c30+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdpdGVtX19hY3Rpb25zJz5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU9J2l0ZW1fX2FjdGlvbnNfX2FjdGlvbiBpdGVtX19hY3Rpb25zX19hY3Rpb24tLXNlbGVjdCBbIGZvbnQtaWNvbi10aWNrIF0nXG5cdFx0XHRcdFx0XHR0eXBlPSdidXR0b24nXG5cdFx0XHRcdFx0XHR0aXRsZT17aTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuU0VMRUNUJyl9XG5cdFx0XHRcdFx0XHR0YWJJbmRleD17dGhpcy5zdGF0ZS5idXR0b25UYWJJbmRleH1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlU2VsZWN0fVxuXHRcdFx0XHRcdFx0b25Gb2N1cz17dGhpcy5oYW5kbGVGb2N1c31cblx0XHRcdFx0XHRcdG9uQmx1cj17dGhpcy5oYW5kbGVCbHVyfT5cblx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU9J2l0ZW1fX2FjdGlvbnNfX2FjdGlvbiBpdGVtX19hY3Rpb25zX19hY3Rpb24tLXJlbW92ZSBbIGZvbnQtaWNvbi10cmFzaCBdJ1xuXHRcdFx0XHRcdFx0dHlwZT0nYnV0dG9uJ1xuXHRcdFx0XHRcdFx0dGl0bGU9e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkRFTEVURScpfVxuXHRcdFx0XHRcdFx0dGFiSW5kZXg9e3RoaXMuc3RhdGUuYnV0dG9uVGFiSW5kZXh9XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXt0aGlzLm9uRmlsZURlbGV0ZX1cblx0XHRcdFx0XHRcdG9uRm9jdXM9e3RoaXMuaGFuZGxlRm9jdXN9XG5cdFx0XHRcdFx0XHRvbkJsdXI9e3RoaXMuaGFuZGxlQmx1cn0+XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lPSdpdGVtX19hY3Rpb25zX19hY3Rpb24gaXRlbV9fYWN0aW9uc19fYWN0aW9uLS1lZGl0IFsgZm9udC1pY29uLWVkaXQgXSdcblx0XHRcdFx0XHRcdHR5cGU9J2J1dHRvbidcblx0XHRcdFx0XHRcdHRpdGxlPXtpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5FRElUJyl9XG5cdFx0XHRcdFx0XHR0YWJJbmRleD17dGhpcy5zdGF0ZS5idXR0b25UYWJJbmRleH1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlRWRpdH1cblx0XHRcdFx0XHRcdG9uRm9jdXM9e3RoaXMuaGFuZGxlRm9jdXN9XG5cdFx0XHRcdFx0XHRvbkJsdXI9e3RoaXMuaGFuZGxlQmx1cn0+XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8cCBjbGFzc05hbWU9J2l0ZW1fX3RpdGxlJyByZWY9XCJ0aXRsZVwiPnt0aGlzLnByb3BzLnRpdGxlfTwvcD5cblx0XHQ8L2Rpdj47XG5cdH1cbn1cblxuRmlsZUNvbXBvbmVudC5wcm9wVHlwZXMgPSB7XG5cdCdpZCc6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG5cdCd0aXRsZSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdCdjYXRlZ29yeSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdCd1cmwnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHQnZGltZW5zaW9ucyc6IFJlYWN0LlByb3BUeXBlcy5zaGFwZSh7XG5cdFx0J3dpZHRoJzogUmVhY3QuUHJvcFR5cGVzLm51bWJlcixcblx0XHQnaGVpZ2h0JzogUmVhY3QuUHJvcFR5cGVzLm51bWJlclxuXHR9KSxcblx0J29uRmlsZU5hdmlnYXRlJzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdCdvbkZpbGVFZGl0JzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdCdvbkZpbGVEZWxldGUnOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0J3NwYWNlS2V5JzogUmVhY3QuUHJvcFR5cGVzLm51bWJlcixcblx0J3JldHVybktleSc6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG5cdCdvbkZpbGVTZWxlY3QnOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0J3NlbGVjdGVkJzogUmVhY3QuUHJvcFR5cGVzLmJvb2xcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEZpbGVDb21wb25lbnQ7XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEZpbGVDb21wb25lbnQgZnJvbSAnLi9maWxlLWNvbXBvbmVudCc7XG5pbXBvcnQgRWRpdG9yQ29tcG9uZW50IGZyb20gJy4vZWRpdG9yLWNvbXBvbmVudCc7XG5pbXBvcnQgQnVsa0FjdGlvbnNDb21wb25lbnQgZnJvbSAnLi9idWxrLWFjdGlvbnMtY29tcG9uZW50JztcbmltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJy4vYmFzZS1jb21wb25lbnQnO1xuaW1wb3J0IENPTlNUQU5UUyBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5mdW5jdGlvbiBnZXRDb21wYXJhdG9yKGZpZWxkLCBkaXJlY3Rpb24pIHtcblx0cmV0dXJuIChhLCBiKSA9PiB7XG5cdFx0aWYgKGRpcmVjdGlvbiA9PT0gJ2FzYycpIHtcblx0XHRcdGlmIChhW2ZpZWxkXSA8IGJbZmllbGRdKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFbZmllbGRdID4gYltmaWVsZF0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChhW2ZpZWxkXSA+IGJbZmllbGRdKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFbZmllbGRdIDwgYltmaWVsZF0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH07XG59XG5cbmZ1bmN0aW9uIGdldFNvcnQoZmllbGQsIGRpcmVjdGlvbikge1xuXHRsZXQgY29tcGFyYXRvciA9IGdldENvbXBhcmF0b3IoZmllbGQsIGRpcmVjdGlvbik7XG5cblx0cmV0dXJuICgpID0+IHtcblx0XHRsZXQgZm9sZGVycyA9IHRoaXMuc3RhdGUuZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS50eXBlID09PSAnZm9sZGVyJyk7XG5cdFx0bGV0IGZpbGVzID0gdGhpcy5zdGF0ZS5maWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnR5cGUgIT09ICdmb2xkZXInKTtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2ZpbGVzJzogZm9sZGVycy5zb3J0KGNvbXBhcmF0b3IpLmNvbmNhdChmaWxlcy5zb3J0KGNvbXBhcmF0b3IpKVxuXHRcdH0pO1xuXHR9XG59XG5cbmNsYXNzIEdhbGxlcnlDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0J2NvdW50JzogMCwgLy8gVGhlIG51bWJlciBvZiBmaWxlcyBpbiB0aGUgY3VycmVudCB2aWV3XG5cdFx0XHQnZmlsZXMnOiBbXSxcblx0XHRcdCdzZWxlY3RlZEZpbGVzJzogW10sXG5cdFx0XHQnZWRpdGluZyc6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5mb2xkZXJzID0gW3Byb3BzLmluaXRpYWxfZm9sZGVyXTtcblxuXHRcdHRoaXMuc29ydCA9ICduYW1lJztcblx0XHR0aGlzLmRpcmVjdGlvbiA9ICdhc2MnO1xuXG5cdFx0dGhpcy5zb3J0ZXJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHQnZmllbGQnOiAndGl0bGUnLFxuXHRcdFx0XHQnZGlyZWN0aW9uJzogJ2FzYycsXG5cdFx0XHRcdCdsYWJlbCc6IGkxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkZJTFRFUl9USVRMRV9BU0MnKSxcblx0XHRcdFx0J29uU29ydCc6IGdldFNvcnQuY2FsbCh0aGlzLCAndGl0bGUnLCAnYXNjJylcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdmaWVsZCc6ICd0aXRsZScsXG5cdFx0XHRcdCdkaXJlY3Rpb24nOiAnZGVzYycsXG5cdFx0XHRcdCdsYWJlbCc6IGkxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkZJTFRFUl9USVRMRV9ERVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ3RpdGxlJywgJ2Rlc2MnKVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2ZpZWxkJzogJ2NyZWF0ZWQnLFxuXHRcdFx0XHQnZGlyZWN0aW9uJzogJ2Rlc2MnLFxuXHRcdFx0XHQnbGFiZWwnOiBpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5GSUxURVJfREFURV9ERVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ2NyZWF0ZWQnLCAnZGVzYycpXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnZmllbGQnOiAnY3JlYXRlZCcsXG5cdFx0XHRcdCdkaXJlY3Rpb24nOiAnYXNjJyxcblx0XHRcdFx0J2xhYmVsJzogaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuRklMVEVSX0RBVEVfQVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ2NyZWF0ZWQnLCAnYXNjJylcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0dGhpcy5saXN0ZW5lcnMgPSB7XG5cdFx0XHQnb25TZWFyY2hEYXRhJzogKGRhdGEpID0+IHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0J2NvdW50JzogZGF0YS5jb3VudCxcblx0XHRcdFx0XHQnZmlsZXMnOiBkYXRhLmZpbGVzXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdCdvbk1vcmVEYXRhJzogKGRhdGEpID0+IHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0J2NvdW50JzogZGF0YS5jb3VudCxcblx0XHRcdFx0XHQnZmlsZXMnOiB0aGlzLnN0YXRlLmZpbGVzLmNvbmNhdChkYXRhLmZpbGVzKVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHQnb25OYXZpZ2F0ZURhdGEnOiAoZGF0YSkgPT4ge1xuXHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHQnY291bnQnOiBkYXRhLmNvdW50LFxuXHRcdFx0XHRcdCdmaWxlcyc6IGRhdGEuZmlsZXNcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0J29uRGVsZXRlRGF0YSc6IChkYXRhKSA9PiB7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdCdjb3VudCc6IHRoaXMuc3RhdGUuY291bnQgLSAxLFxuXHRcdFx0XHRcdCdmaWxlcyc6IHRoaXMuc3RhdGUuZmlsZXMuZmlsdGVyKChmaWxlKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0YSAhPT0gZmlsZS5pZDtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHQnb25TYXZlRGF0YSc6IChpZCwgdmFsdWVzKSA9PiB7XG5cdFx0XHRcdGxldCBmaWxlcyA9IHRoaXMuc3RhdGUuZmlsZXM7XG5cblx0XHRcdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXHRcdFx0XHRcdGlmIChmaWxlLmlkID09IGlkKSB7XG5cdFx0XHRcdFx0XHRmaWxlLnRpdGxlID0gdmFsdWVzLnRpdGxlO1xuXHRcdFx0XHRcdFx0ZmlsZS5iYXNlbmFtZSA9IHZhbHVlcy5iYXNlbmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdCdmaWxlcyc6IGZpbGVzLFxuXHRcdFx0XHRcdCdlZGl0aW5nJzogZmFsc2Vcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuYmluZChcblx0XHRcdCdvbkZpbGVTYXZlJyxcblx0XHRcdCdvbkZpbGVOYXZpZ2F0ZScsXG5cdFx0XHQnb25GaWxlU2VsZWN0Jyxcblx0XHRcdCdvbkZpbGVFZGl0Jyxcblx0XHRcdCdvbkZpbGVEZWxldGUnLFxuXHRcdFx0J29uQmFja0NsaWNrJyxcblx0XHRcdCdvbk1vcmVDbGljaycsXG5cdFx0XHQnb25OYXZpZ2F0ZScsXG5cdFx0XHQnb25DYW5jZWwnLFxuXHRcdFx0J2dldFNlbGVjdGVkRmlsZXMnXG5cdFx0KTtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudERpZE1vdW50KCk7XG5cblx0XHRmb3IgKGxldCBldmVudCBpbiB0aGlzLmxpc3RlbmVycykge1xuXHRcdFx0dGhpcy5wcm9wcy5iYWNrZW5kLm9uKGV2ZW50LCB0aGlzLmxpc3RlbmVyc1tldmVudF0pO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLnByb3BzLmluaXRpYWxfZm9sZGVyICE9PSB0aGlzLnByb3BzLmN1cnJlbnRfZm9sZGVyKSB7XG5cdFx0XHR0aGlzLm9uTmF2aWdhdGUodGhpcy5wcm9wcy5jdXJyZW50X2ZvbGRlcik7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5zZWFyY2goKTtcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHRzdXBlci5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuXG5cdFx0Zm9yIChsZXQgZXZlbnQgaW4gdGhpcy5saXN0ZW5lcnMpIHtcblx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5yZW1vdmVMaXN0ZW5lcihldmVudCwgdGhpcy5saXN0ZW5lcnNbZXZlbnRdKTtcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnREaWRVcGRhdGUoKSB7XG5cdFx0dmFyICRzZWxlY3QgPSAkKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMpKS5maW5kKCcuZ2FsbGVyeV9fc29ydCAuZHJvcGRvd24nKTtcblxuXHRcdC8vIFdlIG9wdC1vdXQgb2YgbGV0dGluZyB0aGUgQ01TIGhhbmRsZSBDaG9zZW4gYmVjYXVzZSBpdCBkb2Vzbid0IHJlLWFwcGx5IHRoZSBiZWhhdmlvdXIgY29ycmVjdGx5LlxuXHRcdC8vIFNvIGFmdGVyIHRoZSBnYWxsZXJ5IGhhcyBiZWVuIHJlbmRlcmVkIHdlIGFwcGx5IENob3Nlbi5cblx0XHQkc2VsZWN0LmNob3Nlbih7XG5cdFx0XHQnYWxsb3dfc2luZ2xlX2Rlc2VsZWN0JzogdHJ1ZSxcblx0XHRcdCdkaXNhYmxlX3NlYXJjaF90aHJlc2hvbGQnOiAyMFxuXHRcdH0pO1xuXG5cdFx0Ly8gQ2hvc2VuIHN0b3BzIHRoZSBjaGFuZ2UgZXZlbnQgZnJvbSByZWFjaGluZyBSZWFjdCBzbyB3ZSBoYXZlIHRvIHNpbXVsYXRlIGEgY2xpY2suXG5cdFx0JHNlbGVjdC5jaGFuZ2UoKCkgPT4gUmVhY3QuYWRkb25zLlRlc3RVdGlscy5TaW11bGF0ZS5jbGljaygkc2VsZWN0LmZpbmQoJzpzZWxlY3RlZCcpWzBdKSk7XG5cdH1cblxuXHRnZXRGaWxlQnlJZChpZCkge1xuXHRcdHZhciBmb2xkZXIgPSBudWxsLFxuXHRcdFx0aWRJbnQgPSBwYXJzZUludChpZCwgMTApO1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN0YXRlLmZpbGVzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodGhpcy5zdGF0ZS5maWxlc1tpXS5pZCA9PT0gaWRJbnQpIHtcblx0XHRcdFx0Zm9sZGVyID0gdGhpcy5zdGF0ZS5maWxlc1tpXTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZvbGRlcjtcblx0fVxuXG5cdGdldEJhY2tCdXR0b24oKSB7XG5cdFx0aWYgKHRoaXMuZm9sZGVycy5sZW5ndGggPiAxKSB7XG5cdFx0XHRyZXR1cm4gPGJ1dHRvblxuXHRcdFx0XHRjbGFzc05hbWU9J2dhbGxlcnlfX2JhY2sgc3MtdWktYnV0dG9uIHVpLWJ1dHRvbiB1aS13aWRnZXQgdWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYWxsIGZvbnQtaWNvbi1sZXZlbC11cCBuby10ZXh0J1xuXHRcdFx0XHRvbkNsaWNrPXt0aGlzLm9uQmFja0NsaWNrfVxuXHRcdFx0XHRyZWY9XCJiYWNrQnV0dG9uXCI+PC9idXR0b24+O1xuXHRcdH1cblxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Z2V0QnVsa0FjdGlvbnNDb21wb25lbnQoKSB7XG5cdFx0aWYgKHRoaXMuc3RhdGUuc2VsZWN0ZWRGaWxlcy5sZW5ndGggPiAwICYmIHRoaXMucHJvcHMuYmFja2VuZC5idWxrQWN0aW9ucykge1xuXHRcdFx0cmV0dXJuIDxCdWxrQWN0aW9uc0NvbXBvbmVudFxuXHRcdFx0XHRvcHRpb25zPXtDT05TVEFOVFMuQlVMS19BQ1RJT05TfVxuXHRcdFx0XHRwbGFjZWhvbGRlcj17c3MuaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuQlVMS19BQ1RJT05TX1BMQUNFSE9MREVSJyl9XG5cdFx0XHRcdGJhY2tlbmQ9e3RoaXMucHJvcHMuYmFja2VuZH1cblx0XHRcdFx0Z2V0U2VsZWN0ZWRGaWxlcz17dGhpcy5nZXRTZWxlY3RlZEZpbGVzfSAvPjtcblx0XHR9XG5cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGdldE1vcmVCdXR0b24oKSB7XG5cdFx0aWYgKHRoaXMuc3RhdGUuY291bnQgPiB0aGlzLnN0YXRlLmZpbGVzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIDxidXR0b25cblx0XHRcdFx0Y2xhc3NOYW1lPVwiZ2FsbGVyeV9fbG9hZF9fbW9yZVwiXG5cdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25Nb3JlQ2xpY2t9PntpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5MT0FETU9SRScpfTwvYnV0dG9uPjtcblx0XHR9XG5cblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGdldFNlbGVjdGVkRmlsZXMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc3RhdGUuc2VsZWN0ZWRGaWxlcztcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5lZGl0aW5nKSB7XG5cdFx0XHRyZXR1cm4gPGRpdiBjbGFzc05hbWU9J2dhbGxlcnknPlxuXHRcdFx0XHQ8RWRpdG9yQ29tcG9uZW50XG5cdFx0XHRcdFx0ZmlsZT17dGhpcy5zdGF0ZS5lZGl0aW5nfVxuXHRcdFx0XHRcdG9uRmlsZVNhdmU9e3RoaXMub25GaWxlU2F2ZX1cblx0XHRcdFx0XHRvbkNhbmNlbD17dGhpcy5vbkNhbmNlbH0gLz5cblx0XHRcdDwvZGl2Pjtcblx0XHR9XG5cblx0XHRyZXR1cm4gPGRpdiBjbGFzc05hbWU9J2dhbGxlcnknPlxuXHRcdFx0e3RoaXMuZ2V0QmFja0J1dHRvbigpfVxuXHRcdFx0e3RoaXMuZ2V0QnVsa0FjdGlvbnNDb21wb25lbnQoKX1cblx0XHRcdDxkaXYgY2xhc3NOYW1lPVwiZ2FsbGVyeV9fc29ydCBmaWVsZGhvbGRlci1zbWFsbFwiPlxuXHRcdFx0XHQ8c2VsZWN0IGNsYXNzTmFtZT1cImRyb3Bkb3duIG5vLWNoYW5nZS10cmFjayBuby1jaHpuXCIgdGFiSW5kZXg9XCIwXCIgc3R5bGU9e3t3aWR0aDogJzE2MHB4J319PlxuXHRcdFx0XHRcdHt0aGlzLnNvcnRlcnMubWFwKChzb3J0ZXIsIGkpID0+IHtcblx0XHRcdFx0XHRcdHJldHVybiA8b3B0aW9uIGtleT17aX0gb25DbGljaz17c29ydGVyLm9uU29ydH0+e3NvcnRlci5sYWJlbH08L29wdGlvbj47XG5cdFx0XHRcdFx0fSl9XG5cdFx0XHRcdDwvc2VsZWN0PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nZ2FsbGVyeV9faXRlbXMnPlxuXHRcdFx0XHR7dGhpcy5zdGF0ZS5maWxlcy5tYXAoKGZpbGUsIGkpID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gPEZpbGVDb21wb25lbnQga2V5PXtpfSB7Li4uZmlsZX1cblx0XHRcdFx0XHRcdG9uRmlsZVNlbGVjdD17dGhpcy5vbkZpbGVTZWxlY3R9XG5cdFx0XHRcdFx0XHRzcGFjZUtleT17Q09OU1RBTlRTLlNQQUNFX0tFWV9DT0RFfVxuXHRcdFx0XHRcdFx0cmV0dXJuS2V5PXtDT05TVEFOVFMuUkVUVVJOX0tFWV9DT0RFfVxuXHRcdFx0XHRcdFx0b25GaWxlRGVsZXRlPXt0aGlzLm9uRmlsZURlbGV0ZX1cblx0XHRcdFx0XHRcdG9uRmlsZUVkaXQ9e3RoaXMub25GaWxlRWRpdH1cblx0XHRcdFx0XHRcdG9uRmlsZU5hdmlnYXRlPXt0aGlzLm9uRmlsZU5hdmlnYXRlfVxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ9e3RoaXMuc3RhdGUuc2VsZWN0ZWRGaWxlcy5pbmRleE9mKGZpbGUuaWQpID4gLTF9IC8+O1xuXHRcdFx0XHR9KX1cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJnYWxsZXJ5X19sb2FkXCI+XG5cdFx0XHRcdHt0aGlzLmdldE1vcmVCdXR0b24oKX1cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2Pjtcblx0fVxuXG5cdG9uQ2FuY2VsKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2VkaXRpbmcnOiBudWxsXG5cdFx0fSk7XG5cdH1cblxuXHRvbkZpbGVTZWxlY3QoZmlsZSwgZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHRcdHZhciBjdXJyZW50bHlTZWxlY3RlZCA9IHRoaXMuc3RhdGUuc2VsZWN0ZWRGaWxlcyxcblx0XHRcdGZpbGVJbmRleCA9IGN1cnJlbnRseVNlbGVjdGVkLmluZGV4T2YoZmlsZS5pZCk7XG5cblx0XHRpZiAoZmlsZUluZGV4ID4gLTEpIHtcblx0XHRcdGN1cnJlbnRseVNlbGVjdGVkLnNwbGljZShmaWxlSW5kZXgsIDEpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjdXJyZW50bHlTZWxlY3RlZC5wdXNoKGZpbGUuaWQpO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J3NlbGVjdGVkRmlsZXMnOiBjdXJyZW50bHlTZWxlY3RlZFxuXHRcdH0pO1xuXHRcdFxuXHRcdHRoaXMuX2VtaXRDbXNFdmVudCgnYXNzZXQtZ2FsbGVyeS1maWVsZC5maWxlLXNlbGVjdCcsIGZpbGUpO1xuXHR9XG5cblx0b25GaWxlRGVsZXRlKGZpbGUsIGV2ZW50KSB7XG5cdFx0aWYgKGNvbmZpcm0oaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuQ09ORklSTURFTEVURScpKSkge1xuXHRcdFx0dGhpcy5wcm9wcy5iYWNrZW5kLmRlbGV0ZShmaWxlLmlkKTtcblx0XHRcdHRoaXMuZW1pdEZpbGVEZWxldGVkQ21zRXZlbnQoKTtcblx0XHR9XG5cblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0fVxuXG5cdG9uRmlsZUVkaXQoZmlsZSwgZXZlbnQpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdCdlZGl0aW5nJzogZmlsZVxuXHRcdH0pO1xuXG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH1cblxuXHRvbkZpbGVOYXZpZ2F0ZShmaWxlKSB7XG5cdFx0dGhpcy5mb2xkZXJzLnB1c2goZmlsZS5maWxlbmFtZSk7XG5cdFx0dGhpcy5wcm9wcy5iYWNrZW5kLm5hdmlnYXRlKGZpbGUuZmlsZW5hbWUpO1xuXG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHQnc2VsZWN0ZWRGaWxlcyc6IFtdXG5cdFx0fSk7XG5cblx0XHR0aGlzLmVtaXRGb2xkZXJDaGFuZ2VkQ21zRXZlbnQoKTtcblx0XHR0aGlzLnNhdmVGb2xkZXJOYW1lSW5TZXNzaW9uKCk7XG5cdH1cblxuXHRlbWl0Rm9sZGVyQ2hhbmdlZENtc0V2ZW50KCkge1xuXHRcdHZhciBmb2xkZXJJZCA9IDA7XG5cblx0XHQvLyBUaGUgY3VycmVudCBmb2xkZXIgaXMgc3RvcmVkIGJ5IGl0J3MgbmFtZSBpbiBvdXIgY29tcG9uZW50LlxuXHRcdC8vIFdlIG5lZWQgdG8gZ2V0IGl0J3MgaWQgYmVjYXVzZSB0aGF0J3MgaG93IEVudHdpbmUgY29tcG9uZW50cyAoR3JpZEZpZWxkKSByZWZlcmVuY2UgaXQuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnN0YXRlLmZpbGVzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodGhpcy5zdGF0ZS5maWxlc1tpXS5maWxlbmFtZSA9PT0gdGhpcy5wcm9wcy5iYWNrZW5kLmZvbGRlcikge1xuXHRcdFx0XHRmb2xkZXJJZCA9IHRoaXMuc3RhdGUuZmlsZXNbaV0uaWQ7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRoaXMuX2VtaXRDbXNFdmVudCgnYXNzZXQtZ2FsbGVyeS1maWVsZC5mb2xkZXItY2hhbmdlZCcsIGZvbGRlcklkKTtcblx0fVxuXG5cdGVtaXRGaWxlRGVsZXRlZENtc0V2ZW50KCkge1xuXHRcdHRoaXMuX2VtaXRDbXNFdmVudCgnYXNzZXQtZ2FsbGVyeS1maWVsZC5maWxlLWRlbGV0ZWQnKTtcblx0fVxuXG5cdHNhdmVGb2xkZXJOYW1lSW5TZXNzaW9uKCkge1xuXHRcdGlmICh0aGlzLnByb3BzLmhhc1Nlc3Npb25TdG9yYWdlKCkpIHtcblx0XHRcdHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCQoUmVhY3QuZmluZERPTU5vZGUodGhpcykpLmNsb3Nlc3QoJy5hc3NldC1nYWxsZXJ5JylbMF0uaWQsIHRoaXMucHJvcHMuYmFja2VuZC5mb2xkZXIpO1xuXHRcdH1cblx0fVxuXG5cdG9uTmF2aWdhdGUoZm9sZGVyLCBzaWxlbnQgPSBmYWxzZSkge1xuXHRcdHRoaXMuZm9sZGVycy5wdXNoKGZvbGRlcik7XG5cdFx0dGhpcy5wcm9wcy5iYWNrZW5kLm5hdmlnYXRlKGZvbGRlcik7XG5cblx0XHRpZiAoIXNpbGVudCkge1xuXHRcdFx0dGhpcy5lbWl0Rm9sZGVyQ2hhbmdlZENtc0V2ZW50KCk7XG5cdFx0fVxuXG5cdFx0dGhpcy5zYXZlRm9sZGVyTmFtZUluU2Vzc2lvbigpO1xuXHR9XG5cblx0b25Nb3JlQ2xpY2soZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHRcdHRoaXMucHJvcHMuYmFja2VuZC5tb3JlKCk7XG5cblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9XG5cblx0b25CYWNrQ2xpY2soZXZlbnQpIHtcblx0XHRpZiAodGhpcy5mb2xkZXJzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHRoaXMuZm9sZGVycy5wb3AoKTtcblx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5uYXZpZ2F0ZSh0aGlzLmZvbGRlcnNbdGhpcy5mb2xkZXJzLmxlbmd0aCAtIDFdKTtcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdCdzZWxlY3RlZEZpbGVzJzogW11cblx0XHR9KTtcblxuXHRcdHRoaXMuZW1pdEZvbGRlckNoYW5nZWRDbXNFdmVudCgpO1xuXHRcdHRoaXMuc2F2ZUZvbGRlck5hbWVJblNlc3Npb24oKTtcblxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdH1cblxuXHRvbkZpbGVTYXZlKGlkLCBzdGF0ZSwgZXZlbnQpIHtcblx0XHR0aGlzLnByb3BzLmJhY2tlbmQuc2F2ZShpZCwgc3RhdGUpO1xuXG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxufVxuXG5HYWxsZXJ5Q29tcG9uZW50LnByb3BUeXBlcyA9IHtcblx0J2hhc1Nlc3Npb25TdG9yYWdlJzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMuaXNSZXF1aXJlZCxcblx0J2JhY2tlbmQnOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEdhbGxlcnlDb21wb25lbnQ7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdCdUSFVNQk5BSUxfSEVJR0hUJzogMTUwLFxuXHQnVEhVTUJOQUlMX1dJRFRIJzogMjAwLFxuXHQnU1BBQ0VfS0VZX0NPREUnOiAzMixcblx0J1JFVFVSTl9LRVlfQ09ERSc6IDEzLFxuXHQnQlVMS19BQ1RJT05TJzogW1xuXHRcdHtcblx0XHRcdHZhbHVlOiAnZGVsZXRlJyxcblx0XHRcdGxhYmVsOiBzcy5pMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5CVUxLX0FDVElPTlNfREVMRVRFJyksXG5cdFx0XHRkZXN0cnVjdGl2ZTogdHJ1ZVxuXHRcdH1cblx0XVxufTtcbiIsImltcG9ydCAkIGZyb20gJ2pxdWVyeSc7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEdhbGxlcnlDb21wb25lbnQgZnJvbSAnLi9jb21wb25lbnQvZ2FsbGVyeS1jb21wb25lbnQnO1xuaW1wb3J0IEZpbGVCYWNrZW5kIGZyb20gJy4vYmFja2VuZC9maWxlLWJhY2tlbmQnO1xuXG5mdW5jdGlvbiBnZXRWYXIobmFtZSkge1xuXHR2YXIgcGFydHMgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnPycpO1xuXG5cdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0cGFydHMgPSBwYXJ0c1sxXS5zcGxpdCgnIycpO1xuXHR9XG5cblx0bGV0IHZhcmlhYmxlcyA9IHBhcnRzWzBdLnNwbGl0KCcmJyk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YXJpYWJsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgcGFydHMgPSB2YXJpYWJsZXNbaV0uc3BsaXQoJz0nKTtcblxuXHRcdGlmIChkZWNvZGVVUklDb21wb25lbnQocGFydHNbMF0pID09PSBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnRzWzFdKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaGFzU2Vzc2lvblN0b3JhZ2UoKSB7XG5cdHJldHVybiB0eXBlb2Ygd2luZG93LnNlc3Npb25TdG9yYWdlICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuc2Vzc2lvblN0b3JhZ2UgIT09IG51bGw7XG59XG5cbiQuZW50d2luZSgnc3MnLCBmdW5jdGlvbiAoJCkge1xuXG5cdCQoJy5hc3NldC1nYWxsZXJ5JykuZW50d2luZSh7XG5cblx0XHRDb21wb25lbnQ6IG51bGwsXG5cblx0XHQnZ2V0Q3VycmVudEZvbGRlcic6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBjdXJyZW50Rm9sZGVyID0gJycsXG5cdFx0XHRcdGluaXRpYWxGb2xkZXIgPSB0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJykuZGF0YSgnYXNzZXQtZ2FsbGVyeS1pbml0aWFsLWZvbGRlcicpLFxuXHRcdFx0XHRxRm9sZGVyID0gZ2V0VmFyKCdxW0ZvbGRlcl0nKSxcblx0XHRcdFx0c2Vzc2lvbkZvbGRlcjtcblxuXHRcdFx0aWYgKHFGb2xkZXIgIT09IG51bGwpIHtcblx0XHRcdFx0Y3VycmVudEZvbGRlciA9IHFGb2xkZXI7XG5cdFx0XHR9IGVsc2UgaWYgKGhhc1Nlc3Npb25TdG9yYWdlKCkpIHtcblx0XHRcdFx0c2Vzc2lvbkZvbGRlciA9IHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5nZXRJdGVtKHRoaXNbMF0uaWQpO1xuXG5cdFx0XHRcdGlmIChzZXNzaW9uRm9sZGVyICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0Y3VycmVudEZvbGRlciA9IHNlc3Npb25Gb2xkZXI7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGN1cnJlbnRGb2xkZXIgPSBpbml0aWFsRm9sZGVyO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY3VycmVudEZvbGRlcjtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQGZ1bmMgZ2V0UHJvcHNcblx0XHQgKiBAcGFyYW0gb2JqZWN0IHByb3BzIC0gVXNlZCB0byBhdWdtZW50IGRlZmF1bHRzLlxuXHRcdCAqIEBkZXNjIFRoZSBpbml0aWFsIHByb3BzIHBhc3NlZCBpbnRvIHRoZSBHYWxsZXJ5Q29tcG9uZW50LiBDYW4gYmUgb3ZlcnJpZGRlbiBieSBvdGhlciBFbnR3aW5lIGNvbXBvbmVudHMuXG5cdFx0ICovXG5cdFx0J2dldFByb3BzJzogZnVuY3Rpb24gKHByb3BzKSB7XG5cdFx0XHR2YXIgJGNvbXBvbmVudFdyYXBwZXIgPSB0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJyksXG5cdFx0XHRcdCRzZWFyY2ggPSAkKCcuY21zLXNlYXJjaC1mb3JtJyksXG5cdFx0XHRcdGN1cnJlbnRGb2xkZXIgPSB0aGlzLmdldEN1cnJlbnRGb2xkZXIoKSxcblx0XHRcdFx0YmFja2VuZCxcblx0XHRcdFx0ZGVmYXVsdHM7XG5cblx0XHRcdGlmICgkc2VhcmNoLmZpbmQoJ1t0eXBlPWhpZGRlbl1bbmFtZT1cInFbRm9sZGVyXVwiXScpLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCRzZWFyY2guYXBwZW5kKCc8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJxW0ZvbGRlcl1cIiAvPicpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEbyB3ZSBuZWVkIHRvIHNldCB1cCBhIGRlZmF1bHQgYmFja2VuZD9cblx0XHRcdGlmICh0eXBlb2YgcHJvcHMgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9wcy5iYWNrZW5kID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRiYWNrZW5kID0gRmlsZUJhY2tlbmQuY3JlYXRlKFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktc2VhcmNoLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktdXBkYXRlLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktZGVsZXRlLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktbGltaXQnKSxcblx0XHRcdFx0XHQkY29tcG9uZW50V3JhcHBlci5kYXRhKCdhc3NldC1nYWxsZXJ5LWJ1bGstYWN0aW9ucycpLFxuXHRcdFx0XHRcdCRzZWFyY2guZmluZCgnW3R5cGU9aGlkZGVuXVtuYW1lPVwicVtGb2xkZXJdXCJdJylcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRiYWNrZW5kLmVtaXQoXG5cdFx0XHRcdFx0J2ZpbHRlcicsXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW05hbWVdJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0FwcENhdGVnb3J5XScpLFxuXHRcdFx0XHRcdGdldFZhcigncVtGb2xkZXJdJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0NyZWF0ZWRGcm9tXScpLFxuXHRcdFx0XHRcdGdldFZhcigncVtDcmVhdGVkVG9dJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0N1cnJlbnRGb2xkZXJPbmx5XScpXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0XHRiYWNrZW5kOiBiYWNrZW5kLFxuXHRcdFx0XHRjdXJyZW50X2ZvbGRlcjogY3VycmVudEZvbGRlcixcblx0XHRcdFx0Y21zRXZlbnRzOiB7XG5cdFx0XHRcdFx0J2Ntcy5maWxlQWRkZWQnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBSZWxvYWQgdGhlIGdhbGxlcnlcblx0XHRcdFx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5uYXZpZ2F0ZSh0aGlzLnByb3BzLmN1cnJlbnRfZm9sZGVyKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdCdjbXMudXBkYXRlU2VsZWN0ZWQnOiBmdW5jdGlvbihldmVudCwgc2VsZWN0ZWRGaWxlcykge1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlcyA9IHNlbGVjdGVkRmlsZXMgfHwgW107XG5cblx0XHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0XHQnc2VsZWN0ZWRGaWxlcyc6IHNlbGVjdGVkRmlsZXNcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0J2Ntcy5kZXNlbGVjdEZvbGRlcic6IGZ1bmN0aW9uKGV2ZW50LCBmaWxlKSB7XG5cdFx0XHRcdFx0XHR2YXIgY3VycmVudGx5U2VsZWN0ZWQgPSB0aGlzLnN0YXRlLnNlbGVjdGVkRmlsZXMsXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmRleCA9IGN1cnJlbnRseVNlbGVjdGVkLmluZGV4T2YoZmlsZS5pZCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGN1cnJlbnRseVNlbGVjdGVkLnNwbGljZShmaWxlSW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdFx0J3NlbGVjdGVkRmlsZXMnOiBjdXJyZW50bHlTZWxlY3RlZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQnY21zLmNsZWFyU2VsZWN0ZWQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0XHQnc2VsZWN0ZWRGaWxlcyc6IFtdXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0aGFzU2Vzc2lvblN0b3JhZ2U6IGhhc1Nlc3Npb25TdG9yYWdlLFxuXHRcdFx0XHRpbml0aWFsX2ZvbGRlcjogJGNvbXBvbmVudFdyYXBwZXIuZGF0YSgnYXNzZXQtZ2FsbGVyeS1pbml0aWFsLWZvbGRlcicpLFxuXHRcdFx0XHRuYW1lOiAkY29tcG9uZW50V3JhcHBlci5kYXRhKCdhc3NldC1nYWxsZXJ5LW5hbWUnKVxuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuICQuZXh0ZW5kKHRydWUsIGRlZmF1bHRzLCBwcm9wcyk7XG5cdFx0fSxcblxuXHRcdCdvbmFkZCc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBwcm9wcyA9IHRoaXMuZ2V0UHJvcHMoKTtcblxuXHRcdFx0dGhpcy5zZXRDb21wb25lbnQoUmVhY3QucmVuZGVyKFxuXHRcdFx0XHQ8R2FsbGVyeUNvbXBvbmVudCB7Li4ucHJvcHN9IC8+LFxuXHRcdFx0XHR0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJylbMF1cblx0XHRcdCkpO1xuXHRcdH1cblx0fSk7XG59KTtcbiJdfQ==
=======
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi92YXIvd3d3L3NzZGV2NDAvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2JhY2tlbmQvZmlsZS1iYWNrZW5kLmpzIiwiL3Zhci93d3cvc3NkZXY0MC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvY29tcG9uZW50L2Jhc2UtY29tcG9uZW50LmpzIiwiL3Zhci93d3cvc3NkZXY0MC9hc3NldC1nYWxsZXJ5LWZpZWxkL3B1YmxpYy9zcmMvY29tcG9uZW50L2J1bGstYWN0aW9ucy1jb21wb25lbnQuanMiLCIvdmFyL3d3dy9zc2RldjQwL2Fzc2V0LWdhbGxlcnktZmllbGQvcHVibGljL3NyYy9jb21wb25lbnQvZWRpdG9yLWNvbXBvbmVudC5qcyIsIi92YXIvd3d3L3NzZGV2NDAvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9maWxlLWNvbXBvbmVudC5qcyIsIi92YXIvd3d3L3NzZGV2NDAvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbXBvbmVudC9nYWxsZXJ5LWNvbXBvbmVudC5qcyIsIi92YXIvd3d3L3NzZGV2NDAvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL2NvbnN0YW50cy5qcyIsIi92YXIvd3d3L3NzZGV2NDAvYXNzZXQtZ2FsbGVyeS1maWVsZC9wdWJsaWMvc3JjL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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SSxDQUFDLFlBQVksQ0FBQyxtQkFBTSxNQUFNLENBQzdCLHlFQUFzQixLQUFLLENBQUksRUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUNoRCxDQUFDLENBQUM7R0FDSDtFQUNELENBQUMsQ0FBQztDQUNILENBQUMsQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IEV2ZW50cyBmcm9tICdldmVudHMnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBGaWxlQmFja2VuZCBleHRlbmRzIEV2ZW50cyB7XG5cdHN0YXRpYyBjcmVhdGUoLi4ucGFyYW1ldGVycykge1xuXHRcdHJldHVybiBuZXcgRmlsZUJhY2tlbmQoLi4ucGFyYW1ldGVycyk7XG5cdH1cblxuXHRjb25zdHJ1Y3RvcihzZWFyY2hfdXJsLCB1cGRhdGVfdXJsLCBkZWxldGVfdXJsLCBsaW1pdCwgYnVsa0FjdGlvbnMsICRmb2xkZXIpIHtcblx0XHRzdXBlcigpO1xuXG5cdFx0dGhpcy5zZWFyY2hfdXJsID0gc2VhcmNoX3VybDtcblx0XHR0aGlzLnVwZGF0ZV91cmwgPSB1cGRhdGVfdXJsO1xuXHRcdHRoaXMuZGVsZXRlX3VybCA9IGRlbGV0ZV91cmw7XG5cdFx0dGhpcy5saW1pdCA9IGxpbWl0O1xuXHRcdHRoaXMuYnVsa0FjdGlvbnMgPSBidWxrQWN0aW9ucztcblx0XHR0aGlzLiRmb2xkZXIgPSAkZm9sZGVyO1xuXG5cdFx0dGhpcy5wYWdlID0gMTtcblx0fVxuXG5cdHNlYXJjaCgpIHtcblx0XHR0aGlzLnBhZ2UgPSAxO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25TZWFyY2hEYXRhJywganNvbik7XG5cdFx0fSk7XG5cdH1cblxuXHRtb3JlKCkge1xuXHRcdHRoaXMucGFnZSsrO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25Nb3JlRGF0YScsIGpzb24pO1xuXHRcdH0pO1xuXHR9XG5cblx0bmF2aWdhdGUoZm9sZGVyKSB7XG5cdFx0dGhpcy5wYWdlID0gMTtcblx0XHR0aGlzLmZvbGRlciA9IGZvbGRlcjtcblxuXHRcdHRoaXMucGVyc2lzdEZvbGRlckZpbHRlcihmb2xkZXIpO1xuXG5cdFx0dGhpcy5yZXF1ZXN0KCdHRVQnLCB0aGlzLnNlYXJjaF91cmwpLnRoZW4oKGpzb24pID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25OYXZpZ2F0ZURhdGEnLCBqc29uKTtcblx0XHR9KTtcblx0fVxuXG5cdHBlcnNpc3RGb2xkZXJGaWx0ZXIoZm9sZGVyKSB7XG5cdFx0aWYgKGZvbGRlci5zdWJzdHIoLTEpID09PSAnLycpIHtcblx0XHRcdGZvbGRlciA9IGZvbGRlci5zdWJzdHIoMCwgZm9sZGVyLmxlbmd0aCAtIDEpO1xuXHRcdH1cblxuXHRcdHRoaXMuJGZvbGRlci52YWwoZm9sZGVyKTtcblx0fVxuXG5cdGRlbGV0ZShpZHMpIHtcblx0XHR2YXIgZmlsZXNUb0RlbGV0ZSA9IFtdO1xuXG5cdFx0Ly8gQWxsb3dzIHVzZXJzIHRvIHBhc3Mgb25lIG9yIG1vcmUgaWRzIHRvIGRlbGV0ZS5cblx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGlkcykgIT09ICdbb2JqZWN0IEFycmF5XScpIHtcblx0XHRcdGZpbGVzVG9EZWxldGUucHVzaChpZHMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWxlc1RvRGVsZXRlID0gaWRzO1xuXHRcdH1cblxuXHRcdHRoaXMucmVxdWVzdCgnR0VUJywgdGhpcy5kZWxldGVfdXJsLCB7XG5cdFx0XHQnaWRzJzogZmlsZXNUb0RlbGV0ZVxuXHRcdH0pLnRoZW4oKCkgPT4ge1xuXHRcdFx0Ly8gVXNpbmcgZm9yIGxvb3AgY29zIElFMTAgZG9lc24ndCBoYW5kbGUgJ2ZvciBvZicsXG5cdFx0XHQvLyB3aGljaCBnZXRzIHRyYW5zY29tcGlsZWQgaW50byBhIGZ1bmN0aW9uIHdoaWNoIHVzZXMgU3ltYm9sLFxuXHRcdFx0Ly8gdGhlIHRoaW5nIElFMTAgZGllcyBvbi5cblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZXNUb0RlbGV0ZS5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0XHR0aGlzLmVtaXQoJ29uRGVsZXRlRGF0YScsIGZpbGVzVG9EZWxldGVbaV0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0ZmlsdGVyKG5hbWUsIHR5cGUsIGZvbGRlciwgY3JlYXRlZEZyb20sIGNyZWF0ZWRUbywgb25seVNlYXJjaEluRm9sZGVyKSB7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHRcdHRoaXMuZm9sZGVyID0gZm9sZGVyO1xuXHRcdHRoaXMuY3JlYXRlZEZyb20gPSBjcmVhdGVkRnJvbTtcblx0XHR0aGlzLmNyZWF0ZWRUbyA9IGNyZWF0ZWRUbztcblx0XHR0aGlzLm9ubHlTZWFyY2hJbkZvbGRlciA9IG9ubHlTZWFyY2hJbkZvbGRlcjtcblxuXHRcdHRoaXMuc2VhcmNoKCk7XG5cdH1cblxuXHRzYXZlKGlkLCB2YWx1ZXMpIHtcblx0XHR2YWx1ZXNbJ2lkJ10gPSBpZDtcblxuXHRcdHRoaXMucmVxdWVzdCgnUE9TVCcsIHRoaXMudXBkYXRlX3VybCwgdmFsdWVzKS50aGVuKCgpID0+IHtcblx0XHRcdHRoaXMuZW1pdCgnb25TYXZlRGF0YScsIGlkLCB2YWx1ZXMpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVxdWVzdChtZXRob2QsIHVybCwgZGF0YSA9IHt9KSB7XG5cdFx0bGV0IGRlZmF1bHRzID0ge1xuXHRcdFx0J2xpbWl0JzogdGhpcy5saW1pdCxcblx0XHRcdCdwYWdlJzogdGhpcy5wYWdlLFxuXHRcdH07XG5cblx0XHRpZiAodGhpcy5uYW1lICYmIHRoaXMubmFtZS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRkZWZhdWx0cy5uYW1lID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMubmFtZSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuZm9sZGVyICYmIHRoaXMuZm9sZGVyLnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdGRlZmF1bHRzLmZvbGRlciA9IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLmZvbGRlcik7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuY3JlYXRlZEZyb20gJiYgdGhpcy5jcmVhdGVkRnJvbS50cmltKCkgIT09ICcnKSB7XG5cdFx0XHRkZWZhdWx0cy5jcmVhdGVkRnJvbSA9IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzLmNyZWF0ZWRGcm9tKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5jcmVhdGVkVG8gJiYgdGhpcy5jcmVhdGVkVG8udHJpbSgpICE9PSAnJykge1xuXHRcdFx0ZGVmYXVsdHMuY3JlYXRlZFRvID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMuY3JlYXRlZFRvKTtcblx0XHR9XG5cblx0XHRpZiAodGhpcy5vbmx5U2VhcmNoSW5Gb2xkZXIgJiYgdGhpcy5vbmx5U2VhcmNoSW5Gb2xkZXIudHJpbSgpICE9PSAnJykge1xuXHRcdFx0ZGVmYXVsdHMub25seVNlYXJjaEluRm9sZGVyID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXMub25seVNlYXJjaEluRm9sZGVyKTtcblx0XHR9XG5cblx0XHR0aGlzLnNob3dMb2FkaW5nSW5kaWNhdG9yKCk7XG5cblx0XHRyZXR1cm4gJC5hamF4KHtcblx0XHRcdCd1cmwnOiB1cmwsXG5cdFx0XHQnbWV0aG9kJzogbWV0aG9kLFxuXHRcdFx0J2RhdGFUeXBlJzogJ2pzb24nLFxuXHRcdFx0J2RhdGEnOiAkLmV4dGVuZChkZWZhdWx0cywgZGF0YSlcblx0XHR9KS5hbHdheXMoKCkgPT4ge1xuXHRcdFx0dGhpcy5oaWRlTG9hZGluZ0luZGljYXRvcigpO1xuXHRcdH0pO1xuXHR9XG5cblx0c2hvd0xvYWRpbmdJbmRpY2F0b3IoKSB7XG5cdFx0JCgnLmNtcy1jb250ZW50LCAudWktZGlhbG9nJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHQkKCcudWktZGlhbG9nLWNvbnRlbnQnKS5jc3MoJ29wYWNpdHknLCAnLjEnKTtcblx0fVxuXG5cdGhpZGVMb2FkaW5nSW5kaWNhdG9yKCkge1xuXHRcdCQoJy5jbXMtY29udGVudCwgLnVpLWRpYWxvZycpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0JCgnLnVpLWRpYWxvZy1jb250ZW50JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcblx0fVxufVxuIiwiaW1wb3J0IFJlYWN0IGZyb20gJ3JlYWN0JztcbmltcG9ydCBTaWx2ZXJTdHJpcGVDb21wb25lbnQgZnJvbSAnc2lsdmVyc3RyaXBlLWNvbXBvbmVudCc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIGV4dGVuZHMgU2lsdmVyU3RyaXBlQ29tcG9uZW50IHtcblx0YmluZCguLi5tZXRob2RzKSB7XG5cdFx0bWV0aG9kcy5mb3JFYWNoKChtZXRob2QpID0+IHRoaXNbbWV0aG9kXSA9IHRoaXNbbWV0aG9kXS5iaW5kKHRoaXMpKTtcblx0fVxufVxuIiwiaW1wb3J0ICQgZnJvbSAnanF1ZXJ5JztcbmltcG9ydCBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgQmFzZUNvbXBvbmVudCBmcm9tICcuL2Jhc2UtY29tcG9uZW50JztcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgQnVsa0FjdGlvbnNDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblxuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblxuXHRcdHRoaXMuYmluZChcblx0XHRcdCdvbkNoYW5nZVZhbHVlJ1xuXHRcdCk7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR2YXIgJHNlbGVjdCA9ICQoUmVhY3QuZmluZERPTU5vZGUodGhpcykpLmZpbmQoJy5kcm9wZG93bicpO1xuXG5cdFx0JHNlbGVjdC5jaG9zZW4oe1xuXHRcdFx0J2FsbG93X3NpbmdsZV9kZXNlbGVjdCc6IHRydWUsXG5cdFx0XHQnZGlzYWJsZV9zZWFyY2hfdGhyZXNob2xkJzogMjBcblx0XHR9KTtcblxuXHRcdC8vIENob3NlbiBzdG9wcyB0aGUgY2hhbmdlIGV2ZW50IGZyb20gcmVhY2hpbmcgUmVhY3Qgc28gd2UgaGF2ZSB0byBzaW11bGF0ZSBhIGNsaWNrLlxuXHRcdCRzZWxlY3QuY2hhbmdlKCgpID0+IFJlYWN0LmFkZG9ucy5UZXN0VXRpbHMuU2ltdWxhdGUuY2xpY2soJHNlbGVjdC5maW5kKCc6c2VsZWN0ZWQnKVswXSkpO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImdhbGxlcnlfX2J1bGsgZmllbGRob2xkZXItc21hbGxcIj5cblx0XHRcdDxzZWxlY3QgY2xhc3NOYW1lPVwiZHJvcGRvd24gbm8tY2hhbmdlLXRyYWNrIG5vLWNoem5cIiB0YWJJbmRleD1cIjBcIiBkYXRhLXBsYWNlaG9sZGVyPXt0aGlzLnByb3BzLnBsYWNlaG9sZGVyfSBzdHlsZT17e3dpZHRoOiAnMTYwcHgnfX0+XG5cdFx0XHRcdDxvcHRpb24gc2VsZWN0ZWQgZGlzYWJsZWQgaGlkZGVuIHZhbHVlPScnPjwvb3B0aW9uPlxuXHRcdFx0XHR7dGhpcy5wcm9wcy5vcHRpb25zLm1hcCgob3B0aW9uLCBpKSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIDxvcHRpb24ga2V5PXtpfSBvbkNsaWNrPXt0aGlzLm9uQ2hhbmdlVmFsdWV9IHZhbHVlPXtvcHRpb24udmFsdWV9PntvcHRpb24ubGFiZWx9PC9vcHRpb24+O1xuXHRcdFx0XHR9KX1cblx0XHRcdDwvc2VsZWN0PlxuXHRcdDwvZGl2Pjtcblx0fVxuXG5cdGdldE9wdGlvbkJ5VmFsdWUodmFsdWUpIHtcblx0XHQvLyBVc2luZyBmb3IgbG9vcCBjb3MgSUUxMCBkb2Vzbid0IGhhbmRsZSAnZm9yIG9mJyxcblx0XHQvLyB3aGljaCBnZXRzIHRyYW5zY29tcGlsZWQgaW50byBhIGZ1bmN0aW9uIHdoaWNoIHVzZXMgU3ltYm9sLFxuXHRcdC8vIHRoZSB0aGluZyBJRTEwIGRpZXMgb24uXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnByb3BzLm9wdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh0aGlzLnByb3BzLm9wdGlvbnNbaV0udmFsdWUgPT09IHZhbHVlKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnByb3BzLm9wdGlvbnNbaV07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRhcHBseUFjdGlvbih2YWx1ZSkge1xuXHRcdC8vIFdlIG9ubHkgaGF2ZSAnZGVsZXRlJyByaWdodCBub3cuLi5cblx0XHRzd2l0Y2ggKHZhbHVlKSB7XG5cdFx0XHRjYXNlICdkZWxldGUnOlxuXHRcdFx0XHR0aGlzLnByb3BzLmJhY2tlbmQuZGVsZXRlKHRoaXMucHJvcHMuZ2V0U2VsZWN0ZWRGaWxlcygpKTtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRvbkNoYW5nZVZhbHVlKGV2ZW50KSB7XG5cdFx0dmFyIG9wdGlvbiA9IHRoaXMuZ2V0T3B0aW9uQnlWYWx1ZShldmVudC50YXJnZXQudmFsdWUpO1xuXG5cdFx0Ly8gTWFrZSBzdXJlIGEgdmFsaWQgb3B0aW9uIGhhcyBiZWVuIHNlbGVjdGVkLlxuXHRcdGlmIChvcHRpb24gPT09IG51bGwpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHZhbHVlOiBvcHRpb24udmFsdWUgfSk7XG5cblx0XHRpZiAob3B0aW9uLmRlc3RydWN0aXZlID09PSB0cnVlKSB7XG5cdFx0XHRpZiAoY29uZmlybShzcy5pMThuLnNwcmludGYoc3MuaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuQlVMS19BQ1RJT05TX0NPTkZJUk0nKSwgb3B0aW9uLmxhYmVsKSkpIHtcblx0XHRcdFx0dGhpcy5hcHBseUFjdGlvbihvcHRpb24udmFsdWUpO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmFwcGx5QWN0aW9uKG9wdGlvbi52YWx1ZSk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVzZXQgdGhlIGRyb3Bkb3duIHRvIGl0J3MgcGxhY2Vob2xkZXIgdmFsdWUuXG5cdFx0JChSZWFjdC5maW5kRE9NTm9kZSh0aGlzKSkuZmluZCgnLmRyb3Bkb3duJykudmFsKCcnKS50cmlnZ2VyKCdsaXN6dDp1cGRhdGVkJyk7XG5cdH1cbn07XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnLi9iYXNlLWNvbXBvbmVudCc7XG5cbmNsYXNzIEVkaXRvckNvbXBvbmVudCBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcykge1xuXHRcdHN1cGVyKHByb3BzKTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHQndGl0bGUnOiB0aGlzLnByb3BzLmZpbGUudGl0bGUsXG5cdFx0XHQnYmFzZW5hbWUnOiB0aGlzLnByb3BzLmZpbGUuYmFzZW5hbWVcblx0XHR9O1xuXG5cdFx0dGhpcy5maWVsZHMgPSBbXG5cdFx0XHR7XG5cdFx0XHRcdCdsYWJlbCc6ICdUaXRsZScsXG5cdFx0XHRcdCduYW1lJzogJ3RpdGxlJyxcblx0XHRcdFx0J3ZhbHVlJzogdGhpcy5wcm9wcy5maWxlLnRpdGxlLFxuXHRcdFx0XHQnb25DaGFuZ2UnOiAoZXZlbnQpID0+IHRoaXMub25GaWVsZENoYW5nZSgndGl0bGUnLCBldmVudClcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdsYWJlbCc6ICdGaWxlbmFtZScsXG5cdFx0XHRcdCduYW1lJzogJ2Jhc2VuYW1lJyxcblx0XHRcdFx0J3ZhbHVlJzogdGhpcy5wcm9wcy5maWxlLmJhc2VuYW1lLFxuXHRcdFx0XHQnb25DaGFuZ2UnOiAoZXZlbnQpID0+IHRoaXMub25GaWVsZENoYW5nZSgnYmFzZW5hbWUnLCBldmVudClcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0dGhpcy5iaW5kKCdvbkZpZWxkQ2hhbmdlJywgJ29uRmlsZVNhdmUnLCAnb25DYW5jZWwnKTtcblx0fVxuXG5cdG9uRmllbGRDaGFuZ2UobmFtZSwgZXZlbnQpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFtuYW1lXTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkZpbGVTYXZlKGV2ZW50KSB7XG5cdFx0dGhpcy5wcm9wcy5vbkZpbGVTYXZlKHRoaXMucHJvcHMuZmlsZS5pZCwgdGhpcy5zdGF0ZSwgZXZlbnQpO1xuXHR9XG5cblx0b25DYW5jZWwoZXZlbnQpIHtcblx0XHR0aGlzLnByb3BzLm9uQ2FuY2VsKGV2ZW50KTtcblx0fVxuXG5cdHJlbmRlcigpIHtcblx0XHRyZXR1cm4gPGRpdiBjbGFzc05hbWU9J2VkaXRvcic+XG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nQ29tcG9zaXRlRmllbGQgY29tcG9zaXRlIGNtcy1maWxlLWluZm8gbm9sYWJlbCc+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdDb21wb3NpdGVGaWVsZCBjb21wb3NpdGUgY21zLWZpbGUtaW5mby1wcmV2aWV3IG5vbGFiZWwnPlxuXHRcdFx0XHRcdDxpbWcgY2xhc3NOYW1lPSd0aHVtYm5haWwtcHJldmlldycgc3JjPXt0aGlzLnByb3BzLmZpbGUudXJsfSAvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBjbXMtZmlsZS1pbmZvLWRhdGEgbm9sYWJlbCc+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J0NvbXBvc2l0ZUZpZWxkIGNvbXBvc2l0ZSBub2xhYmVsJz5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdmaWVsZCByZWFkb25seSc+XG5cdFx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPntpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5UWVBFJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdtaWRkbGVDb2x1bW4nPlxuXHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT0ncmVhZG9ubHknPnt0aGlzLnByb3BzLmZpbGUudHlwZX08L3NwYW4+XG5cdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIHJlYWRvbmx5Jz5cblx0XHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnPntpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5TSVpFJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuZmlsZS5zaXplfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdmaWVsZCByZWFkb25seSc+XG5cdFx0XHRcdFx0XHQ8bGFiZWwgY2xhc3NOYW1lPSdsZWZ0Jz57aTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuVVJMJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+XG5cdFx0XHRcdFx0XHRcdFx0PGEgaHJlZj17dGhpcy5wcm9wcy5maWxlLnVybH0gdGFyZ2V0PSdfYmxhbmsnPnt0aGlzLnByb3BzLmZpbGUudXJsfTwvYT5cblx0XHRcdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIGRhdGVfZGlzYWJsZWQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkNSRUFURUQnKX06PC9sYWJlbD5cblx0XHRcdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdtaWRkbGVDb2x1bW4nPlxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9J3JlYWRvbmx5Jz57dGhpcy5wcm9wcy5maWxlLmNyZWF0ZWR9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J2ZpZWxkIGRhdGVfZGlzYWJsZWQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkxBU1RFRElUJyl9OjwvbGFiZWw+XG5cdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3NOYW1lPSdyZWFkb25seSc+e3RoaXMucHJvcHMuZmlsZS5sYXN0VXBkYXRlZH08L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nZmllbGQgcmVhZG9ubHknPlxuXHRcdFx0XHRcdFx0PGxhYmVsIGNsYXNzTmFtZT0nbGVmdCc+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkRJTScpfTo8L2xhYmVsPlxuXHRcdFx0XHRcdFx0PGRpdiBjbGFzc05hbWU9J21pZGRsZUNvbHVtbic+XG5cdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT0ncmVhZG9ubHknPnt0aGlzLnByb3BzLmZpbGUuYXR0cmlidXRlcy5kaW1lbnNpb25zLndpZHRofSB4IHt0aGlzLnByb3BzLmZpbGUuYXR0cmlidXRlcy5kaW1lbnNpb25zLmhlaWdodH1weDwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0e3RoaXMuZmllbGRzLm1hcCgoZmllbGQsIGkpID0+IHtcblx0XHRcdFx0cmV0dXJuIDxkaXYgY2xhc3NOYW1lPSdmaWVsZCB0ZXh0JyBrZXk9e2l9PlxuXHRcdFx0XHRcdDxsYWJlbCBjbGFzc05hbWU9J2xlZnQnIGh0bWxGb3I9eydnYWxsZXJ5XycgKyBmaWVsZC5uYW1lfT57ZmllbGQubGFiZWx9PC9sYWJlbD5cblx0XHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT0nbWlkZGxlQ29sdW1uJz5cblx0XHRcdFx0XHRcdDxpbnB1dCBpZD17J2dhbGxlcnlfJyArIGZpZWxkLm5hbWV9IGNsYXNzTmFtZT1cInRleHRcIiB0eXBlPSd0ZXh0JyBvbkNoYW5nZT17ZmllbGQub25DaGFuZ2V9IHZhbHVlPXt0aGlzLnN0YXRlW2ZpZWxkLm5hbWVdfSAvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdH0pfVxuXHRcdFx0PGRpdj5cblx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdHR5cGU9J3N1Ym1pdCdcblx0XHRcdFx0XHRjbGFzc05hbWU9XCJzcy11aS1idXR0b24gdWktYnV0dG9uIHVpLXdpZGdldCB1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGwgZm9udC1pY29uLWNoZWNrLW1hcmtcIlxuXHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlU2F2ZX0+XG5cdFx0XHRcdFx0e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLlNBVkUnKX1cblx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHR0eXBlPSdidXR0b24nXG5cdFx0XHRcdFx0Y2xhc3NOYW1lPVwic3MtdWktYnV0dG9uIHVpLWJ1dHRvbiB1aS13aWRnZXQgdWktc3RhdGUtZGVmYXVsdCB1aS1jb3JuZXItYWxsIGZvbnQtaWNvbi1jYW5jZWwtY2lyY2xlZFwiXG5cdFx0XHRcdFx0b25DbGljaz17dGhpcy5vbkNhbmNlbH0+XG5cdFx0XHRcdFx0e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkNBTkNFTCcpfVxuXHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2Pjtcblx0fVxufVxuXG5FZGl0b3JDb21wb25lbnQucHJvcFR5cGVzID0ge1xuXHQnZmlsZSc6IFJlYWN0LlByb3BUeXBlcy5zaGFwZSh7XG5cdFx0J2lkJzogUmVhY3QuUHJvcFR5cGVzLm51bWJlcixcblx0XHQndGl0bGUnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdiYXNlbmFtZSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0J3VybCc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdFx0J3NpemUnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdjcmVhdGVkJzogUmVhY3QuUHJvcFR5cGVzLnN0cmluZyxcblx0XHQnbGFzdFVwZGF0ZWQnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHRcdCdkaW1lbnNpb25zJzogUmVhY3QuUHJvcFR5cGVzLnNoYXBlKHtcblx0XHRcdCd3aWR0aCc6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG5cdFx0XHQnaGVpZ2h0JzogUmVhY3QuUHJvcFR5cGVzLm51bWJlclxuXHRcdH0pXG5cdH0pLFxuXHQnb25GaWxlU2F2ZSc6IFJlYWN0LlByb3BUeXBlcy5mdW5jLFxuXHQnb25DYW5jZWwnOlJlYWN0LlByb3BUeXBlcy5mdW5jXG59O1xuXG5leHBvcnQgZGVmYXVsdCBFZGl0b3JDb21wb25lbnQ7XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IGNvbnN0YW50cyBmcm9tICcuLi9jb25zdGFudHMnO1xuaW1wb3J0IEJhc2VDb21wb25lbnQgZnJvbSAnLi9iYXNlLWNvbXBvbmVudCc7XG5cbmNsYXNzIEZpbGVDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0J2ZvY3Vzc2VkJzogZmFsc2Vcblx0XHR9O1xuXG5cdFx0dGhpcy5iaW5kKFxuXHRcdFx0J29uRmlsZU5hdmlnYXRlJyxcblx0XHRcdCdvbkZpbGVFZGl0Jyxcblx0XHRcdCdvbkZpbGVEZWxldGUnLFxuXHRcdFx0J29uRmlsZVNlbGVjdCcsXG5cdFx0XHQnaGFuZGxlRG91YmxlQ2xpY2snLFxuXHRcdFx0J2hhbmRsZUtleURvd24nLFxuXHRcdFx0J2hhbmRsZUZvY3VzJyxcblx0XHRcdCdoYW5kbGVCbHVyJyxcblx0XHRcdCdvbkZpbGVTZWxlY3QnXG5cdFx0KTtcblx0fVxuXG5cdGhhbmRsZURvdWJsZUNsaWNrKGV2ZW50KSB7XG5cdFx0aWYgKGV2ZW50LnRhcmdldCAhPT0gdGhpcy5yZWZzLnRpdGxlLmdldERPTU5vZGUoKSAmJiBldmVudC50YXJnZXQgIT09IHRoaXMucmVmcy50aHVtYm5haWwuZ2V0RE9NTm9kZSgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkZpbGVOYXZpZ2F0ZShldmVudCk7XG5cdH1cblxuXHRvbkZpbGVOYXZpZ2F0ZShldmVudCkge1xuXHRcdGlmICh0aGlzLmlzRm9sZGVyKCkpIHtcblx0XHRcdHRoaXMucHJvcHMub25GaWxlTmF2aWdhdGUodGhpcy5wcm9wcywgZXZlbnQpXG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5vbkZpbGVFZGl0KGV2ZW50KTtcblx0fVxuXG5cdG9uRmlsZVNlbGVjdChldmVudCkge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvL3N0b3AgdHJpZ2dlcmluZyBjbGljayBvbiByb290IGVsZW1lbnRcblx0XHR0aGlzLnByb3BzLm9uRmlsZVNlbGVjdCh0aGlzLnByb3BzLCBldmVudCk7XG5cdH1cblxuXHRvbkZpbGVFZGl0KGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7IC8vc3RvcCB0cmlnZ2VyaW5nIGNsaWNrIG9uIHJvb3QgZWxlbWVudFxuXHRcdHRoaXMucHJvcHMub25GaWxlRWRpdCh0aGlzLnByb3BzLCBldmVudCk7XG5cdH1cblxuXHRvbkZpbGVEZWxldGUoZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy9zdG9wIHRyaWdnZXJpbmcgY2xpY2sgb24gcm9vdCBlbGVtZW50XG5cdFx0dGhpcy5wcm9wcy5vbkZpbGVEZWxldGUodGhpcy5wcm9wcywgZXZlbnQpXG5cdH1cblxuXHRpc0ZvbGRlcigpIHtcblx0XHRyZXR1cm4gdGhpcy5wcm9wcy5jYXRlZ29yeSA9PT0gJ2ZvbGRlcic7XG5cdH1cblxuXHRnZXRUaHVtYm5haWxTdHlsZXMoKSB7XG5cdFx0aWYgKHRoaXMucHJvcHMuY2F0ZWdvcnkgPT09ICdpbWFnZScpIHtcblx0XHRcdHJldHVybiB7J2JhY2tncm91bmRJbWFnZSc6ICd1cmwoJyArIHRoaXMucHJvcHMudXJsICsgJyknfTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge307XG5cdH1cblxuXHRnZXRUaHVtYm5haWxDbGFzc05hbWVzKCkge1xuXHRcdHZhciB0aHVtYm5haWxDbGFzc05hbWVzID0gJ2l0ZW1fX3RodW1ibmFpbCc7XG5cblx0XHRpZiAodGhpcy5pc0ltYWdlTGFyZ2VyVGhhblRodW1ibmFpbCgpKSB7XG5cdFx0XHR0aHVtYm5haWxDbGFzc05hbWVzICs9ICcgbGFyZ2UnO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aHVtYm5haWxDbGFzc05hbWVzO1xuXHR9XG5cblx0Z2V0SXRlbUNsYXNzTmFtZXMoKSB7XG5cdFx0dmFyIGl0ZW1DbGFzc05hbWVzID0gJ2l0ZW0gJyArIHRoaXMucHJvcHMuY2F0ZWdvcnk7XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5mb2N1c3NlZCkge1xuXHRcdFx0aXRlbUNsYXNzTmFtZXMgKz0gJyBmb2N1c3NlZCc7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucHJvcHMuc2VsZWN0ZWQpIHtcblx0XHRcdGl0ZW1DbGFzc05hbWVzICs9ICcgc2VsZWN0ZWQnO1xuXHRcdH1cblxuXHRcdHJldHVybiBpdGVtQ2xhc3NOYW1lcztcblx0fVxuXG5cdGlzSW1hZ2VMYXJnZXJUaGFuVGh1bWJuYWlsKCkge1xuXHRcdGxldCBkaW1lbnNpb25zID0gdGhpcy5wcm9wcy5hdHRyaWJ1dGVzLmRpbWVuc2lvbnM7XG5cblx0XHRyZXR1cm4gZGltZW5zaW9ucy5oZWlnaHQgPiBjb25zdGFudHMuVEhVTUJOQUlMX0hFSUdIVCB8fCBkaW1lbnNpb25zLndpZHRoID4gY29uc3RhbnRzLlRIVU1CTkFJTF9XSURUSDtcblx0fVxuXG5cdGhhbmRsZUtleURvd24oZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHRcdC8vaWYgZXZlbnQgZG9lc24ndCBjb21lIGZyb20gdGhlIHJvb3QgZWxlbWVudCwgZG8gbm90aGluZ1xuXHRcdGlmIChldmVudC50YXJnZXQgIT09IFJlYWN0LmZpbmRET01Ob2RlKHRoaXMpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Ly9JZiBzcGFjZSBvciBlbnRlciBpcyBwcmVzc2VkXG5cdFx0aWYgKHRoaXMucHJvcHMuc2VsZWN0S2V5cy5pbmRleE9mKGV2ZW50LmtleUNvZGUpID4gLTEpIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vU3RvcCBwYWdlIGZyb20gc2Nyb2xsaW5nIHdoZW4gc3BhY2UgaXMgY2xpY2tlZFxuXHRcdFx0dGhpcy5vbkZpbGVOYXZpZ2F0ZSgpO1xuXHRcdH1cblx0fVxuXG5cdGhhbmRsZUZvY3VzKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2ZvY3Vzc2VkJzogdHJ1ZVxuXHRcdH0pXG5cdH1cblxuXHRoYW5kbGVCbHVyKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2ZvY3Vzc2VkJzogZmFsc2Vcblx0XHR9KVxuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdHJldHVybiA8ZGl2IGNsYXNzTmFtZT17dGhpcy5nZXRJdGVtQ2xhc3NOYW1lcygpfSBkYXRhLWlkPXt0aGlzLnByb3BzLmlkfSB0YWJJbmRleD1cIjBcIiBvbktleURvd249e3RoaXMuaGFuZGxlS2V5RG93bn0gb25Eb3VibGVDbGljaz17dGhpcy5oYW5kbGVEb3VibGVDbGlja30+XG5cdFx0XHQ8ZGl2IHJlZj1cInRodW1ibmFpbFwiIGNsYXNzTmFtZT17dGhpcy5nZXRUaHVtYm5haWxDbGFzc05hbWVzKCl9IHN0eWxlPXt0aGlzLmdldFRodW1ibmFpbFN0eWxlcygpfSBvbkNsaWNrPXt0aGlzLm9uRmlsZVNlbGVjdH0+XG5cdFx0XHRcdDxkaXYgY2xhc3NOYW1lPSdpdGVtX19hY3Rpb25zJz5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU9J2l0ZW1fX2FjdGlvbnNfX2FjdGlvbiBpdGVtX19hY3Rpb25zX19hY3Rpb24tLXNlbGVjdCBbIGZvbnQtaWNvbi10aWNrIF0nXG5cdFx0XHRcdFx0XHR0eXBlPSdidXR0b24nXG5cdFx0XHRcdFx0XHR0aXRsZT17aTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuU0VMRUNUJyl9XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXt0aGlzLm9uRmlsZVNlbGVjdH1cblx0XHRcdFx0XHRcdG9uRm9jdXM9e3RoaXMuaGFuZGxlRm9jdXN9XG5cdFx0XHRcdFx0XHRvbkJsdXI9e3RoaXMuaGFuZGxlQmx1cn0+XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0Y2xhc3NOYW1lPSdpdGVtX19hY3Rpb25zX19hY3Rpb24gaXRlbV9fYWN0aW9uc19fYWN0aW9uLS1yZW1vdmUgWyBmb250LWljb24tdHJhc2ggXSdcblx0XHRcdFx0XHRcdHR5cGU9J2J1dHRvbidcblx0XHRcdFx0XHRcdHRpdGxlPXtpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5ERUxFVEUnKX1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlRGVsZXRlfVxuXHRcdFx0XHRcdFx0b25Gb2N1cz17dGhpcy5oYW5kbGVGb2N1c31cblx0XHRcdFx0XHRcdG9uQmx1cj17dGhpcy5oYW5kbGVCbHVyfT5cblx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRjbGFzc05hbWU9J2l0ZW1fX2FjdGlvbnNfX2FjdGlvbiBpdGVtX19hY3Rpb25zX19hY3Rpb24tLWVkaXQgWyBmb250LWljb24tZWRpdCBdJ1xuXHRcdFx0XHRcdFx0dHlwZT0nYnV0dG9uJ1xuXHRcdFx0XHRcdFx0dGl0bGU9e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkVESVQnKX1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25GaWxlRWRpdH1cblx0XHRcdFx0XHRcdG9uRm9jdXM9e3RoaXMuaGFuZGxlRm9jdXN9XG5cdFx0XHRcdFx0XHRvbkJsdXI9e3RoaXMuaGFuZGxlQmx1cn0+XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8cCBjbGFzc05hbWU9J2l0ZW1fX3RpdGxlJyByZWY9XCJ0aXRsZVwiPnt0aGlzLnByb3BzLnRpdGxlfTwvcD5cblx0XHQ8L2Rpdj47XG5cdH1cbn1cblxuRmlsZUNvbXBvbmVudC5wcm9wVHlwZXMgPSB7XG5cdCdpZCc6IFJlYWN0LlByb3BUeXBlcy5udW1iZXIsXG5cdCd0aXRsZSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdCdjYXRlZ29yeSc6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsXG5cdCd1cmwnOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLFxuXHQnZGltZW5zaW9ucyc6IFJlYWN0LlByb3BUeXBlcy5zaGFwZSh7XG5cdFx0J3dpZHRoJzogUmVhY3QuUHJvcFR5cGVzLm51bWJlcixcblx0XHQnaGVpZ2h0JzogUmVhY3QuUHJvcFR5cGVzLm51bWJlclxuXHR9KSxcblx0J29uRmlsZU5hdmlnYXRlJzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdCdvbkZpbGVFZGl0JzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsXG5cdCdvbkZpbGVEZWxldGUnOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0J3NlbGVjdEtleXMnOiBSZWFjdC5Qcm9wVHlwZXMuYXJyYXksXG5cdCdvbkZpbGVTZWxlY3QnOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYyxcblx0J3NlbGVjdGVkJzogUmVhY3QuUHJvcFR5cGVzLmJvb2xcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEZpbGVDb21wb25lbnQ7XG4iLCJpbXBvcnQgJCBmcm9tICdqcXVlcnknO1xuaW1wb3J0IGkxOG4gZnJvbSAnaTE4bic7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEZpbGVDb21wb25lbnQgZnJvbSAnLi9maWxlLWNvbXBvbmVudCc7XG5pbXBvcnQgRWRpdG9yQ29tcG9uZW50IGZyb20gJy4vZWRpdG9yLWNvbXBvbmVudCc7XG5pbXBvcnQgQnVsa0FjdGlvbnNDb21wb25lbnQgZnJvbSAnLi9idWxrLWFjdGlvbnMtY29tcG9uZW50JztcbmltcG9ydCBCYXNlQ29tcG9uZW50IGZyb20gJy4vYmFzZS1jb21wb25lbnQnO1xuaW1wb3J0IENPTlNUQU5UUyBmcm9tICcuLi9jb25zdGFudHMnO1xuXG5mdW5jdGlvbiBnZXRDb21wYXJhdG9yKGZpZWxkLCBkaXJlY3Rpb24pIHtcblx0cmV0dXJuIChhLCBiKSA9PiB7XG5cdFx0aWYgKGRpcmVjdGlvbiA9PT0gJ2FzYycpIHtcblx0XHRcdGlmIChhW2ZpZWxkXSA8IGJbZmllbGRdKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFbZmllbGRdID4gYltmaWVsZF0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmIChhW2ZpZWxkXSA+IGJbZmllbGRdKSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGFbZmllbGRdIDwgYltmaWVsZF0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH07XG59XG5cbmZ1bmN0aW9uIGdldFNvcnQoZmllbGQsIGRpcmVjdGlvbikge1xuXHRsZXQgY29tcGFyYXRvciA9IGdldENvbXBhcmF0b3IoZmllbGQsIGRpcmVjdGlvbik7XG5cblx0cmV0dXJuICgpID0+IHtcblx0XHRsZXQgZm9sZGVycyA9IHRoaXMuc3RhdGUuZmlsZXMuZmlsdGVyKGZpbGUgPT4gZmlsZS50eXBlID09PSAnZm9sZGVyJyk7XG5cdFx0bGV0IGZpbGVzID0gdGhpcy5zdGF0ZS5maWxlcy5maWx0ZXIoZmlsZSA9PiBmaWxlLnR5cGUgIT09ICdmb2xkZXInKTtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2ZpbGVzJzogZm9sZGVycy5zb3J0KGNvbXBhcmF0b3IpLmNvbmNhdChmaWxlcy5zb3J0KGNvbXBhcmF0b3IpKVxuXHRcdH0pO1xuXHR9XG59XG5cbmNsYXNzIEdhbGxlcnlDb21wb25lbnQgZXh0ZW5kcyBCYXNlQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMpIHtcblx0XHRzdXBlcihwcm9wcyk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0J2NvdW50JzogMCwgLy8gVGhlIG51bWJlciBvZiBmaWxlcyBpbiB0aGUgY3VycmVudCB2aWV3XG5cdFx0XHQnZmlsZXMnOiBbXSxcblx0XHRcdCdzZWxlY3RlZEZpbGVzJzogW10sXG5cdFx0XHQnZWRpdGluZyc6IG51bGxcblx0XHR9O1xuXG5cdFx0dGhpcy5mb2xkZXJzID0gW3Byb3BzLmluaXRpYWxfZm9sZGVyXTtcblxuXHRcdHRoaXMuc29ydCA9ICduYW1lJztcblx0XHR0aGlzLmRpcmVjdGlvbiA9ICdhc2MnO1xuXG5cdFx0dGhpcy5zb3J0ZXJzID0gW1xuXHRcdFx0e1xuXHRcdFx0XHQnZmllbGQnOiAndGl0bGUnLFxuXHRcdFx0XHQnZGlyZWN0aW9uJzogJ2FzYycsXG5cdFx0XHRcdCdsYWJlbCc6IGkxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkZJTFRFUl9USVRMRV9BU0MnKSxcblx0XHRcdFx0J29uU29ydCc6IGdldFNvcnQuY2FsbCh0aGlzLCAndGl0bGUnLCAnYXNjJylcblx0XHRcdH0sXG5cdFx0XHR7XG5cdFx0XHRcdCdmaWVsZCc6ICd0aXRsZScsXG5cdFx0XHRcdCdkaXJlY3Rpb24nOiAnZGVzYycsXG5cdFx0XHRcdCdsYWJlbCc6IGkxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkZJTFRFUl9USVRMRV9ERVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ3RpdGxlJywgJ2Rlc2MnKVxuXHRcdFx0fSxcblx0XHRcdHtcblx0XHRcdFx0J2ZpZWxkJzogJ2NyZWF0ZWQnLFxuXHRcdFx0XHQnZGlyZWN0aW9uJzogJ2Rlc2MnLFxuXHRcdFx0XHQnbGFiZWwnOiBpMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5GSUxURVJfREFURV9ERVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ2NyZWF0ZWQnLCAnZGVzYycpXG5cdFx0XHR9LFxuXHRcdFx0e1xuXHRcdFx0XHQnZmllbGQnOiAnY3JlYXRlZCcsXG5cdFx0XHRcdCdkaXJlY3Rpb24nOiAnYXNjJyxcblx0XHRcdFx0J2xhYmVsJzogaTE4bi5fdCgnQXNzZXRHYWxsZXJ5RmllbGQuRklMVEVSX0RBVEVfQVNDJyksXG5cdFx0XHRcdCdvblNvcnQnOiBnZXRTb3J0LmNhbGwodGhpcywgJ2NyZWF0ZWQnLCAnYXNjJylcblx0XHRcdH1cblx0XHRdO1xuXG5cdFx0dGhpcy5saXN0ZW5lcnMgPSB7XG5cdFx0XHQnb25TZWFyY2hEYXRhJzogKGRhdGEpID0+IHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0J2NvdW50JzogZGF0YS5jb3VudCxcblx0XHRcdFx0XHQnZmlsZXMnOiBkYXRhLmZpbGVzXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdCdvbk1vcmVEYXRhJzogKGRhdGEpID0+IHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0J2NvdW50JzogZGF0YS5jb3VudCxcblx0XHRcdFx0XHQnZmlsZXMnOiB0aGlzLnN0YXRlLmZpbGVzLmNvbmNhdChkYXRhLmZpbGVzKVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHQnb25OYXZpZ2F0ZURhdGEnOiAoZGF0YSkgPT4ge1xuXHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHQnY291bnQnOiBkYXRhLmNvdW50LFxuXHRcdFx0XHRcdCdmaWxlcyc6IGRhdGEuZmlsZXNcblx0XHRcdFx0fSk7XG5cdFx0XHR9LFxuXHRcdFx0J29uRGVsZXRlRGF0YSc6IChkYXRhKSA9PiB7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdCdjb3VudCc6IHRoaXMuc3RhdGUuY291bnQgLSAxLFxuXHRcdFx0XHRcdCdmaWxlcyc6IHRoaXMuc3RhdGUuZmlsZXMuZmlsdGVyKChmaWxlKSA9PiB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZGF0YSAhPT0gZmlsZS5pZDtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHQnb25TYXZlRGF0YSc6IChpZCwgdmFsdWVzKSA9PiB7XG5cdFx0XHRcdGxldCBmaWxlcyA9IHRoaXMuc3RhdGUuZmlsZXM7XG5cblx0XHRcdFx0ZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuXHRcdFx0XHRcdGlmIChmaWxlLmlkID09IGlkKSB7XG5cdFx0XHRcdFx0XHRmaWxlLnRpdGxlID0gdmFsdWVzLnRpdGxlO1xuXHRcdFx0XHRcdFx0ZmlsZS5iYXNlbmFtZSA9IHZhbHVlcy5iYXNlbmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdCdmaWxlcyc6IGZpbGVzLFxuXHRcdFx0XHRcdCdlZGl0aW5nJzogbnVsbFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0dGhpcy5iaW5kKFxuXHRcdFx0J29uRmlsZVNhdmUnLFxuXHRcdFx0J29uRmlsZU5hdmlnYXRlJyxcblx0XHRcdCdvbkZpbGVTZWxlY3QnLFxuXHRcdFx0J29uRmlsZUVkaXQnLFxuXHRcdFx0J29uRmlsZURlbGV0ZScsXG5cdFx0XHQnb25CYWNrQ2xpY2snLFxuXHRcdFx0J29uTW9yZUNsaWNrJyxcblx0XHRcdCdvbk5hdmlnYXRlJyxcblx0XHRcdCdvbkNhbmNlbCcsXG5cdFx0XHQnZ2V0U2VsZWN0ZWRGaWxlcydcblx0XHQpO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0c3VwZXIuY29tcG9uZW50RGlkTW91bnQoKTtcblxuXHRcdGZvciAobGV0IGV2ZW50IGluIHRoaXMubGlzdGVuZXJzKSB7XG5cdFx0XHR0aGlzLnByb3BzLmJhY2tlbmQub24oZXZlbnQsIHRoaXMubGlzdGVuZXJzW2V2ZW50XSk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucHJvcHMuaW5pdGlhbF9mb2xkZXIgIT09IHRoaXMucHJvcHMuY3VycmVudF9mb2xkZXIpIHtcblx0XHRcdHRoaXMub25OYXZpZ2F0ZSh0aGlzLnByb3BzLmN1cnJlbnRfZm9sZGVyKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5wcm9wcy5iYWNrZW5kLnNlYXJjaCgpO1xuXHRcdH1cblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHN1cGVyLmNvbXBvbmVudFdpbGxVbm1vdW50KCk7XG5cblx0XHRmb3IgKGxldCBldmVudCBpbiB0aGlzLmxpc3RlbmVycykge1xuXHRcdFx0dGhpcy5wcm9wcy5iYWNrZW5kLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCB0aGlzLmxpc3RlbmVyc1tldmVudF0pO1xuXHRcdH1cblx0fVxuXG5cdGNvbXBvbmVudERpZFVwZGF0ZSgpIHtcblx0XHR2YXIgJHNlbGVjdCA9ICQoUmVhY3QuZmluZERPTU5vZGUodGhpcykpLmZpbmQoJy5nYWxsZXJ5X19zb3J0IC5kcm9wZG93bicpO1xuXG5cdFx0Ly8gV2Ugb3B0LW91dCBvZiBsZXR0aW5nIHRoZSBDTVMgaGFuZGxlIENob3NlbiBiZWNhdXNlIGl0IGRvZXNuJ3QgcmUtYXBwbHkgdGhlIGJlaGF2aW91ciBjb3JyZWN0bHkuXG5cdFx0Ly8gU28gYWZ0ZXIgdGhlIGdhbGxlcnkgaGFzIGJlZW4gcmVuZGVyZWQgd2UgYXBwbHkgQ2hvc2VuLlxuXHRcdCRzZWxlY3QuY2hvc2VuKHtcblx0XHRcdCdhbGxvd19zaW5nbGVfZGVzZWxlY3QnOiB0cnVlLFxuXHRcdFx0J2Rpc2FibGVfc2VhcmNoX3RocmVzaG9sZCc6IDIwXG5cdFx0fSk7XG5cblx0XHQvLyBDaG9zZW4gc3RvcHMgdGhlIGNoYW5nZSBldmVudCBmcm9tIHJlYWNoaW5nIFJlYWN0IHNvIHdlIGhhdmUgdG8gc2ltdWxhdGUgYSBjbGljay5cblx0XHQkc2VsZWN0LmNoYW5nZSgoKSA9PiBSZWFjdC5hZGRvbnMuVGVzdFV0aWxzLlNpbXVsYXRlLmNsaWNrKCRzZWxlY3QuZmluZCgnOnNlbGVjdGVkJylbMF0pKTtcblx0fVxuXG5cdGdldEZpbGVCeUlkKGlkKSB7XG5cdFx0dmFyIGZvbGRlciA9IG51bGwsXG5cdFx0XHRpZEludCA9IHBhcnNlSW50KGlkLCAxMCk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhdGUuZmlsZXMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh0aGlzLnN0YXRlLmZpbGVzW2ldLmlkID09PSBpZEludCkge1xuXHRcdFx0XHRmb2xkZXIgPSB0aGlzLnN0YXRlLmZpbGVzW2ldO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gZm9sZGVyO1xuXHR9XG5cblx0Z2V0QmFja0J1dHRvbigpIHtcblx0XHRpZiAodGhpcy5mb2xkZXJzLmxlbmd0aCA+IDEpIHtcblx0XHRcdHJldHVybiA8YnV0dG9uXG5cdFx0XHRcdGNsYXNzTmFtZT0nZ2FsbGVyeV9fYmFjayBzcy11aS1idXR0b24gdWktYnV0dG9uIHVpLXdpZGdldCB1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGwgZm9udC1pY29uLWxldmVsLXVwIG5vLXRleHQnXG5cdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25CYWNrQ2xpY2t9XG5cdFx0XHRcdHJlZj1cImJhY2tCdXR0b25cIj48L2J1dHRvbj47XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRnZXRCdWxrQWN0aW9uc0NvbXBvbmVudCgpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5zZWxlY3RlZEZpbGVzLmxlbmd0aCA+IDAgJiYgdGhpcy5wcm9wcy5iYWNrZW5kLmJ1bGtBY3Rpb25zKSB7XG5cdFx0XHRyZXR1cm4gPEJ1bGtBY3Rpb25zQ29tcG9uZW50XG5cdFx0XHRcdG9wdGlvbnM9e0NPTlNUQU5UUy5CVUxLX0FDVElPTlN9XG5cdFx0XHRcdHBsYWNlaG9sZGVyPXtzcy5pMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5CVUxLX0FDVElPTlNfUExBQ0VIT0xERVInKX1cblx0XHRcdFx0YmFja2VuZD17dGhpcy5wcm9wcy5iYWNrZW5kfVxuXHRcdFx0XHRnZXRTZWxlY3RlZEZpbGVzPXt0aGlzLmdldFNlbGVjdGVkRmlsZXN9IC8+O1xuXHRcdH1cblxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Z2V0TW9yZUJ1dHRvbigpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5jb3VudCA+IHRoaXMuc3RhdGUuZmlsZXMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gPGJ1dHRvblxuXHRcdFx0XHRjbGFzc05hbWU9XCJnYWxsZXJ5X19sb2FkX19tb3JlXCJcblx0XHRcdFx0b25DbGljaz17dGhpcy5vbk1vcmVDbGlja30+e2kxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkxPQURNT1JFJyl9PC9idXR0b24+O1xuXHRcdH1cblxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Z2V0U2VsZWN0ZWRGaWxlcygpIHtcblx0XHRyZXR1cm4gdGhpcy5zdGF0ZS5zZWxlY3RlZEZpbGVzO1xuXHR9XG5cblx0cmVuZGVyKCkge1xuXHRcdGlmICh0aGlzLnN0YXRlLmVkaXRpbmcgIT09IG51bGwpIHtcblx0XHRcdHJldHVybiA8ZGl2IGNsYXNzTmFtZT0nZ2FsbGVyeSc+XG5cdFx0XHRcdDxFZGl0b3JDb21wb25lbnRcblx0XHRcdFx0XHRmaWxlPXt0aGlzLnN0YXRlLmVkaXRpbmd9XG5cdFx0XHRcdFx0b25GaWxlU2F2ZT17dGhpcy5vbkZpbGVTYXZlfVxuXHRcdFx0XHRcdG9uQ2FuY2VsPXt0aGlzLm9uQ2FuY2VsfSAvPlxuXHRcdFx0PC9kaXY+O1xuXHRcdH1cblxuXHRcdHJldHVybiA8ZGl2IGNsYXNzTmFtZT0nZ2FsbGVyeSc+XG5cdFx0XHR7dGhpcy5nZXRCYWNrQnV0dG9uKCl9XG5cdFx0XHR7dGhpcy5nZXRCdWxrQWN0aW9uc0NvbXBvbmVudCgpfVxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJnYWxsZXJ5X19zb3J0IGZpZWxkaG9sZGVyLXNtYWxsXCI+XG5cdFx0XHRcdDxzZWxlY3QgY2xhc3NOYW1lPVwiZHJvcGRvd24gbm8tY2hhbmdlLXRyYWNrIG5vLWNoem5cIiB0YWJJbmRleD1cIjBcIiBzdHlsZT17e3dpZHRoOiAnMTYwcHgnfX0+XG5cdFx0XHRcdFx0e3RoaXMuc29ydGVycy5tYXAoKHNvcnRlciwgaSkgPT4ge1xuXHRcdFx0XHRcdFx0cmV0dXJuIDxvcHRpb24ga2V5PXtpfSBvbkNsaWNrPXtzb3J0ZXIub25Tb3J0fT57c29ydGVyLmxhYmVsfTwvb3B0aW9uPjtcblx0XHRcdFx0XHR9KX1cblx0XHRcdFx0PC9zZWxlY3Q+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3NOYW1lPSdnYWxsZXJ5X19pdGVtcyc+XG5cdFx0XHRcdHt0aGlzLnN0YXRlLmZpbGVzLm1hcCgoZmlsZSwgaSkgPT4ge1xuXHRcdFx0XHRcdHJldHVybiA8RmlsZUNvbXBvbmVudCBrZXk9e2l9IHsuLi5maWxlfVxuXHRcdFx0XHRcdFx0b25GaWxlU2VsZWN0PXt0aGlzLm9uRmlsZVNlbGVjdH1cblx0XHRcdFx0XHRcdHNlbGVjdEtleXM9e0NPTlNUQU5UUy5GSUxFX1NFTEVDVF9LRVlTfVxuXHRcdFx0XHRcdFx0b25GaWxlU2VsZWN0PXt0aGlzLm9uRmlsZVNlbGVjdH1cblx0XHRcdFx0XHRcdHNlbGVjdEtleXM9e0NPTlNUQU5UUy5GSUxFX1NFTEVDVF9LRVlTfVxuXHRcdFx0XHRcdFx0b25GaWxlRGVsZXRlPXt0aGlzLm9uRmlsZURlbGV0ZX1cblx0XHRcdFx0XHRcdG9uRmlsZUVkaXQ9e3RoaXMub25GaWxlRWRpdH1cblx0XHRcdFx0XHRcdG9uRmlsZU5hdmlnYXRlPXt0aGlzLm9uRmlsZU5hdmlnYXRlfVxuXHRcdFx0XHRcdFx0c2VsZWN0ZWQ9e3RoaXMuc3RhdGUuc2VsZWN0ZWRGaWxlcy5pbmRleE9mKGZpbGUuaWQpID4gLTF9IC8+O1xuXHRcdFx0XHR9KX1cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJnYWxsZXJ5X19sb2FkXCI+XG5cdFx0XHRcdHt0aGlzLmdldE1vcmVCdXR0b24oKX1cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2Pjtcblx0fVxuXG5cdG9uQ2FuY2VsKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J2VkaXRpbmcnOiBudWxsXG5cdFx0fSk7XG5cblx0XHR0aGlzLmVtaXRFeGl0RmlsZVZpZXdDbXNFdmVudCgpO1xuXHR9XG5cblx0b25GaWxlU2VsZWN0KGZpbGUsIGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cblx0XHR2YXIgY3VycmVudGx5U2VsZWN0ZWQgPSB0aGlzLnN0YXRlLnNlbGVjdGVkRmlsZXMsXG5cdFx0XHRmaWxlSW5kZXggPSBjdXJyZW50bHlTZWxlY3RlZC5pbmRleE9mKGZpbGUuaWQpO1xuXG5cdFx0aWYgKGZpbGVJbmRleCA+IC0xKSB7XG5cdFx0XHRjdXJyZW50bHlTZWxlY3RlZC5zcGxpY2UoZmlsZUluZGV4LCAxKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y3VycmVudGx5U2VsZWN0ZWQucHVzaChmaWxlLmlkKTtcblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdCdzZWxlY3RlZEZpbGVzJzogY3VycmVudGx5U2VsZWN0ZWRcblx0XHR9KTtcblx0XHRcblx0XHR0aGlzLl9lbWl0Q21zRXZlbnQoJ2Fzc2V0LWdhbGxlcnktZmllbGQuZmlsZS1zZWxlY3QnLCBmaWxlKTtcblx0fVxuXG5cdG9uRmlsZURlbGV0ZShmaWxlLCBldmVudCkge1xuXHRcdGlmIChjb25maXJtKGkxOG4uX3QoJ0Fzc2V0R2FsbGVyeUZpZWxkLkNPTkZJUk1ERUxFVEUnKSkpIHtcblx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5kZWxldGUoZmlsZS5pZCk7XG5cdFx0XHR0aGlzLmVtaXRGaWxlRGVsZXRlZENtc0V2ZW50KCk7XG5cdFx0fVxuXG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdH1cblxuXHRvbkZpbGVFZGl0KGZpbGUsIGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHQnZWRpdGluZyc6IGZpbGVcblx0XHR9KTtcblxuXHRcdHRoaXMuZW1pdEVudGVyRmlsZVZpZXdDbXNFdmVudChmaWxlKTtcblxuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR9XG5cblx0b25GaWxlTmF2aWdhdGUoZmlsZSkge1xuXHRcdHRoaXMuZm9sZGVycy5wdXNoKGZpbGUuZmlsZW5hbWUpO1xuXHRcdHRoaXMucHJvcHMuYmFja2VuZC5uYXZpZ2F0ZShmaWxlLmZpbGVuYW1lKTtcblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J3NlbGVjdGVkRmlsZXMnOiBbXVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5lbWl0Rm9sZGVyQ2hhbmdlZENtc0V2ZW50KCk7XG5cdFx0dGhpcy5zYXZlRm9sZGVyTmFtZUluU2Vzc2lvbigpO1xuXHR9XG5cblx0ZW1pdEZvbGRlckNoYW5nZWRDbXNFdmVudCgpIHtcblx0XHR2YXIgZm9sZGVySWQgPSAwO1xuXG5cdFx0Ly8gVGhlIGN1cnJlbnQgZm9sZGVyIGlzIHN0b3JlZCBieSBpdCdzIG5hbWUgaW4gb3VyIGNvbXBvbmVudC5cblx0XHQvLyBXZSBuZWVkIHRvIGdldCBpdCdzIGlkIGJlY2F1c2UgdGhhdCdzIGhvdyBFbnR3aW5lIGNvbXBvbmVudHMgKEdyaWRGaWVsZCkgcmVmZXJlbmNlIGl0LlxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5zdGF0ZS5maWxlcy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aWYgKHRoaXMuc3RhdGUuZmlsZXNbaV0uZmlsZW5hbWUgPT09IHRoaXMucHJvcHMuYmFja2VuZC5mb2xkZXIpIHtcblx0XHRcdFx0Zm9sZGVySWQgPSB0aGlzLnN0YXRlLmZpbGVzW2ldLmlkO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLl9lbWl0Q21zRXZlbnQoJ2Fzc2V0LWdhbGxlcnktZmllbGQuZm9sZGVyLWNoYW5nZWQnLCBmb2xkZXJJZCk7XG5cdH1cblxuXHRlbWl0RmlsZURlbGV0ZWRDbXNFdmVudCgpIHtcblx0XHR0aGlzLl9lbWl0Q21zRXZlbnQoJ2Fzc2V0LWdhbGxlcnktZmllbGQuZmlsZS1kZWxldGVkJyk7XG5cdH1cblxuXHRlbWl0RW50ZXJGaWxlVmlld0Ntc0V2ZW50KGZpbGUpIHtcblx0XHR2YXIgaWQgPSAwO1xuXG5cdFx0dGhpcy5fZW1pdENtc0V2ZW50KCdhc3NldC1nYWxsZXJ5LWZpZWxkLmVudGVyLWZpbGUtdmlldycsIGZpbGUuaWQpO1xuXHR9XG5cblx0ZW1pdEV4aXRGaWxlVmlld0Ntc0V2ZW50KCkge1xuXHRcdHRoaXMuX2VtaXRDbXNFdmVudCgnYXNzZXQtZ2FsbGVyeS1maWVsZC5leGl0LWZpbGUtdmlldycpO1xuXHR9XG5cblx0c2F2ZUZvbGRlck5hbWVJblNlc3Npb24oKSB7XG5cdFx0aWYgKHRoaXMucHJvcHMuaGFzU2Vzc2lvblN0b3JhZ2UoKSkge1xuXHRcdFx0d2luZG93LnNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJChSZWFjdC5maW5kRE9NTm9kZSh0aGlzKSkuY2xvc2VzdCgnLmFzc2V0LWdhbGxlcnknKVswXS5pZCwgdGhpcy5wcm9wcy5iYWNrZW5kLmZvbGRlcik7XG5cdFx0fVxuXHR9XG5cblx0b25OYXZpZ2F0ZShmb2xkZXIsIHNpbGVudCA9IGZhbHNlKSB7XG5cdFx0dGhpcy5mb2xkZXJzLnB1c2goZm9sZGVyKTtcblx0XHR0aGlzLnByb3BzLmJhY2tlbmQubmF2aWdhdGUoZm9sZGVyKTtcblxuXHRcdGlmICghc2lsZW50KSB7XG5cdFx0XHR0aGlzLmVtaXRGb2xkZXJDaGFuZ2VkQ21zRXZlbnQoKTtcblx0XHR9XG5cblx0XHR0aGlzLnNhdmVGb2xkZXJOYW1lSW5TZXNzaW9uKCk7XG5cdH1cblxuXHRvbk1vcmVDbGljayhldmVudCkge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdFx0dGhpcy5wcm9wcy5iYWNrZW5kLm1vcmUoKTtcblxuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdH1cblxuXHRvbkJhY2tDbGljayhldmVudCkge1xuXHRcdGlmICh0aGlzLmZvbGRlcnMubGVuZ3RoID4gMSkge1xuXHRcdFx0dGhpcy5mb2xkZXJzLnBvcCgpO1xuXHRcdFx0dGhpcy5wcm9wcy5iYWNrZW5kLm5hdmlnYXRlKHRoaXMuZm9sZGVyc1t0aGlzLmZvbGRlcnMubGVuZ3RoIC0gMV0pO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0J3NlbGVjdGVkRmlsZXMnOiBbXVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5lbWl0Rm9sZGVyQ2hhbmdlZENtc0V2ZW50KCk7XG5cdFx0dGhpcy5zYXZlRm9sZGVyTmFtZUluU2Vzc2lvbigpO1xuXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxuXG5cdG9uRmlsZVNhdmUoaWQsIHN0YXRlLCBldmVudCkge1xuXHRcdHRoaXMucHJvcHMuYmFja2VuZC5zYXZlKGlkLCBzdGF0ZSk7XG5cblx0XHR0aGlzLmVtaXRFeGl0RmlsZVZpZXdDbXNFdmVudCgpO1xuXG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0fVxufVxuXG5HYWxsZXJ5Q29tcG9uZW50LnByb3BUeXBlcyA9IHtcblx0J2hhc1Nlc3Npb25TdG9yYWdlJzogUmVhY3QuUHJvcFR5cGVzLmZ1bmMuaXNSZXF1aXJlZCxcblx0J2JhY2tlbmQnOiBSZWFjdC5Qcm9wVHlwZXMub2JqZWN0LmlzUmVxdWlyZWRcbn07XG5cbmV4cG9ydCBkZWZhdWx0IEdhbGxlcnlDb21wb25lbnQ7XG4iLCJleHBvcnQgZGVmYXVsdCB7XG5cdCdUSFVNQk5BSUxfSEVJR0hUJzogMTUwLFxuXHQnVEhVTUJOQUlMX1dJRFRIJzogMjAwLFxuXHQnRklMRV9TRUxFQ1RfS0VZUyc6IFszMiwgMTNdLFxuXHQnQlVMS19BQ1RJT05TJzogW1xuXHRcdHtcblx0XHRcdHZhbHVlOiAnZGVsZXRlJyxcblx0XHRcdGxhYmVsOiBzcy5pMThuLl90KCdBc3NldEdhbGxlcnlGaWVsZC5CVUxLX0FDVElPTlNfREVMRVRFJyksXG5cdFx0XHRkZXN0cnVjdGl2ZTogdHJ1ZVxuXHRcdH1cblx0XVxufTtcbiIsImltcG9ydCAkIGZyb20gJ2pxdWVyeSc7XG5pbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IEdhbGxlcnlDb21wb25lbnQgZnJvbSAnLi9jb21wb25lbnQvZ2FsbGVyeS1jb21wb25lbnQnO1xuaW1wb3J0IEZpbGVCYWNrZW5kIGZyb20gJy4vYmFja2VuZC9maWxlLWJhY2tlbmQnO1xuXG5mdW5jdGlvbiBnZXRWYXIobmFtZSkge1xuXHR2YXIgcGFydHMgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5zcGxpdCgnPycpO1xuXG5cdGlmIChwYXJ0cy5sZW5ndGggPiAxKSB7XG5cdFx0cGFydHMgPSBwYXJ0c1sxXS5zcGxpdCgnIycpO1xuXHR9XG5cblx0bGV0IHZhcmlhYmxlcyA9IHBhcnRzWzBdLnNwbGl0KCcmJyk7XG5cblx0Zm9yICh2YXIgaSA9IDA7IGkgPCB2YXJpYWJsZXMubGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgcGFydHMgPSB2YXJpYWJsZXNbaV0uc3BsaXQoJz0nKTtcblxuXHRcdGlmIChkZWNvZGVVUklDb21wb25lbnQocGFydHNbMF0pID09PSBuYW1lKSB7XG5cdFx0XHRyZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnRzWzFdKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gaGFzU2Vzc2lvblN0b3JhZ2UoKSB7XG5cdHJldHVybiB0eXBlb2Ygd2luZG93LnNlc3Npb25TdG9yYWdlICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuc2Vzc2lvblN0b3JhZ2UgIT09IG51bGw7XG59XG5cbiQuZW50d2luZSgnc3MnLCBmdW5jdGlvbiAoJCkge1xuXG5cdCQoJy5hc3NldC1nYWxsZXJ5JykuZW50d2luZSh7XG5cblx0XHRDb21wb25lbnQ6IG51bGwsXG5cblx0XHQnZ2V0Q3VycmVudEZvbGRlcic6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBjdXJyZW50Rm9sZGVyID0gJycsXG5cdFx0XHRcdGluaXRpYWxGb2xkZXIgPSB0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJykuZGF0YSgnYXNzZXQtZ2FsbGVyeS1pbml0aWFsLWZvbGRlcicpLFxuXHRcdFx0XHRxRm9sZGVyID0gZ2V0VmFyKCdxW0ZvbGRlcl0nKSxcblx0XHRcdFx0c2Vzc2lvbkZvbGRlcjtcblxuXHRcdFx0aWYgKHFGb2xkZXIgIT09IG51bGwpIHtcblx0XHRcdFx0Y3VycmVudEZvbGRlciA9IHFGb2xkZXI7XG5cdFx0XHR9IGVsc2UgaWYgKGhhc1Nlc3Npb25TdG9yYWdlKCkpIHtcblx0XHRcdFx0c2Vzc2lvbkZvbGRlciA9IHdpbmRvdy5zZXNzaW9uU3RvcmFnZS5nZXRJdGVtKHRoaXNbMF0uaWQpO1xuXG5cdFx0XHRcdGlmIChzZXNzaW9uRm9sZGVyICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0Y3VycmVudEZvbGRlciA9IHNlc3Npb25Gb2xkZXI7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGN1cnJlbnRGb2xkZXIgPSBpbml0aWFsRm9sZGVyO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gY3VycmVudEZvbGRlcjtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQGZ1bmMgZ2V0UHJvcHNcblx0XHQgKiBAcGFyYW0gb2JqZWN0IHByb3BzIC0gVXNlZCB0byBhdWdtZW50IGRlZmF1bHRzLlxuXHRcdCAqIEBkZXNjIFRoZSBpbml0aWFsIHByb3BzIHBhc3NlZCBpbnRvIHRoZSBHYWxsZXJ5Q29tcG9uZW50LiBDYW4gYmUgb3ZlcnJpZGRlbiBieSBvdGhlciBFbnR3aW5lIGNvbXBvbmVudHMuXG5cdFx0ICovXG5cdFx0J2dldFByb3BzJzogZnVuY3Rpb24gKHByb3BzKSB7XG5cdFx0XHR2YXIgJGNvbXBvbmVudFdyYXBwZXIgPSB0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJyksXG5cdFx0XHRcdCRzZWFyY2ggPSAkKCcuY21zLXNlYXJjaC1mb3JtJyksXG5cdFx0XHRcdGN1cnJlbnRGb2xkZXIgPSB0aGlzLmdldEN1cnJlbnRGb2xkZXIoKSxcblx0XHRcdFx0YmFja2VuZCxcblx0XHRcdFx0ZGVmYXVsdHM7XG5cblx0XHRcdGlmICgkc2VhcmNoLmZpbmQoJ1t0eXBlPWhpZGRlbl1bbmFtZT1cInFbRm9sZGVyXVwiXScpLmxlbmd0aCA9PSAwKSB7XG5cdFx0XHRcdCRzZWFyY2guYXBwZW5kKCc8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJxW0ZvbGRlcl1cIiAvPicpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBEbyB3ZSBuZWVkIHRvIHNldCB1cCBhIGRlZmF1bHQgYmFja2VuZD9cblx0XHRcdGlmICh0eXBlb2YgcHJvcHMgPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBwcm9wcy5iYWNrZW5kID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRiYWNrZW5kID0gRmlsZUJhY2tlbmQuY3JlYXRlKFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktc2VhcmNoLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktdXBkYXRlLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktZGVsZXRlLXVybCcpLFxuXHRcdFx0XHRcdCRjb21wb25lbnRXcmFwcGVyLmRhdGEoJ2Fzc2V0LWdhbGxlcnktbGltaXQnKSxcblx0XHRcdFx0XHQkY29tcG9uZW50V3JhcHBlci5kYXRhKCdhc3NldC1nYWxsZXJ5LWJ1bGstYWN0aW9ucycpLFxuXHRcdFx0XHRcdCRzZWFyY2guZmluZCgnW3R5cGU9aGlkZGVuXVtuYW1lPVwicVtGb2xkZXJdXCJdJylcblx0XHRcdFx0KTtcblxuXHRcdFx0XHRiYWNrZW5kLmVtaXQoXG5cdFx0XHRcdFx0J2ZpbHRlcicsXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW05hbWVdJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0FwcENhdGVnb3J5XScpLFxuXHRcdFx0XHRcdGdldFZhcigncVtGb2xkZXJdJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0NyZWF0ZWRGcm9tXScpLFxuXHRcdFx0XHRcdGdldFZhcigncVtDcmVhdGVkVG9dJyksXG5cdFx0XHRcdFx0Z2V0VmFyKCdxW0N1cnJlbnRGb2xkZXJPbmx5XScpXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cblx0XHRcdGRlZmF1bHRzID0ge1xuXHRcdFx0XHRiYWNrZW5kOiBiYWNrZW5kLFxuXHRcdFx0XHRjdXJyZW50X2ZvbGRlcjogY3VycmVudEZvbGRlcixcblx0XHRcdFx0Y21zRXZlbnRzOiB7XG5cdFx0XHRcdFx0J2Ntcy5maWxlQWRkZWQnOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHQvLyBSZWxvYWQgdGhlIGdhbGxlcnlcblx0XHRcdFx0XHRcdHRoaXMucHJvcHMuYmFja2VuZC5uYXZpZ2F0ZSh0aGlzLnByb3BzLmN1cnJlbnRfZm9sZGVyKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdCdjbXMudXBkYXRlU2VsZWN0ZWQnOiBmdW5jdGlvbihldmVudCwgc2VsZWN0ZWRGaWxlcykge1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRGaWxlcyA9IHNlbGVjdGVkRmlsZXMgfHwgW107XG5cblx0XHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0XHQnc2VsZWN0ZWRGaWxlcyc6IHNlbGVjdGVkRmlsZXNcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0J2Ntcy5kZXNlbGVjdEZvbGRlcic6IGZ1bmN0aW9uKGV2ZW50LCBmaWxlKSB7XG5cdFx0XHRcdFx0XHR2YXIgY3VycmVudGx5U2VsZWN0ZWQgPSB0aGlzLnN0YXRlLnNlbGVjdGVkRmlsZXMsXG5cdFx0XHRcdFx0XHRcdGZpbGVJbmRleCA9IGN1cnJlbnRseVNlbGVjdGVkLmluZGV4T2YoZmlsZS5pZCk7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGN1cnJlbnRseVNlbGVjdGVkLnNwbGljZShmaWxlSW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0XHRcdFx0J3NlbGVjdGVkRmlsZXMnOiBjdXJyZW50bHlTZWxlY3RlZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHQnY21zLmNsZWFyU2VsZWN0ZWQnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdFx0XHQnc2VsZWN0ZWRGaWxlcyc6IFtdXG5cdFx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0aGFzU2Vzc2lvblN0b3JhZ2U6IGhhc1Nlc3Npb25TdG9yYWdlLFxuXHRcdFx0XHRpbml0aWFsX2ZvbGRlcjogJGNvbXBvbmVudFdyYXBwZXIuZGF0YSgnYXNzZXQtZ2FsbGVyeS1pbml0aWFsLWZvbGRlcicpLFxuXHRcdFx0XHRuYW1lOiAkY29tcG9uZW50V3JhcHBlci5kYXRhKCdhc3NldC1nYWxsZXJ5LW5hbWUnKVxuXHRcdFx0fTtcblxuXHRcdFx0cmV0dXJuICQuZXh0ZW5kKHRydWUsIGRlZmF1bHRzLCBwcm9wcyk7XG5cdFx0fSxcblxuXHRcdCdvbmFkZCc6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciBwcm9wcyA9IHRoaXMuZ2V0UHJvcHMoKTtcblxuXHRcdFx0dGhpcy5zZXRDb21wb25lbnQoUmVhY3QucmVuZGVyKFxuXHRcdFx0XHQ8R2FsbGVyeUNvbXBvbmVudCB7Li4ucHJvcHN9IC8+LFxuXHRcdFx0XHR0aGlzLmZpbmQoJy5hc3NldC1nYWxsZXJ5LWNvbXBvbmVudC13cmFwcGVyJylbMF1cblx0XHRcdCkpO1xuXHRcdH1cblx0fSk7XG59KTtcbiJdfQ==
>>>>>>> Notify the CMS when entering and exiting edit mode
