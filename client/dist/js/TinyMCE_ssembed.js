!function(e){function t(n){if(r[n])return r[n].exports;var i=r[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,t),i.l=!0,i.exports}var r={};t.m=e,t.c=r,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},t.p="",t(t.s="./client/src/entwine/TinyMCE_ssembed.js")}({"./client/src/components/InsertEmbedModal/InsertEmbedModal.js":function(e,t,r){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}function i(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function o(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}function a(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}function s(e,t){var r=e.config.sections.find(function(e){return e.name===_}),n=t.fileAttributes?t.fileAttributes.Url:"",i=r.form.remoteEditForm.schemaUrl,o=n&&i+"/?embedurl="+encodeURIComponent(n),a=r.form.remoteCreateForm.schemaUrl;return{sectionConfig:r,schemaUrl:o||a,targetUrl:n}}function l(e){return{actions:{schema:(0,m.bindActionCreators)(C,e)}}}Object.defineProperty(t,"__esModule",{value:!0}),t.Component=void 0;var d=function(){function e(e,t){var r=[],n=!0,i=!1,o=void 0;try{for(var a,s=e[Symbol.iterator]();!(n=(a=s.next()).done)&&(r.push(a.value),!t||r.length!==t);n=!0);}catch(e){i=!0,o=e}finally{try{!n&&s.return&&s.return()}finally{if(i)throw o}}return r}return function(t,r){if(Array.isArray(t))return t;if(Symbol.iterator in Object(t))return e(t,r);throw new TypeError("Invalid attempt to destructure non-iterable instance")}}(),c=function(){function e(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}return function(t,r,n){return r&&e(t.prototype,r),n&&e(t,n),t}}(),u=r("i18n"),p=n(u),f=r("react"),h=n(f),m=r("redux"),b=r("react-redux"),g=r("components/FormBuilderModal/FormBuilderModal"),v=n(g),y=r("state/schema/SchemaActions"),C=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var r in e)Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);return t.default=e,t}(y),_="SilverStripe\\AssetAdmin\\Controller\\AssetAdmin",P=function(e){function t(e){i(this,t);var r=o(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,e));return r.handleSubmit=r.handleSubmit.bind(r),r}return a(t,e),c(t,[{key:"componentWillMount",value:function(){this.setOverrides(this.props)}},{key:"componentWillReceiveProps",value:function(e){e.isOpen&&!this.props.isOpen&&this.setOverrides(e)}},{key:"componentWillUnmount",value:function(){this.clearOverrides()}},{key:"setOverrides",value:function(e){if(this.props.schemaUrl!==e.schemaUrl&&this.clearOverrides(),e.schemaUrl){var t=Object.assign({},e.fileAttributes);delete t.ID;var r={fields:Object.entries(t).map(function(e){var t=d(e,2);return{name:t[0],value:t[1]}})};this.props.actions.schema.setSchemaStateOverrides(e.schemaUrl,r)}}},{key:"getModalProps",value:function(){var e=Object.assign({onSubmit:this.handleSubmit,onLoadingError:this.handleLoadingError,showErrorMessage:!0,responseClassBad:"alert alert-danger",identifier:"AssetAdmin.InsertEmbedModal"},this.props,{className:"insert-embed-modal "+this.props.className,size:"lg",onClosed:this.props.onClosed,title:this.props.targetUrl?p.default._t("AssetAdmin.EditTitle","Media from the web"):p.default._t("AssetAdmin.CreateTitle","Insert new media from the web")});return delete e.sectionConfig,delete e.onInsert,delete e.fileAttributes,e}},{key:"clearOverrides",value:function(){this.props.actions.schema.setSchemaStateOverrides(this.props.schemaUrl,null)}},{key:"handleLoadingError",value:function(e){"function"==typeof this.props.onLoadingError&&this.props.onLoadingError(e)}},{key:"handleSubmit",value:function(e,t){switch(t){case"action_addmedia":this.props.onCreate(e);break;case"action_insertmedia":this.props.onInsert(e);break;case"action_cancel":this.props.onClosed()}return Promise.resolve()}},{key:"render",value:function(){return h.default.createElement(v.default,this.getModalProps())}}]),t}(f.Component);P.propTypes={sectionConfig:f.PropTypes.shape({url:f.PropTypes.string,form:f.PropTypes.object}),isOpen:f.PropTypes.bool,onInsert:f.PropTypes.func.isRequired,onCreate:f.PropTypes.func.isRequired,fileAttributes:f.PropTypes.shape({Url:f.PropTypes.string,CaptionText:f.PropTypes.string,PreviewUrl:f.PropTypes.string,Placement:f.PropTypes.string,Width:f.PropTypes.number,Height:f.PropTypes.number}),onClosed:f.PropTypes.func.isRequired,className:f.PropTypes.string,actions:f.PropTypes.object,schemaUrl:f.PropTypes.string.isRequired,targetUrl:f.PropTypes.string,onLoadingError:f.PropTypes.func},P.defaultProps={className:"",fileAttributes:{}},t.Component=P,t.default=(0,b.connect)(s,l)(P)},"./client/src/entwine/TinyMCE_ssembed.js":function(e,t,r){"use strict";function n(e){return e&&e.__esModule?e:{default:e}}var i=r("jquery"),o=n(i),a=r("react"),s=n(a),l=r("react-dom"),d=n(l),c=r("lib/Injector"),u=r("lib/ShortcodeSerialiser"),p=n(u),f=r("./client/src/components/InsertEmbedModal/InsertEmbedModal.js"),h=n(f),m=r("i18n"),b=n(m),g=(0,c.loadComponent)(h.default),v='div[data-shortcode="embed"]';!function(){var e={init:function(e){var t=b.default._t("AssetAdmin.INSERT_VIA_URL","Insert media via URL");e.addButton("ssembed",{icon:"media",title:t,cmd:"ssembed"}),e.addMenuItem("ssembed",{icon:"media",text:t,cmd:"ssembed"}),e.addCommand("ssembed",function(){(0,o.default)("#"+e.id).entwine("ss").openEmbedDialog()}),e.on("BeforeExecCommand",function(t){var r=t.command,n=t.ui,i=t.value;"mceAdvMedia"!==r&&"mceAdvMedia"!==r||(t.preventDefault(),e.execCommand("ssembed",n,i))}),e.on("SaveContent",function(e){var t=(0,o.default)("<div>"+e.content+"</div>");t.find(v).each(function(){var e=(0,o.default)(this),t=e.find("img.placeholder");if(0===t.length)return e.removeAttr("data-url"),void e.removeAttr("data-shortcode");var r=e.find(".caption").text(),n=parseInt(t.attr("width"),10),i=parseInt(t.attr("height"),10),a=e.data("url"),s={url:a,thumbnail:t.prop("src"),class:e.prop("class"),width:isNaN(n)?null:n,height:isNaN(i)?null:i,caption:r},l=p.default.serialise({name:"embed",properties:s,wrapped:!0,content:a});e.replaceWith(l)}),e.content=t.html()}),e.on("BeforeSetContent",function(e){for(var t=e.content,r=p.default.match("embed",!0,t);r;){var n=r.properties,i=(0,o.default)("<div/>").attr("data-url",n.url||r.content).attr("data-shortcode","embed").addClass(n.class).addClass("ss-htmleditorfield-file embed"),a=(0,o.default)("<img />").attr("src",n.thumbnail).addClass("placeholder");if(n.width&&(i.width(n.width),a.attr("width",n.width)),n.height&&a.attr("height",n.height),i.append(a),n.caption){var s=(0,o.default)("<p />").addClass("caption").text(n.caption);i.append(s)}t=t.replace(r.original,(0,o.default)("<div/>").append(i).html()),r=p.default.match("embed",!0,t)}e.content=t})}};tinymce.PluginManager.add("ssembed",function(t){return e.init(t)})}(),o.default.entwine("ss",function(e){e(".js-injector-boot #insert-embed-react__dialog-wrapper").entwine({Element:null,Data:{},onunmatch:function(){this._clearModal()},_clearModal:function(){d.default.unmountComponentAtNode(this[0])},open:function(){this._renderModal(!0)},close:function(){this.setData({}),this._renderModal(!1)},_renderModal:function(e){var t=this,r=function(){return t.close()},n=function(){return t._handleInsert.apply(t,arguments)},i=function(){return t._handleCreate.apply(t,arguments)},o=function(){return t._handleLoadingError.apply(t,arguments)},a=this.getOriginalAttributes();d.default.render(s.default.createElement(g,{isOpen:e,onCreate:i,onInsert:n,onClosed:r,onLoadingError:o,bodyClassName:"modal__dialog",className:"insert-embed-react__dialog-wrapper",fileAttributes:a}),this[0])},_handleLoadingError:function(){this.setData({}),this.open()},_handleInsert:function(e){var t=this.getData();this.setData(Object.assign({Url:t.Url},e)),this.insertRemote(),this.close()},_handleCreate:function(e){this.setData(Object.assign({},this.getData(),e)),this.open()},getOriginalAttributes:function(){var t=this.getData(),r=this.getElement();if(!r)return t;var n=e(r.getEditor().getSelectedNode());if(!n.length)return t;var i=n.closest(v).add(n.filter(v));if(!i.length)return t;var o=i.find("img.placeholder");if(0===o.length)return t;var a=i.find(".caption").text(),s=parseInt(o.width(),10),l=parseInt(o.height(),10);return{Url:i.data("url")||t.Url,CaptionText:a,PreviewUrl:o.attr("src"),Width:isNaN(s)?null:s,Height:isNaN(l)?null:l,Placement:this.findPosition(i.prop("class"))}},findPosition:function(e){var t=["leftAlone","center","rightAlone","left","right"];if("string"!=typeof e)return"";var r=e.split(" ");return t.find(function(e){return r.indexOf(e)>-1})},insertRemote:function(){var t=this.getElement();if(!t)return!1;var r=t.getEditor();if(!r)return!1;var n=this.getData(),i=(0,o.default)("<div/>").attr("data-url",n.Url).attr("data-shortcode","embed").addClass(n.Placement).addClass("ss-htmleditorfield-file embed"),a=(0,o.default)("<img />").attr("src",n.PreviewUrl).addClass("placeholder");if(n.Width&&(i.width(n.Width),a.attr("width",n.Width)),n.Height&&a.attr("height",n.Height),i.append(a),n.CaptionText){var s=(0,o.default)("<p />").addClass("caption").text(n.CaptionText);i.append(s)}var l=e(r.getSelectedNode()),d=e(null);return l.length&&(d=l.filter(v),0===d.length&&(d=l.closest(v)),0===d.length&&(d=l.filter("img.placeholder"))),d.length?d.replaceWith(i):(r.repaint(),r.insertContent(e("<div />").append(i.clone()).html(),{skip_undo:1})),r.addUndo(),r.repaint(),!0}})})},"components/FormBuilderModal/FormBuilderModal":function(e,t){e.exports=FormBuilderModal},i18n:function(e,t){e.exports=i18n},jquery:function(e,t){e.exports=jQuery},"lib/Injector":function(e,t){e.exports=Injector},"lib/ShortcodeSerialiser":function(e,t){e.exports=ShortcodeSerialiser},react:function(e,t){e.exports=React},"react-dom":function(e,t){e.exports=ReactDom},"react-redux":function(e,t){e.exports=ReactRedux},redux:function(e,t){e.exports=Redux},"state/schema/SchemaActions":function(e,t){e.exports=SchemaActions}});