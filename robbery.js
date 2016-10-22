'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TIME_REGEX = /(([А-Я]{2})\s)?(\d{2}):(\d{2})\+(\d+)/;
var MINUTES_IN_HOUR = 60;
var MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;

var DAY_TO_MINUTES = {
    'ПН': 0,
    'ВТ': MINUTES_IN_DAY,
    'СР': 2 * MINUTES_IN_DAY,
    'ЧТ': 3 * MINUTES_IN_DAY
};

function parseInteger(value) {
    return parseInt(value, 10);
}

function getTimeInMinutes(input, bankTimeZone) {
    var timePattern = input.match(TIME_REGEX);
    var timeZone = parseInteger(timePattern[5]);
    if (bankTimeZone === undefined) {
        bankTimeZone = timeZone;
    }

    return (DAY_TO_MINUTES[timePattern[2]] || 0) +
        (parseInteger(timePattern[3]) + bankTimeZone - timeZone) * MINUTES_IN_HOUR +
        parseInteger(timePattern[4]);
}

function intersectArrays(a, b) {
    return a.filter(function (value) {
        return b.indexOf(value) !== -1;
    });
}

/**
 * Функция для нахождения разности массивов: A\B. Сохраняет сортировку
 * @param {Array<T>} a - массив A из комментария
 * @param {Array<T>} b - массив B из комментария
 * @returns {Array<T>} - результирующий массив
 */
function except(a, b) {
    return a.filter(function (value) {
        return b.indexOf(value) === -1;
    });
}

function getUniqueValues(array) {
    var result = {};
    for (var i = 0, l = array.length; i < l; ++i) {
        result[array[i]] = true;
    }

    return Object.keys(result).map(function (key) {
        return parseInteger(key);
    });
}

/**
 * Функция для создания диапазона [from; to)
 * @param {Number} from - левая граница, включается в диапазон
 * @param {Number} to - правая граница, не включается в диапазон
 * @returns {Array<Number>} - созданный диапазон
 */
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
    return getUniqueValues(flatten(Object.keys(schedule).map(function (key) {
        return flatten(schedule[key].map(function (interval) {
            return range(getTimeInMinutes(interval.from, bankTimeZone),
                getTimeInMinutes(interval.to, bankTimeZone));
        }));
    })).sort());
}

function getBankWorkingTime(workingHours) {
    var from = getTimeInMinutes(workingHours.from);
    var to = getTimeInMinutes(workingHours.to);

    return flatten(Object.keys(DAY_TO_MINUTES).map(function (day) {
        return range(DAY_TO_MINUTES[day] + from, DAY_TO_MINUTES[day] + to);
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
    var bankTimeZone = parseInteger(workingHours.from.match(TIME_REGEX)[5]);

    var availableTime = intersectArrays(
        except(
            range(DAY_TO_MINUTES['ПН'], DAY_TO_MINUTES['ЧТ']),
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
            var hours = normalizeTime(parseInteger((currentMoment % MINUTES_IN_DAY) /
                MINUTES_IN_HOUR));
            var minutes = normalizeTime(currentMoment % MINUTES_IN_HOUR);

            return template.replace('%HH', hours)
                .replace('%MM', minutes)
                .replace('%DD',
                    Object.keys(DAY_TO_MINUTES)[parseInteger(currentMoment / MINUTES_IN_DAY)]);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var nextMoment = findStartOfConsecutiveTimeRange(availableTime,
                duration, currentMoment + MINUTES_IN_HOUR / 2);
            if (nextMoment === undefined) {
                return false;
            }
            currentMoment = nextMoment;

            return true;
        }
    };
};
