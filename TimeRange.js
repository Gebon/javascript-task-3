'use strict';

function TimeRange(from, to) {
    this.from = from;
    this.to = to;

    return this;
}

TimeRange.prototype.exceptTimeRange = function (other) {
    if (!this.intersectsWith(other)) {
        return [this];
    }
    var result = [];
    if (other.to < this.to) {
        result.push(new TimeRange(other.to, this.to));
    }
    if (this.from < other.from) {
        result.push(new TimeRange(this.from, other.from));
    }

    return result.sort(TimeRange.comparator);
};

TimeRange.prototype.exceptTimeRanges = function (others) {
    var result = [this];
    others.forEach(function (excludedTimeRange) {
        result = flatten(result.map(function (currentTimeRange) {
            return currentTimeRange.exceptTimeRange(excludedTimeRange);
        }));
    });

    return result.sort(TimeRange.comparator);
};

TimeRange.prototype.lefterThan = function (other) {
    return this.to <= other.from;
};

TimeRange.prototype.intersectsWith = function (other) {
    return !(this.lefterThan(other) || other.lefterThan(this));
};

TimeRange.prototype.intersect = function (other) {
    if (!this.intersectsWith(other)) {
        return undefined;
    }

    return new TimeRange(Math.max(this.from, other.from), Math.min(this.to, other.to));
};

TimeRange.comparator = function (a, b) {
    return a.from - b.from;
};

TimeRange.intersectTimeRanges = function (a, b) {
    a = a.sort(TimeRange.comparator);
    b = b.sort(TimeRange.comparator);

    var result = [];
    for (var i = 0, j = 0; i < a.length && j < b.length;) {
        if (a[i].lefterThan(b[j])) {
            i++;
            continue;
        } else if (b[j].lefterThan(a[i])) {
            j++;
            continue;
        }
        result.push(a[i].intersect(b[j]));
        if (a[i].to < b[j].to) {
            i++;
        } else {
            j++;
        }
    }

    return result;
};

TimeRange.unifyTimeRanges = function (timeRanges) {
    timeRanges = timeRanges.sort(TimeRange.comparator);
    var result = [];
    var i = 1;
    for (; i < timeRanges.length; i++) {
        if (timeRanges[i - 1].to >= timeRanges[i].from) {
            timeRanges[i] = new TimeRange(timeRanges[i - 1].from, timeRanges[i].to);
        } else {
            result.push(timeRanges[i - 1]);
        }
    }
    result.push(timeRanges[i - 1]);

    return result;
};

function flatten(arrays) {
    return [].concat.apply([], arrays);
}

module.exports = TimeRange;
