'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TimeRange = require('./TimeRange.js');

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

function findAppropriateTimeRange(allTime, desiredDuration, laterThan) {
    var timeRange = allTime[0];
    if (laterThan !== undefined) {
        for (var timeRangeIndex = 1;
            timeRangeIndex < allTime.length && timeRange.to - laterThan < desiredDuration;
            timeRangeIndex++) {
            timeRange = allTime[timeRangeIndex];
        }
        if (timeRange.to - laterThan < desiredDuration) {
            return undefined;
        }
        laterThan = Math.max(laterThan, timeRange.from);
        timeRange = new TimeRange(laterThan, laterThan + desiredDuration);
    }

    return timeRange;
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
function getBusyTimeRanges(schedule, bankTimeZone) {
    return flatten(Object.keys(schedule).map(function (key) {
        return schedule[key].map(function (interval) {
            return new TimeRange(getTimeInMinutes(interval.from, bankTimeZone),
                getTimeInMinutes(interval.to, bankTimeZone));
        });
    }));
}

function getBankWorkingTimeRanges(workingHours) {
    var from = getTimeInMinutes(workingHours.from);
    var to = getTimeInMinutes(workingHours.to);

    return Object.keys(DAY_TO_MINUTES).map(function (day) {
        return new TimeRange(DAY_TO_MINUTES[day] + from, DAY_TO_MINUTES[day] + to);
    });
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

    var allTimeRange = new TimeRange(DAY_TO_MINUTES['ПН'], DAY_TO_MINUTES['ЧТ']);
    var availableTimeRanges = TimeRange.intersectTimeRanges(
        allTimeRange.exceptTimeRanges(getBusyTimeRanges(schedule, bankTimeZone)),
        getBankWorkingTimeRanges(workingHours)
    );
    var appropriateTimeRanges = availableTimeRanges
        .filter(function (timeRange) {
            return timeRange.getDuration() >= duration;
        })
        .sort(TimeRange.comparator);

    var currentMoment = findAppropriateTimeRange(appropriateTimeRanges, duration);

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
            var hours = normalizeTime(parseInteger((currentMoment.from % MINUTES_IN_DAY) /
                MINUTES_IN_HOUR));
            var minutes = normalizeTime(currentMoment.from % MINUTES_IN_HOUR);

            return template.replace('%HH', hours)
                .replace('%MM', minutes)
                .replace('%DD',
                    Object.keys(DAY_TO_MINUTES)[parseInteger(currentMoment.from / MINUTES_IN_DAY)]);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            if (!this.exists()) {
                return false;
            }
            var nextMoment = findAppropriateTimeRange(appropriateTimeRanges,
                duration, currentMoment.from + MINUTES_IN_HOUR / 2);
            if (nextMoment === undefined) {
                return false;
            }
            currentMoment = nextMoment;

            return true;
        }
    };
};
