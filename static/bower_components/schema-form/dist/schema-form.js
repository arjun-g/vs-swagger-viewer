/*!
 * angular-json-schema-form
 * https://github.com/mohsen1/angular-json-schema-form
 * Version: 0.1.3 - 2015-07-13T22:20:46.480Z
 * License: MIT
 */


'use strict';

/*
 * schema-form directive
 *
 * Usage:
 *
 * Pass `schema-form` attribute to a <form> element with your JSON Schema object
 * as value to it.
 *
 * Example:
 * ```
 * <form schema-form="mySchema">
 *    <button type="submit">Submit</button>
 * </form>
 * ```
*/
angular.module('mohsen1.schema-form', [])

/*
 * Main directive
*/
.directive('schemaForm', function($parse, SchemaForm) {

  return {
    restrict: 'A',
    replace: false,
    require: '?ngModel',
    scope: {
      'schema': '=schemaForm'
    },
    link: function(scope, element, attributes, ngModel) {
      if (!angular.isObject(scope.schema)) {
        return;
      }

      var formEl = window.document.createElement('div');
      var options = angular.extend(SchemaForm.options, {schema: scope.schema});
      var jsonEditor = null;

      element.prepend(formEl);

      if (ngModel) {
        ngModel.$render = render;
      } else {
        render();
      }

      // Listen to keyup on wrapper element to trigger per keypress changes
      if (element && element[0] instanceof HTMLElement) {
        element[0].addEventListener('keyup', function(event) {
          event.target.blur();
          event.target.focus();
          setViewValueAndErrors();
        }, true);
      }

      function render() {

        // clean up previous form
        if (jsonEditor) {
          angular.element(formEl).html('');
          jsonEditor.destroy();
        }

        // renew options.schema if there is a new schema
        options.schema = scope.schema;

        jsonEditor = new JSONEditor(formEl, options);

        if (ngModel) {
          jsonEditor.setValue(ngModel.$modelValue);
          jsonEditor.on('change', setViewValueAndErrors);
        }

      }

      function setViewValueAndErrors() {
        scope.$evalAsync(function() {
          var errors = jsonEditor.validate();

          ngModel.$setViewValue(jsonEditor.getValue());
          ngModel.$setValidity('schemaForm', errors.length === 0);
        });
      }

      scope.$watch('schema', render);
    }
  };
})

/*
 * Provides configurations for schema form
 *
 * Example:
 * MyApp.config(function(SchemaFormProvider) {
 *   SchemaFormProvider.setOptions(myOptions);
 * });
 *
 * See options here: https://github.com/jdorn/json-editor#options
 *
*/
.provider('SchemaForm', function() {
  var options = angular.extend(JSONEditor.defaults.options, {
    'disable_edit_json': true,
    'disable_properties': true,
    'no_additional_properties': true,
    'disable_collapse': true
  });

  this.$get = function() {
    return {
      options: options
    };
  };

  this.setOptions = function(newOptions) {
    if (!angular.isObject(newOptions)) {
      throw new Error('options should be an object.');
    }

    angular.extend(options, newOptions);
  };

  this.getOptions = function() {
    return options;
  };
});
