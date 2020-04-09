/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./client/src/entwine/TinyMCE_ssembed.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./client/src/components/InsertEmbedModal/InsertEmbedModal.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Component = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _i18n = __webpack_require__(2);

var _i18n2 = _interopRequireDefault(_i18n);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _redux = __webpack_require__(5);

var _reactRedux = __webpack_require__(4);

var _FormBuilderModal = __webpack_require__(11);

var _FormBuilderModal2 = _interopRequireDefault(_FormBuilderModal);

var _SchemaActions = __webpack_require__(19);

var schemaActions = _interopRequireWildcard(_SchemaActions);

var _propTypes = __webpack_require__(1);

var _propTypes2 = _interopRequireDefault(_propTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var sectionConfigKey = 'SilverStripe\\AssetAdmin\\Controller\\AssetAdmin';

var InsertEmbedModal = function (_Component) {
  _inherits(InsertEmbedModal, _Component);

  function InsertEmbedModal(props) {
    _classCallCheck(this, InsertEmbedModal);

    var _this = _possibleConstructorReturn(this, (InsertEmbedModal.__proto__ || Object.getPrototypeOf(InsertEmbedModal)).call(this, props));

    _this.handleSubmit = _this.handleSubmit.bind(_this);
    return _this;
  }

  _createClass(InsertEmbedModal, [{
    key: 'componentWillMount',
    value: function componentWillMount() {
      this.setOverrides(this.props);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(props) {
      if (props.isOpen && !this.props.isOpen) {
        this.setOverrides(props);
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      this.clearOverrides();
    }
  }, {
    key: 'setOverrides',
    value: function setOverrides(props) {
      if (this.props.schemaUrl !== props.schemaUrl) {
        this.clearOverrides();
      }
      if (props.schemaUrl) {
        var attrs = Object.assign({}, props.fileAttributes);
        delete attrs.ID;

        var overrides = {
          fields: Object.entries(attrs).map(function (field) {
            var _field = _slicedToArray(field, 2),
                name = _field[0],
                value = _field[1];

            return { name: name, value: value };
          })
        };

        this.props.actions.schema.setSchemaStateOverrides(props.schemaUrl, overrides);
      }
    }
  }, {
    key: 'getModalProps',
    value: function getModalProps() {
      var props = Object.assign({
        onSubmit: this.handleSubmit,
        onLoadingError: this.handleLoadingError,
        showErrorMessage: true,
        responseClassBad: 'alert alert-danger',
        identifier: 'AssetAdmin.InsertEmbedModal'
      }, this.props, {
        className: 'insert-embed-modal ' + this.props.className,
        size: 'lg',
        onClosed: this.props.onClosed,
        title: this.props.targetUrl ? _i18n2.default._t('AssetAdmin.EditTitle', 'Media from the web') : _i18n2.default._t('AssetAdmin.CreateTitle', 'Insert new media from the web')
      });
      delete props.sectionConfig;
      delete props.onInsert;
      delete props.fileAttributes;

      return props;
    }
  }, {
    key: 'clearOverrides',
    value: function clearOverrides() {
      this.props.actions.schema.setSchemaStateOverrides(this.props.schemaUrl, null);
    }
  }, {
    key: 'handleLoadingError',
    value: function handleLoadingError(error) {
      if (typeof this.props.onLoadingError === 'function') {
        this.props.onLoadingError(error);
      }
    }
  }, {
    key: 'handleSubmit',
    value: function handleSubmit(data, action) {
      switch (action) {
        case 'action_addmedia':
          {
            this.props.onCreate(data);
            break;
          }
        case 'action_insertmedia':
          {
            this.props.onInsert(data);
            break;
          }
        case 'action_cancel':
          {
            this.props.onClosed();
            break;
          }
        default:
          {}
      }

      return Promise.resolve();
    }
  }, {
    key: 'render',
    value: function render() {
      return _react2.default.createElement(_FormBuilderModal2.default, this.getModalProps());
    }
  }]);

  return InsertEmbedModal;
}(_react.Component);

InsertEmbedModal.propTypes = {
  sectionConfig: _propTypes2.default.shape({
    url: _propTypes2.default.string,
    form: _propTypes2.default.object
  }),
  isOpen: _propTypes2.default.bool,
  onInsert: _propTypes2.default.func.isRequired,
  onCreate: _propTypes2.default.func.isRequired,
  fileAttributes: _propTypes2.default.shape({
    Url: _propTypes2.default.string,
    CaptionText: _propTypes2.default.string,
    PreviewUrl: _propTypes2.default.string,
    Placement: _propTypes2.default.string,
    Width: _propTypes2.default.number,
    Height: _propTypes2.default.number
  }),
  onClosed: _propTypes2.default.func.isRequired,
  className: _propTypes2.default.string,
  actions: _propTypes2.default.object,
  schemaUrl: _propTypes2.default.string.isRequired,
  targetUrl: _propTypes2.default.string,
  onLoadingError: _propTypes2.default.func
};

InsertEmbedModal.defaultProps = {
  className: '',
  fileAttributes: {}
};

function mapStateToProps(state, ownProps) {
  var sectionConfig = state.config.sections.find(function (section) {
    return section.name === sectionConfigKey;
  });

  var targetUrl = ownProps.fileAttributes ? ownProps.fileAttributes.Url : '';
  var baseEditUrl = sectionConfig.form.remoteEditForm.schemaUrl;

  var editUrl = targetUrl && baseEditUrl + '/?embedurl=' + encodeURIComponent(targetUrl);
  var createUrl = sectionConfig.form.remoteCreateForm.schemaUrl;

  var schemaUrl = editUrl || createUrl;

  return {
    sectionConfig: sectionConfig,
    schemaUrl: schemaUrl,
    targetUrl: targetUrl
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: {
      schema: (0, _redux.bindActionCreators)(schemaActions, dispatch)
    }
  };
}

exports.Component = InsertEmbedModal;
exports.default = (0, _reactRedux.connect)(mapStateToProps, mapDispatchToProps)(InsertEmbedModal);

/***/ }),

/***/ "./client/src/entwine/TinyMCE_ssembed.js":
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _jquery = __webpack_require__(7);

var _jquery2 = _interopRequireDefault(_jquery);

var _react = __webpack_require__(0);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(6);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _Injector = __webpack_require__(3);

var _ShortcodeSerialiser = __webpack_require__(8);

var _ShortcodeSerialiser2 = _interopRequireDefault(_ShortcodeSerialiser);

var _InsertEmbedModal = __webpack_require__("./client/src/components/InsertEmbedModal/InsertEmbedModal.js");

var _InsertEmbedModal2 = _interopRequireDefault(_InsertEmbedModal);

var _i18n = __webpack_require__(2);

var _i18n2 = _interopRequireDefault(_i18n);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var InjectableInsertEmbedModal = (0, _Injector.loadComponent)(_InsertEmbedModal2.default);
var filter = 'div[data-shortcode="embed"]';

(function () {
  var ssembed = {
    init: function init(editor) {
      var insertTitle = _i18n2.default._t('AssetAdmin.INSERT_VIA_URL', 'Insert media via URL');
      var editTitle = _i18n2.default._t('AssetAdmin.EDIT_MEDIA', 'Edit media');
      var contextTitle = _i18n2.default._t('AssetAdmin.MEDIA', 'Media');
      editor.addButton('ssembed', {
        title: insertTitle,
        icon: 'media',
        cmd: 'ssembed',
        stateSelector: filter
      });
      editor.addMenuItem('ssembed', {
        text: contextTitle,
        icon: 'media',
        cmd: 'ssembed'
      });
      editor.addButton('ssembededit', {
        title: editTitle,
        icon: 'editimage',
        cmd: 'ssembed'
      });
      editor.addContextToolbar(function (embed) {
        return editor.dom.is(embed, filter);
      }, 'alignleft aligncenter alignright | ssembededit');

      editor.addCommand('ssembed', function () {
        (0, _jquery2.default)('#' + editor.id).entwine('ss').openEmbedDialog();
      });

      editor.on('BeforeExecCommand', function (e) {
        var cmd = e.command;
        var ui = e.ui;
        var val = e.value;
        if (cmd === 'mceAdvMedia' || cmd === 'mceAdvMedia') {
          e.preventDefault();
          editor.execCommand('ssembed', ui, val);
        }
      });

      editor.on('SaveContent', function (o) {
        var content = (0, _jquery2.default)('<div>' + o.content + '</div>');

        content.find(filter).each(function replaceWithShortCode() {
          var embed = (0, _jquery2.default)(this);

          var placeholder = embed.find('img.placeholder');
          if (placeholder.length === 0) {
            embed.removeAttr('data-url');
            embed.removeAttr('data-shortcode');
            return;
          }

          var caption = embed.find('.caption').text();
          var width = parseInt(placeholder.attr('width'), 10);
          var height = parseInt(placeholder.attr('height'), 10);
          var url = embed.data('url');
          var properties = (0, _ShortcodeSerialiser.sanitiseShortCodeProperties)({
            url: url,
            thumbnail: placeholder.prop('src'),
            class: embed.prop('class'),
            width: isNaN(width) ? null : width,
            height: isNaN(height) ? null : height,
            caption: caption
          });
          var shortCode = _ShortcodeSerialiser2.default.serialise({
            name: 'embed',
            properties: properties,
            wrapped: true,
            content: properties.url
          });
          embed.replaceWith(shortCode);
        });

        o.content = content.html();
      });
      editor.on('BeforeSetContent', function (o) {
        var content = o.content;

        var match = _ShortcodeSerialiser2.default.match('embed', true, content);
        while (match) {
          var data = match.properties;

          var base = (0, _jquery2.default)('<div/>').attr('data-url', data.url || match.content).attr('data-shortcode', 'embed').addClass(data.class).addClass('ss-htmleditorfield-file embed');

          var placeholder = (0, _jquery2.default)('<img />').attr('src', data.thumbnail).addClass('placeholder');

          if (data.width) {
            placeholder.attr('width', data.width);
          }
          if (data.height) {
            placeholder.attr('height', data.height);
          }

          base.append(placeholder);

          if (data.caption) {
            var caption = (0, _jquery2.default)('<p />').addClass('caption').text(data.caption);
            base.append(caption);
          }

          content = content.replace(match.original, (0, _jquery2.default)('<div/>').append(base).html());

          match = _ShortcodeSerialiser2.default.match('embed', true, content);
        }

        o.content = content;
      });
    }
  };

  tinymce.PluginManager.add('ssembed', function (editor) {
    return ssembed.init(editor);
  });
})();

_jquery2.default.entwine('ss', function ($) {
  $('.js-injector-boot #insert-embed-react__dialog-wrapper').entwine({
    Element: null,

    Data: {},

    onunmatch: function onunmatch() {
      this._clearModal();
    },
    _clearModal: function _clearModal() {
      _reactDom2.default.unmountComponentAtNode(this[0]);
    },
    open: function open() {
      this._renderModal(true);
    },
    close: function close() {
      this.setData({});
      this._renderModal(false);
    },
    _renderModal: function _renderModal(isOpen) {
      var _this = this;

      var handleHide = function handleHide() {
        return _this.close();
      };

      var handleInsert = function handleInsert() {
        return _this._handleInsert.apply(_this, arguments);
      };

      var handleCreate = function handleCreate() {
        return _this._handleCreate.apply(_this, arguments);
      };
      var handleLoadingError = function handleLoadingError() {
        return _this._handleLoadingError.apply(_this, arguments);
      };
      var attrs = this.getOriginalAttributes();

      _reactDom2.default.render(_react2.default.createElement(InjectableInsertEmbedModal, {
        isOpen: isOpen,
        onCreate: handleCreate,
        onInsert: handleInsert,
        onClosed: handleHide,
        onLoadingError: handleLoadingError,
        bodyClassName: 'modal__dialog',
        className: 'insert-embed-react__dialog-wrapper',
        fileAttributes: attrs
      }), this[0]);
    },
    _handleLoadingError: function _handleLoadingError() {
      this.setData({});
      this.open();
    },
    _handleInsert: function _handleInsert(data) {
      var oldData = this.getData();
      this.setData(Object.assign({ Url: oldData.Url }, data));
      this.insertRemote();
      this.close();
    },
    _handleCreate: function _handleCreate(data) {
      this.setData(Object.assign({}, this.getData(), data));
      this.open();
    },
    getOriginalAttributes: function getOriginalAttributes() {
      var data = this.getData();
      var $field = this.getElement();
      if (!$field) {
        return data;
      }

      var node = $($field.getEditor().getSelectedNode());
      if (!node.length) {
        return data;
      }

      var element = node.closest(filter).add(node.filter(filter));
      if (!element.length) {
        return data;
      }
      var image = element.find('img.placeholder');

      if (image.length === 0) {
        return data;
      }

      var caption = element.find('.caption').text();
      var width = parseInt(image.width(), 10);
      var height = parseInt(image.height(), 10);

      return {
        Url: element.data('url') || data.Url,
        CaptionText: caption,
        PreviewUrl: image.attr('src'),
        Width: isNaN(width) ? null : width,
        Height: isNaN(height) ? null : height,
        Placement: this.findPosition(element.prop('class'))
      };
    },
    findPosition: function findPosition(cssClass) {
      var alignments = ['leftAlone', 'center', 'rightAlone', 'left', 'right'];
      if (typeof cssClass !== 'string') {
        return '';
      }
      var classes = cssClass.split(' ');
      return alignments.find(function (alignment) {
        return classes.indexOf(alignment) > -1;
      });
    },
    insertRemote: function insertRemote() {
      var $field = this.getElement();
      if (!$field) {
        return false;
      }
      var editor = $field.getEditor();
      if (!editor) {
        return false;
      }

      var data = this.getData();

      var base = (0, _jquery2.default)('<div/>').attr('data-url', data.Url).attr('data-shortcode', 'embed').addClass(data.Placement).addClass('ss-htmleditorfield-file embed');

      var placeholder = (0, _jquery2.default)('<img />').attr('src', data.PreviewUrl).addClass('placeholder');

      if (data.Width) {
        placeholder.attr('width', data.Width);
      }
      if (data.Height) {
        placeholder.attr('height', data.Height);
      }

      base.append(placeholder);

      if (data.CaptionText) {
        var caption = (0, _jquery2.default)('<p />').addClass('caption').text(data.CaptionText);
        base.append(caption);
      }

      var node = $(editor.getSelectedNode());
      var replacee = $(null);
      if (node.length) {
        replacee = node.filter(filter);

        if (replacee.length === 0) {
          replacee = node.closest(filter);
        }

        if (replacee.length === 0) {
          replacee = node.filter('img.placeholder');
        }
      }

      if (replacee.length) {
        replacee.replaceWith(base);
      } else {
        editor.repaint();
        editor.insertContent($('<div />').append(base.clone()).html(), { skip_undo: 1 });
      }

      editor.addUndo();
      editor.repaint();

      return true;
    }
  });
});

/***/ }),

/***/ 0:
/***/ (function(module, exports) {

module.exports = React;

/***/ }),

/***/ 1:
/***/ (function(module, exports) {

module.exports = PropTypes;

/***/ }),

/***/ 11:
/***/ (function(module, exports) {

module.exports = FormBuilderModal;

/***/ }),

/***/ 19:
/***/ (function(module, exports) {

module.exports = SchemaActions;

/***/ }),

/***/ 2:
/***/ (function(module, exports) {

module.exports = i18n;

/***/ }),

/***/ 3:
/***/ (function(module, exports) {

module.exports = Injector;

/***/ }),

/***/ 4:
/***/ (function(module, exports) {

module.exports = ReactRedux;

/***/ }),

/***/ 5:
/***/ (function(module, exports) {

module.exports = Redux;

/***/ }),

/***/ 6:
/***/ (function(module, exports) {

module.exports = ReactDom;

/***/ }),

/***/ 7:
/***/ (function(module, exports) {

module.exports = jQuery;

/***/ }),

/***/ 8:
/***/ (function(module, exports) {

module.exports = ShortcodeSerialiser;

/***/ })

/******/ });
//# sourceMappingURL=TinyMCE_ssembed.js.map