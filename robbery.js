'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var TimeRange = require('./TimeRange.js');
var arrayUtils = require('./arrayUtils.js');

var MINUTES_IN_HOUR = 60;
var MINUTES_IN_DAY = 24 * MINUTES_IN_HOUR;
var DAYS_OF_WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

/**
 * @param {Number} dayOfWeek
 * @returns {Number} - день недели в минутах с начала недели
 */
function convertDayToMinutes(dayOfWeek) {
    return DAYS_OF_WEEK.indexOf(dayOfWeek) * MINUTES_IN_DAY;
}

/**
 * @param {Number} hours
 * @returns {Number} - часы в минутах с начала дня
 */
function convertHoursToMinutes(hours) {
    return hours * MINUTES_IN_HOUR;
}

/**
 * @param {String} dateAsString - входная дата в виде строки
 * @returns {Object}
 */
function parseDate(dateAsString) {
    var TIME_REGEX = /(?:([ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС]{2})\s)?(\d{2}):(\d{2})\+(\d{1,2})/;
    var timePattern = dateAsString.match(TIME_REGEX);

    return {
        dayOfWeek: timePattern[1],
        hours: parseInt(timePattern[2]),
        minutes: parseInt(timePattern[3]),
        timeZone: parseInt(timePattern[4])
    };
}

/**
 * @param {String} input - входная дата в виде строки
 * @param {Number} targetTimeZone - целевая временная зона
 * @returns {Number} - время в минутх с начала недели, соответствующее входной дате
 */
function getTimeInMinutes(input, targetTimeZone) {
    var date = parseDate(input);
    if (targetTimeZone === undefined) {
        targetTimeZone = date.timeZone;
    }

    return convertDayToMinutes(date.dayOfWeek) +
        convertHoursToMinutes(date.hours + targetTimeZone - date.timeZone) +
        date.minutes;
}

/**
 * @param {Array<TimeRange>} allTime - все доступные временные интервалы
 * @param {Number} desiredDuration - длительность временного интервала
 * @param {Number} minutesLater - время в минутах
 * @returns {TimeRange | null} - найденный временной интервал, либо null, если интервал не найден
 */
function findAppropriateTimeRange(allTime, desiredDuration, minutesLater) {
    var timeRange = allTime[0];
    if (minutesLater && timeRange) {
        var candidateTimeRange = TimeRange.fromAnother(timeRange);
        candidateTimeRange.from += minutesLater;
        if (candidateTimeRange.duration >= desiredDuration) {
            allTime[0] = candidateTimeRange;
        } else {
            allTime.shift();
        }
        timeRange = allTime[0];
    }

    return timeRange || null;
}

/**
 * @param {Number} number - число для форматирования
 * @returns {String} - форматированное время
 */
function formatNumber(number) {
    return (number < 10 ? '0' : '') + number;
}

/**
 * @param {Object} schedule - Расписание Банды
 * @param {Number} bankTimeZone - Временная зона банка
 * @returns {Array<Number>} - Времена, когда Банда занята
 */
function getBusyTimeRanges(schedule, bankTimeZone) {
    function convertScheduleIntervalToTimeRange(interval) {
        return new TimeRange(getTimeInMinutes(interval.from, bankTimeZone),
            getTimeInMinutes(interval.to, bankTimeZone));
    }

    function convertScheduleEntryToTimeRanges(key) {
        return schedule[key].map(convertScheduleIntervalToTimeRange);
    }

    var result = Object.keys(schedule).map(convertScheduleEntryToTimeRanges);

    return arrayUtils.flatten(result);
}

/**
 * @param {Object} workingHours - Время работы банка
 * @returns {Array<TimeRange>} - Время работы банка, выраженное с помощью TimeRange
 */
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
            return timeRange.duration >= duration;
        }));

    var currentMoment = findAppropriateTimeRange(appropriateTimeRanges, duration);

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return currentMoment !== null;
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
