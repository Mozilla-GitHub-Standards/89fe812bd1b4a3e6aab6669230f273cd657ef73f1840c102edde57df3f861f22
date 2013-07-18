/*jshint forin:false, plusplus:false, sub:true */
define([
    'zepto',
    'jed',
    'routers/app'
], function($, Jed, AppRouter) {
    'use strict';

    // Globals used throughout the app, accessible via window.GLOBALS.
    var GLOBALS = {
        DATABASE_NAME: 'around',
        HAS: {
            nativeScroll: (function() {
                return 'WebkitOverflowScrolling' in window.document.createElement('div').style;
            })()
        },
        LANGUAGE: window.navigator.language, // HACK: Better way for this, I assume?
        MAX_DOWNLOADS: 2, // Maximum number of podcast downloads at one time.
        OBJECT_STORE_NAME: 'around'
    };
    window.GLOBALS = GLOBALS;

    // Called by main.js to kick off the app loading. We make sure IndexedDB is
    // available, load up our locale files, then actually start loading in
    // views.
    function initialize(loadAppCallback) {
        if (GLOBALS.HAS.nativeScroll) {
            $('body').addClass('native-scroll');
        }

        setLanguage(function() {
            // Load the router; we're off to the races!
            var router = new AppRouter();
            window.router = router;

            Backbone.history.start();
        });
    }

    // Format a time in seconds to a pretty 5:22:75 style time. Cribbed from
    // the Gaia Music app.
    function formatTime(secs) {
        if (isNaN(secs)) {
            return '--:--';
        }

        var hours = parseInt(secs / 3600, 10) % 24;
        var minutes = parseInt(secs / 60, 10) % 60;
        var seconds = parseInt(secs % 60, 10);

        return '{hours}{minutes}:{seconds}'.format({
            hours: hours !== 0 ? hours + ':' : '',
            minutes: minutes < 10 ? '0' + minutes : minutes,
            seconds: seconds < 10 ? '0' + seconds : seconds
        });
    }
    window.formatTime = formatTime;

    // Return gettext-style strings as they were supplied. An easy way to mock
    // out gettext calls, in case no locale data is available.
    function mockL10n() {
        window._l10n = null;
        window.l = function(key) {
            return key;
        };
    }

    // Set the language of the app and retrieve the proper localization files.
    // This could be improved, but for now works fine.
    function setLanguage(callback, override) {
        var request = new window.XMLHttpRequest();

        request.open('GET', 'locale/{lang}.json'.format({
            lang: override || GLOBALS.LANGUAGE
        }), true);

        request.addEventListener('load', function(event) {
            if (request.status === 200) {
                // Alias _ for gettext-style l10n jazz.
                var l10n = new Jed({
                    locale_data: JSON.parse(request.response)
                });

                // TODO: This seems a bit hacky; maybe we can do better?
                window._l10n = l10n;
                window.l = function(key) {
                    return l10n.gettext(key);
                };

                // Localize any data not rendered by EJS templates, eg. stuff
                // in index.html (currently just the <title> tag).
                // TODO: Allow our localization files to pickup on these
                // attributes, which currently we just get lucky with as they
                // are found elsewhere.
                $('[data-l10n]').each(function() {
                    $(this).text(window.l($(this).data('l10n')));
                });
            } else {
                mockL10n();
            }

            if (callback) {
                callback();
            }
        });

        try {
            request.send();
        } catch (e) {
            console.log(e);
            mockL10n();
        }
    }

    // Return a timestamp from a JavaScript Date object. If no argument is
    // supplied, return the timestamp for "right now".
    function timestamp(date) {
        if (!date) {
            date = new Date();
        }

        return Math.round(date.getTime() / 1000);
    }
    window.timestamp = timestamp;

    return {
        initialize: initialize
    };
});
