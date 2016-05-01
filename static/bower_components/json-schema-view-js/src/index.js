'use strict';

/* globals JSONSchemaView */

import {
  convertXOf,
  _if
} from './helpers.js';


/**
 * @class JSONSchemaView
 *
 * A pure JavaScript component for rendering JSON Schema in HTML.
*/
export default class JSONSchemaView {

  /**
   * @param {object} schema The JSON Schema object
   *
   * @param {number} [open=1] his number indicates up to how many levels the
   * rendered tree should expand. Set it to `0` to make the whole tree collapsed
   * or set it to `Infinity` to expand the tree deeply
  */
  constructor(schema, open) {
    this.schema = schema;
    this.open = open;
    this.isCollapsed = open <= 0;

    // Determine if a schema is an array
    this.isArray = this.schema && this.schema.type === 'array';

    // Determine if a schema is a primitive
    this.isPrimitive = this.schema &&
      !this.schema.properties &&
      !this.schema.items &&
      this.schema.type !== 'array' &&
      this.schema.type !== 'object';

    // populate isRequired property down to properties
    if (this.schema && Array.isArray(this.schema.required)) {
      this.schema.required.forEach(requiredProperty => {
        if (typeof this.schema.properties[requiredProperty] === 'object') {
          this.schema.properties[requiredProperty].isRequired = true;
        }
      });
    }
  }

  /*
   * Returns the template with populated properties.
   * This template does not have the children
  */
  template() {
    if (!this.schema) {
      return '';
    }

    return `
      <!-- Primitive -->
      ${_if(this.isPrimitive)`
        <div class="primitive">
          ${_if(this.schema.description || this.schema.title)`
            <a class="title"><span class="toggle-handle"></span>${this.schema.title || ''} </a>
          `}

            <span class="type">${this.schema.type}</span>

          ${_if(this.schema.isRequired)`
            <span class="required">*</span>
          `}

          ${_if(!this.isCollapsed && this.schema.format)`
            <span class="format">(${this.schema.format})</span>
          `}

          ${_if(!this.isCollapsed && this.schema.minimum)`
            <span class="range minimum">minimum:${this.schema.minimum}</span>
          `}

          ${_if(!this.isCollapsed && this.schema.exclusiveMinimum)`
            <span class="range exclusiveMinimum">(ex)minimum:${this.schema.exclusiveMinimum}</span>
          `}

          ${_if(!this.isCollapsed && this.schema.maximum)`
            <span class="range maximum">maximum:${this.schema.maximum}</span>
          `}

          ${_if(!this.isCollapsed && this.schema.exclusiveMaximum)`
            <span class="range exclusiveMaximum">(ex)maximum:${this.schema.exclusiveMaximum}</span>
          `}

          ${_if(!this.isCollapsed && this.schema.minLength)`
            <span class="range minLength">minLength:${this.schema.minLength}</span>
          `}

          ${_if(!this.isCollapsed && this.schema.maxLength)`
            <span class="range maxLength">maxLength:${this.schema.maxLength}</span>
          `}

          ${_if(this.schema.description && !this.isCollapsed)`
            <div class="inner description">${this.schema.description}</div>
          `}

          ${_if(!this.isCollapsed && this.schema.enum)`
            ${this.enum(this.schema, this.isCollapsed, this.open)}
          `}

          ${_if(this.schema.allOf && !this.isCollapsed)`${this.xOf(this.schema, 'allOf')}`}
          ${_if(this.schema.oneOf && !this.isCollapsed)`${this.xOf(this.schema, 'oneOf')}`}
          ${_if(this.schema.anyOf && !this.isCollapsed)`${this.xOf(this.schema, 'anyOf')}`}
        </div>
      `}


      <!-- Array -->
      ${_if(this.isArray)`
        <div class="array">
          <a class="title"><span class="toggle-handle"></span>${this.schema.title || ''}<span class="opening bracket">[</span>${_if(this.isCollapsed)`<span class="closing bracket">]</span>`}</a>
          ${_if(!this.isCollapsed && (this.schema.uniqueItems || this.schema.minItems || this.schema.maxItems))`
          <span>
            <span title="items range">(${this.schema.minItems || 0}..${this.schema.maxItems || '∞'})</span>
            ${_if(!this.isCollapsed && this.schema.uniqueItems)`<span title="unique" class="uniqueItems">♦</span>`}
          </span>
          `}
          <div class="inner">
            ${_if(!this.isCollapsed && this.schema.description)`
              <div class="description">${this.schema.description}</div>
            `}
          </div>

          ${_if(!this.isCollapsed && this.schema.enum)`
            ${this.enum(this.schema, this.isCollapsed, this.open)}
          `}

          ${_if(this.schema.allOf && !this.isCollapsed)`${this.xOf(this.schema, 'allOf')}`}
          ${_if(this.schema.oneOf && !this.isCollapsed)`${this.xOf(this.schema, 'oneOf')}`}
          ${_if(this.schema.anyOf && !this.isCollapsed)`${this.xOf(this.schema, 'anyOf')}`}

          ${_if(!this.isCollapsed)`
          <span class="closing bracket">]</span>
          `}
        </div>
      `}

      <!-- Object -->
      ${_if(!this.isPrimitive && !this.isArray)`
        <div class="object">
          <a class="title"><span
            class="toggle-handle"></span>${this.schema.title || ''} <span
            class="opening brace">{</span>${_if(this.isCollapsed)`
              <span class="closing brace" ng-if="isCollapsed">}</span>
          `}</a>

          <div class="inner">
            ${_if(!this.isCollapsed && this.schema.description)`
              <div class="description">${this.schema.description}</div>
            `}
            <!-- children go here -->
          </div>

          ${_if(!this.isCollapsed && this.schema.enum)`
            ${this.enum(this.schema, this.isCollapsed, this.open)}
          `}

          ${_if(this.schema.allOf && !this.isCollapsed)`${this.xOf(this.schema, 'allOf')}`}
          ${_if(this.schema.oneOf && !this.isCollapsed)`${this.xOf(this.schema, 'oneOf')}`}
          ${_if(this.schema.anyOf && !this.isCollapsed)`${this.xOf(this.schema, 'anyOf')}`}

          ${_if(!this.isCollapsed)`
          <span class="closing brace">}</span>
          `}
        </div>
      `}
`.replace(/\s*\n/g, '\n').replace(/(\<\!\-\-).+/g, '').trim();
  }

  /*
   * Template for oneOf, anyOf and allOf
  */
  xOf(schema, type) {
    return `
      <div class="inner ${type}">
        <b>${convertXOf(type)}:</b>
      </div>
    `;
  }

  /*
   * Template for enums
  */
  enum(schema, isCollapsed, open) {
    return `
      ${_if(!isCollapsed && schema.enum)`
        <div class="inner enums">
          <b>Enum:</b>
        </div>
      `}
    `;
  }

  /*
   * Toggles the 'collapsed' state
  */
  toggle() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  /*
   * Renders the element and returns it
  */
  render() {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.classList.add('json-schema-view');
    }

    if (this.isCollapsed) {
      this.element.classList.add('collapsed');
    } else {
      this.element.classList.remove('collapsed');
    }

    this.element.innerHTML = this.template();

    if (!this.schema) {
      return this.element;
    }

    if (!this.isCollapsed) {
      this.appendChildren(this.element);
    }

    // add event listener for toggling
    if (this.element.querySelector('a.title')) {
      this.element.querySelector('a.title').addEventListener('click', this.toggle.bind(this));
    }
    return this.element;
  }

  /*
   * Appends children to given element based on current schema
  */
  appendChildren(element) {
    const inner = element.querySelector('.inner');

    if (this.schema.enum) {
      const formatter = new JSONFormatter(this.schema.enum, this.open - 1);
      const formatterEl = formatter.render();
      formatterEl.classList.add('inner');
      element.querySelector('.enums.inner').appendChild(formatterEl);

    }

    if (this.isArray) {
      const view = new JSONSchemaView(this.schema.items, this.open - 1)
      inner.appendChild(view.render());
    }

    if (typeof this.schema.properties === 'object') {
      Object.keys(this.schema.properties).forEach(propertyName => {
        const property = this.schema.properties[propertyName];
        const tempDiv = document.createElement('div');;
        tempDiv.innerHTML = `<div class="property">
          <span class="name">${propertyName}:</span>
        </div>`;
        const view = new JSONSchemaView(property, this.open - 1);
        tempDiv.querySelector('.property').appendChild(view.render());

        inner.appendChild(tempDiv.querySelector('.property'));
      });
    }

    if (this.schema.allOf) { appendXOf.call(this, 'allOf'); }
    if (this.schema.oneOf) { appendXOf.call(this, 'oneOf'); }
    if (this.schema.anyOf) { appendXOf.call(this, 'anyOf'); }

    function appendXOf(type) {
      const innerAllOf = element.querySelector(`.inner.${type}`);

      this.schema[type].forEach(schema => {
        const inner = document.createElement('div');
        inner.classList.add('inner');
        const view = new JSONSchemaView(schema, this.open - 1);
        inner.appendChild(view.render());
        innerAllOf.appendChild(inner);
      });
    }
  }
}

// TODO: UMD
window.JSONSchemaView = JSONSchemaView;
