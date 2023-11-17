// ==UserScript==
// @name         ZOZO Forum Decorator
// @namespace    https://github.com/El-Daro/zozo-forum-decorator
// @version      0.1
// @description  Makes some utility fonts readable for the ZOZO forum.
// @author       El Daro
// @match        http*://forum.zozo.gg/*
// @grant        GM_addStyle
// @run-at       document-start
// @updateURL    https://github.com/El-Daro/zozo-forum-decorator/zozo-forum-decorator.user.js
// @downloadURL  https://github.com/El-Daro/zozo-forum-decorator/zozo-forum-decorator.user.js
// ==/UserScript==

// CSS
//  'Deleted by' text
GM_addStyle (`
    .messageNotice.messageNotice--deleted {
        color: #334734 !important;
    }
`);