'use strict';

exports.flatten = function (arrays) {
    return [].concat.apply([], arrays);
};
