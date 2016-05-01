'use strict';

angular.module('demo', ['ngSanitize', 'mohsen1.schema-form']);

angular.module('demo')

.controller('TestCtrl', function ($scope, $http, SchemaForm) {

  // Configure SchemaForm
  SchemaForm.options = {
    theme: 'bootstrap3',
    // remove_empty_properties: true,
    show_errors: 'change'
  };

  $scope.simpleString = 'Hello world';

  // ---------------------------------------------------------------------------
  $scope.complexSchema = {
    type: 'object',
    title: 'Person',
    properties: {
        name: {
            type: 'string'
        },
        location: {
            type: 'string',
            minLength: 3
        }
    }
  };

  $scope.complexModel = {
    name: 'Mohsen',
    location: 'Palo Alto, CA'
  };

  $scope.$watch('complexModel', function(){
    $scope.complexModelString = JSON.stringify($scope.complexModel, null, 2);
  });

  $scope.$watch('complexSchema', function(){
    $scope.complexSchemaString = JSON.stringify($scope.complexSchema, null, 2);
  });

  $scope.commit = function(){
    try {
      $scope.complexSchema = JSON.parse($scope.complexSchemaString);
      $scope.complexModel = JSON.parse($scope.complexModelString);
    } catch(e){
      window.console.warn(e.toString());
    }
  };

  // ---------------------------------------------------------------------------
  $scope.advancedSchema = {};
  $http.get('./advanced-schema.json').then(function (resp){
    $scope.$evalAsync(function(){
      $scope.advancedSchema = resp.data;
    });
  });
  $scope.advancedModel = {};
})

.config(function(SchemaFormProvider) {
  SchemaFormProvider.setOptions({
    theme: 'bootstrap3'
  });
});
