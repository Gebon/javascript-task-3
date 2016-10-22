'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var timeRegex = /(([А-Я]{2})\s)?(\d{2}):(\d{2})\+(\d+)/;
var dayToMinutes = {
    'ПН': 0,
    'ВТ': 24 * 60,
    'СР': 2 * 24 * 60
};

function getTime(input, bankTimeZone) {
    var timePattern = input.match(timeRegex);
    var timeZone = parseInt(timePattern[5]);
    if (bankTimeZone === undefined) {
        bankTimeZone = timeZone;
    }

    return dayToMinutes[timePattern[2]] +
        (parseInt(timePattern[3]) + bankTimeZone - timeZone) * 60 +
        parseInt(timePattern[4]);
}

function intersect(a, b) {
    var ai = 0;
    var bi = 0;
    var result = [];

    while (ai < a.length && bi < b.length) {
        if (a[ai] < b[bi]) {
            ai++;
        } else if (a[ai] > b[bi]) {
            bi++;
        } else {
            result.push(a[ai]);
            ai++;
            bi++;
        }
    }

    return result;
}

function difference(a1, a2) {
    var a = [];
    var diff = [];

    for (var i1 = 0; i1 < a1.length; i1++) {
        a[a1[i1]] = true;
    }

    for (var i2 = 0; i2 < a2.length; i2++) {
        if (a[a2[i2]]) {
            delete a[a2[i2]];
        } else {
            a[a2[i2]] = true;
        }
    }

    Object.keys(a).forEach(function (key) {
        diff.push(parseInt(key));
    });

    return diff;
}

function getUnique(arr) {
    var u = {};
    var a = [];
    for (var i = 0, l = arr.length; i < l; ++i) {
        if (u.hasOwnProperty(arr[i])) {
            continue;
        }
        a.push(arr[i]);
        u[arr[i]] = 1;
    }

    return a;
}

function range(from, to) {
    return [].concat(Array.apply(null, Array(to - from)).map(function (_, i) {
        return from + i;
    }));
}

function findStartIndex(allTime, laterThan) {
    var startIndex = 0;
    var start = allTime[startIndex];
    if (laterThan !== undefined) {
        for (startIndex = 1; startIndex < allTime.length && start < laterThan; startIndex++) {
            start = allTime[startIndex];
        }
        if (start < laterThan) {
            return undefined;
        }
    }

    return startIndex - 1;
}

function findConsecutiveTimeStart(allTime, duration, laterThan) {
    if (allTime.length <= duration + 1) {
        return undefined;
    }
    var startIndex = findStartIndex(allTime, laterThan);
    var start = allTime[startIndex];
    var currentDuration = 0;
    for (var i = startIndex; i < allTime.length && currentDuration !== duration; i++) {
        if (allTime[i] !== start + currentDuration) {
            start = allTime[i];
            currentDuration = 0;
        }
        currentDuration++;
    }
    if (currentDuration < duration) {
        return undefined;
    }

    return start;
}

function normalizeTime(time) {
    time = time.toString();
    if (time.length === 1) {
        time = '0' + time;
    }

    return time;
}

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var availableTime = range(0, 3 * 24 * 60);
    var bankTimeZone = parseInt(workingHours.from.match(timeRegex)[5]);

    var busyTime = [];
    Object.keys(schedule).forEach(function (key) {
        schedule[key].forEach(function (interval) {
            var intervalValues =
                range(getTime(interval.from, bankTimeZone), getTime(interval.to, bankTimeZone));
            busyTime = busyTime.concat(intervalValues);
        });
    });
    busyTime = getUnique(busyTime.sort());
    availableTime = difference(availableTime, busyTime);

    var from = getTime('ПН ' + workingHours.from);
    var to = getTime('ПН ' + workingHours.to);
    var workingRange = [];
    Object.keys(dayToMinutes).forEach(function (day) {
        workingRange = workingRange.concat(range(dayToMinutes[day] + from, dayToMinutes[day] + to));
    });
    availableTime = intersect(availableTime, workingRange);
    var currentMoment = findConsecutiveTimeStart(availableTime, duration);

    var fs = require('fs');
    fs.writeFile('d:\\output.txt', availableTime);

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return currentMoment !== undefined;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {
                return '';
            }
            var hours = normalizeTime(parseInt((currentMoment % (24 * 60)) / 60));
            var minutes = normalizeTime(currentMoment % 60);

            return template.replace('%HH', hours)
                .replace('%MM', minutes)
                .replace('%DD', Object.keys(dayToMinutes)[parseInt(currentMoment / (24 * 60))]);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var nextMoment = findConsecutiveTimeStart(availableTime, duration, currentMoment + 30);
            if (nextMoment === undefined) {
                return false;
            }
            currentMoment = nextMoment;

            return true;
        }
    };
};
