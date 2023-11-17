// ==UserScript==
// @name         ZOZO Forum Decorator
// @namespace    https://github.com/El-Daro/zozo-forum-decorator
// @version      0.3
// @description  Makes some utility fonts readable for the ZOZO forum.
// @author       El Daro
// @match        http*://forum.zozo.gg/*
// @grant        GM_addStyle
// @run-at       document-start
// @updateURL    https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// @downloadURL  https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// ==/UserScript==

// CSS
//  'Deleted by' text (#334734)
GM_addStyle (`
    .messageNotice.messageNotice--deleted {
        color: #0000ff !important;
    }
`);
