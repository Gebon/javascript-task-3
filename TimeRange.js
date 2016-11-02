'use strict';

var arrayUtils = require('./arrayUtils.js');

function TimeRange(from, to) {
    this.from = from;
    this.to = to;
}

TimeRange.fromAnother = function (timeRange) {
    return new TimeRange(timeRange.from, timeRange.to);
};

Object.defineProperty(TimeRange.prototype, 'duration', {
    get: function () {
        return this.to - this.from;
    }
});

TimeRange.prototype.exceptTimeRange = function (range) {
    if (!this.isIntersectedWith(range)) {
        return [this];
    }
    var result = [];
    if (this.from < range.from) {
        result.push(new TimeRange(this.from, range.from));
    }
    if (range.to < this.to) {
        result.push(new TimeRange(range.to, this.to));
    }

    return result;
};

TimeRange.prototype.exceptTimeRanges = function (excludedTimeRanges) {
    var result = excludedTimeRanges.reduce(function (acc, excludedTimeRange) {
        return arrayUtils.flatten(acc.map(function (currentTimeRange) {
            return currentTimeRange.exceptTimeRange(excludedTimeRange);
        }));
    }, [this]);

    return TimeRange.getSortedTimeRanges(result);
};

TimeRange.prototype.toTheLeftFrom = function (range) {
    return this.to <= range.from;
};

TimeRange.prototype.isIntersectedWith = function (range) {
    return this.from <= range.to && this.to >= range.from;
};

TimeRange.prototype.intersectWith = function (range) {
    if (!this.isIntersectedWith(range)) {
        return;
    }

    return new TimeRange(Math.max(this.from, range.from), Math.min(this.to, range.to));
};

TimeRange.getSortedTimeRanges = function (timeRanges) {
    return [].concat(timeRanges).sort(function (a, b) {
        return a.from - b.from;
    });
};

TimeRange.intersectTimeRanges = function (a, b) {
    a = TimeRange.getSortedTimeRanges(a);
    b = TimeRange.getSortedTimeRanges(b);

    var result = [];
    for (var i = 0, j = 0; i < a.length && j < b.length;) {
        if (a[i].toTheLeftFrom(b[j])) {
            i++;
            continue;
        }
        if (b[j].toTheLeftFrom(a[i])) {
            j++;
            continue;
        }
        result.push(a[i].intersectWith(b[j]));
        if (a[i].to < b[j].to) {
            i++;
        } else {
            j++;
        }
    }

    return result;
};

module.exports = TimeRange;
