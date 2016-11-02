'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TimeRange = require('./TimeRange.js');
var utils = require('./utils.js');

var TIME_REGEX = /(?:([ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС]{2})\s)?(\d{2}):(\d{2})\+(\d{1,2})/;
var MINUTES_IN_HOUR = 60;
var MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;
var DAYS_OF_WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function convertDayToMinutes(dayOfWeek) {
    return DAYS_OF_WEEK.indexOf(dayOfWeek) * MINUTES_IN_DAY;
}

function convertHoursToMinutes(hours) {
    return hours * MINUTES_IN_HOUR;
}

function parseDate(dateAsString) {
    var timePattern = dateAsString.match(TIME_REGEX);

    return {
        dayOfWeek: timePattern[1],
        hours: parseInt(timePattern[2]),
        minutes: parseInt(timePattern[3]),
        timeZone: parseInt(timePattern[4])
    };
}

function getTimeInMinutes(input, bankTimeZone) {
    var date = parseDate(input);
    if (bankTimeZone === undefined) {
        bankTimeZone = date.timeZone;
    }

    return convertDayToMinutes(date.dayOfWeek) +
        convertHoursToMinutes(date.hours + bankTimeZone - date.timeZone) +
        date.minutes;
}

function findAppropriateTimeRange(allTime, desiredDuration, minutesLater) {
    var timeRange = allTime[0];
    if (minutesLater && timeRange) {
        var tmpTimeRange = TimeRange.fromAnother(timeRange);
        tmpTimeRange.from += minutesLater;
        if (tmpTimeRange.getDuration() >= desiredDuration) {
            allTime[0] = tmpTimeRange;
        } else {
            allTime.shift();
        }
        timeRange = allTime[0];
    }

    return timeRange;
}

function formatNumber(time) {
    return (time < 10 ? '0' : '') + time;
}

/**
 * @param {Object} schedule - Расписание Банды
 * @param {Number} bankTimeZone - Временная зона банка
 * @returns {Array<Number>} - Времена, когда Банда занята
 */
function getBusyTimeRanges(schedule, bankTimeZone) {
    return utils.flatten(Object.keys(schedule).map(function (key) {
        return schedule[key].map(function (interval) {
            return new TimeRange(getTimeInMinutes(interval.from, bankTimeZone),
                getTimeInMinutes(interval.to, bankTimeZone));
        });
    }));
}

function getBankWorkingTimeRanges(workingHours) {
    var from = getTimeInMinutes(workingHours.from);
    var to = getTimeInMinutes(workingHours.to);

    return DAYS_OF_WEEK.map(function (dayOfWeek) {
        return new TimeRange(convertDayToMinutes(dayOfWeek) + from,
            convertDayToMinutes(dayOfWeek) + to);
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
    var bankTimeZone = parseDate(workingHours.from).timeZone;

    var allTimeRange = new TimeRange(convertDayToMinutes('ПН'), convertDayToMinutes('ЧТ'));
    var availableTimeRanges = TimeRange.intersectTimeRanges(
        allTimeRange.exceptTimeRanges(getBusyTimeRanges(schedule, bankTimeZone)),
        getBankWorkingTimeRanges(workingHours)
    );
    var appropriateTimeRanges = TimeRange.getSortedTimeRanges(availableTimeRanges
        .filter(function (timeRange) {
            return timeRange.getDuration() >= duration;
        }));

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
            var dayOfWeek = DAYS_OF_WEEK[Math.floor(currentMoment.from / MINUTES_IN_DAY)];
            var hours = formatNumber(Math.floor((currentMoment.from % MINUTES_IN_DAY) /
                MINUTES_IN_HOUR));
            var minutes = formatNumber(currentMoment.from % MINUTES_IN_HOUR);

            return template
                .replace('%HH', hours)
                .replace('%MM', minutes)
                .replace('%DD', dayOfWeek);
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
                duration, MINUTES_IN_HOUR / 2);
            if (!nextMoment) {
                return false;
            }
            currentMoment = nextMoment;

            return true;
        }
    };
};
