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

function getTimeInMinutes(input, bankTimeZone) {
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

function difference(a, b) {
    var tmpStorage = [];
    var result = [];

    for (var i = 0; i < a.length; i++) {
        tmpStorage[a[i]] = true;
    }

    for (var j = 0; j < b.length; j++) {
        if (tmpStorage[b[j]]) {
            delete tmpStorage[b[j]];
        } else {
            tmpStorage[b[j]] = true;
        }
    }

    Object.keys(tmpStorage).forEach(function (key) {
        result.push(parseInt(key));
    });

    return result;
}

function getUnique(array) {
    var uniqueIndicator = {};
    var result = [];
    for (var i = 0, l = array.length; i < l; ++i) {
        if (uniqueIndicator.hasOwnProperty(array[i])) {
            continue;
        }
        result.push(array[i]);
        uniqueIndicator[array[i]] = 1;
    }

    return result;
}

function range(from, to) {
    return [].concat(Array.apply(null, Array(to - from)).map(function (_, i) {
        return from + i;
    }));
}

function findStartIndex(allTime, laterThan) {
    var startIndex = 0;
    if (laterThan !== undefined) {
        var start = allTime[startIndex];
        for (startIndex = 1; startIndex < allTime.length && start < laterThan; startIndex++) {
            start = allTime[startIndex];
        }
        if (start < laterThan) {
            return undefined;
        }
        startIndex -= 1;
    }

    return startIndex;
}

function findStartTime(allTime, startIndex, desiredDuration) {
    var start = allTime[startIndex];
    var currentDuration = 0;
    for (var i = startIndex; i < allTime.length && currentDuration !== desiredDuration; i++) {
        if (allTime[i] !== start + currentDuration) {
            start = allTime[i];
            currentDuration = 0;
        }
        currentDuration++;
    }
    if (currentDuration < desiredDuration) {
        return undefined;
    }

    return start;
}

function findConsecutiveTimeStart(allTime, desiredDuration, laterThan) {
    if (allTime.length <= desiredDuration + 1) {
        return undefined;
    }
    var startIndex = findStartIndex(allTime, laterThan);
    if (startIndex === undefined) {
        return undefined;
    }

    return findStartTime(allTime, startIndex, desiredDuration);
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
            var intervalValues = range(getTimeInMinutes(interval.from, bankTimeZone),
                getTimeInMinutes(interval.to, bankTimeZone));
            busyTime = busyTime.concat(intervalValues);
        });
    });
    busyTime = getUnique(busyTime.sort());
    availableTime = difference(availableTime, busyTime);

    var from = getTimeInMinutes('ПН ' + workingHours.from);
    var to = getTimeInMinutes('ПН ' + workingHours.to);
    var workingRange = [];
    Object.keys(dayToMinutes).forEach(function (day) {
        workingRange = workingRange.concat(range(dayToMinutes[day] + from, dayToMinutes[day] + to));
    });
    availableTime = intersect(availableTime, workingRange);
    var currentMoment = findConsecutiveTimeStart(availableTime, duration);

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
