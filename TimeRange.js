'use strict';

function TimeRange(from, to) {
    this.from = from;
    this.to = to;
}

TimeRange.prototype.exceptTimeRange = function (other) {
    if (!this.intersectsWith(other)) {
        return [this];
    }
    var result = [];
    if (this.from < other.from) {
        result.push(new TimeRange(this.from, other.from));
    }
    if (other.to < this.to) {
        result.push(new TimeRange(other.to, this.to));
    }

    return result;
};

TimeRange.prototype.exceptTimeRanges = function (others) {
    return TimeRange.sortTimeRanges(others.reduce(function (acc, excludedTimeRange) {
        return flatten(acc.map(function (currentTimeRange) {
            return currentTimeRange.exceptTimeRange(excludedTimeRange);
        }));
    }, [this]));
};

TimeRange.prototype.toTheLeftFrom = function (other) {
    return this.to <= other.from;
};

TimeRange.prototype.intersectsWith = function (other) {
    return !(this.toTheLeftFrom(other) || other.toTheLeftFrom(this));
};

TimeRange.prototype.intersect = function (other) {
    if (!this.intersectsWith(other)) {
        return undefined;
    }

    return new TimeRange(Math.max(this.from, other.from), Math.min(this.to, other.to));
};

TimeRange.prototype.getDuration = function () {
    return this.to - this.from;
};

TimeRange.comparator = function (a, b) {
    return a.from - b.from;
};

TimeRange.sortTimeRanges = function (timeRanges) {
    return timeRanges.concat().sort(TimeRange.comparator);
};

TimeRange.intersectTimeRanges = function (a, b) {
    a = TimeRange.sortTimeRanges(a);
    b = TimeRange.sortTimeRanges(b);

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
        result.push(a[i].intersect(b[j]));
        if (a[i].to < b[j].to) {
            i++;
        } else {
            j++;
        }
    }

    return result;
};

function flatten(arrays) {
    return [].concat.apply([], arrays);
}

module.exports = TimeRange;
