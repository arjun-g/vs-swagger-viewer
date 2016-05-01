'use strict';
/*
 * Converts anyOf, allOf and oneOf to human readable string
*/
export function convertXOf(type) {
  return type.substring(0, 3) + ' of';
}

/*
 * if condition for ES6 template strings
 * to be used only in template string
 *
 * @example mystr = `Random is ${_if(Math.random() > 0.5)`greater than 0.5``
 *
 * @param {boolean} condition
 *
 * @returns {function} the template function
*/
export function _if(condition) {
  return condition ? normal : empty;
}
function empty(){
  return '';
}
function normal (template, ...expressions) {
  return template.slice(1).reduce((accumulator, part, i) => {
    return accumulator + expressions[i] + part;
  }, template[0]);
}