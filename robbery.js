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
    'СР': 2 * 24 * 60,
    'ЧТ': 3 * 24 * 60
};

function parseInteger(value) {
    return parseInt(value, 10);
}

function getTimeInMinutes(input, bankTimeZone) {
    var timePattern = input.match(timeRegex);
    var timeZone = parseInteger(timePattern[5]);
    if (bankTimeZone === undefined) {
        bankTimeZone = timeZone;
    }

    return (dayToMinutes[timePattern[2]] || 0) +
        (parseInteger(timePattern[3]) + bankTimeZone - timeZone) * 60 +
        parseInteger(timePattern[4]);
}

function intersect(a, b) {
    var result = [];
    for (var i = 0, j = 0; i < a.length && j < b.length; i++, j++) {
        if (a[i] < b[j]) {
            j--;
        } else if (a[i] > b[j]) {
            i--;
        } else {
            result.push(a[i]);
        }
    }

    return result;
}

function except(a, b) {
    var result = {};

    for (var i = 0; i < a.length; i++) {
        result[a[i]] = true;
    }

    for (var j = 0; j < b.length; j++) {
        if (result[b[j]]) {
            delete result[b[j]];
        }
    }

    return Object.keys(result).map(function (key) {
        return parseInteger(key);
    });
}

function getUnique(array) {
    var result = {};
    for (var i = 0, l = array.length; i < l; ++i) {
        result[array[i]] = true;
    }

    return Object.keys(result).map(function (key) {
        return parseInteger(key);
    });
}

function range(from, to) {
    return [].concat(Array.apply(null, Array(to - from)).map(function (_, i) {
        return from + i;
    }));
}

function findSearchStartIndex(allTime, laterThan) {
    var searchStartIndex = 0;
    if (laterThan !== undefined) {
        var startTime = allTime[searchStartIndex];
        for (searchStartIndex = 1;
            searchStartIndex < allTime.length && startTime < laterThan;
            searchStartIndex++) {
            startTime = allTime[searchStartIndex];
        }
        if (startTime < laterThan) {
            return undefined;
        }
        searchStartIndex -= 1;
    }

    return searchStartIndex;
}

function findStartTime(allTime, searchStartIndex, desiredDuration) {
    var startTime = allTime[searchStartIndex];
    var currentDuration = 0;
    for (var i = searchStartIndex; i < allTime.length && currentDuration !== desiredDuration; i++) {
        if (allTime[i] !== startTime + currentDuration) {
            startTime = allTime[i];
            currentDuration = 0;
        }
        currentDuration++;
    }
    if (currentDuration < desiredDuration) {
        return undefined;
    }

    return startTime;
}

function findStartOfConsecutiveTimeRange(allTime, desiredDuration, laterThan) {
    if (allTime.length <= desiredDuration + 1) {
        return undefined;
    }
    var searchStartIndex = findSearchStartIndex(allTime, laterThan);
    if (searchStartIndex === undefined) {
        return undefined;
    }

    return findStartTime(allTime, searchStartIndex, desiredDuration);
}

function normalizeTime(time) {
    return (time < 10 ? '0' : '') + time;
}

function flatten(arrays) {
    return [].concat.apply([], arrays);
}

/**
 * @param {Object} schedule - Расписание Банды
 * @param {Number} bankTimeZone - Временная зона банка
 * @returns {Array<Number>} - Времена, когда Банда занята
 */
function getBusyTime(schedule, bankTimeZone) {
    return getUnique(flatten(Object.keys(schedule).map(function (key) {
        return flatten(schedule[key].map(function (interval) {
            return range(getTimeInMinutes(interval.from, bankTimeZone),
                getTimeInMinutes(interval.to, bankTimeZone));
        }));
    })).sort());
}

function getBankWorkingTime(workingHours) {
    var from = getTimeInMinutes(workingHours.from);
    var to = getTimeInMinutes(workingHours.to);

    return flatten(Object.keys(dayToMinutes).map(function (day) {
        return range(dayToMinutes[day] + from, dayToMinutes[day] + to);
    }));
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
    var bankTimeZone = parseInteger(workingHours.from.match(timeRegex)[5]);

    var availableTime = intersect(
        except(
            range(dayToMinutes['ПН'], dayToMinutes['ЧТ']),
            getBusyTime(schedule, bankTimeZone)
        ),
        getBankWorkingTime(workingHours)
    );

    var currentMoment = findStartOfConsecutiveTimeRange(availableTime, duration);

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
            var hours = normalizeTime(parseInteger((currentMoment % (24 * 60)) / 60));
            var minutes = normalizeTime(currentMoment % 60);

            return template.replace('%HH', hours)
                .replace('%MM', minutes)
                .replace('%DD', Object.keys(dayToMinutes)[parseInteger(currentMoment / (24 * 60))]);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var nextMoment = findStartOfConsecutiveTimeRange(availableTime,
                duration, currentMoment + 30);
            if (nextMoment === undefined) {
                return false;
            }
            currentMoment = nextMoment;

            return true;
        }
    };
};
