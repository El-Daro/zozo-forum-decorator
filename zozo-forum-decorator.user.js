// ==UserScript==
// @name         ZOZO Forum Decorator
// @namespace    https://github.com/El-Daro/zozo-forum-decorator
// @version      1.1.0
// @description  Makes some utility fonts readable for the ZOZO forum.
// @author       El Daro
// @match        http*://forum.zozo.gg/*
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// @downloadURL  https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// ==/UserScript==

//--------------------------------------------------------------------
// CSS

//----------------------------------
//  Colors:
//    #334734    | Slightly-greenish (ZOZO style color)
//    #5a845a    | More greenish (ZOZO style color)
//    #800000    | Maroon (dark red)
//    #8C8C8C    | Light-grey
//----------------------------------

// Same as original, except changed the border-left-color to ZOZO style
GM_addStyle (`
    .messageNotice.messageNotice--highlighted {
        color: #141414;
        background: #eff3ef;
        border-left-color: #5a845a;
    }
`)

// Same as original, except changed the color to ZOZO style
GM_addStyle (`
    .messageNotice.messageNotice--highlighted:before {
        color: #5a845a !important;
    }
`);

// Custom class for 'Deleted by' part of the description for deleted messages
GM_addStyle (`
    .messageNotice--deletedHighlighted {
        color:    maroon !important;
    }
`);

// Date (after 'Deleted by')
GM_addStyle (`
    .messageNotice--deleted .u-dt[title] {
        color:    #8C8C8C !important;
    }
`);

//--------------------------------------------------------------------
// JavaScript

(function() {

    //--------------------------------------------------
    // Definitions
    const UNREADABLE_MESSAGES_MAP = new Map([
        ["warnings", ".messageNotice--warning"],
        ["moderated", ".messageNotice--moderated"],
        ["deleted", ".messageNotice--deleted"]
    ]);
    const HIGHLIGHT_MAP = new Map([
        ["normal", "messageNotice--highlighted"],
        ["deletedby", "messageNotice--deletedHighlighted"]
    ]);

    const DELETED_BY_TEMPLATE = "Deleted by|Удалил";
    const DELETED_CONTAINER_STYLE = ".message--deleted";

    //--------------------------------------------------
    // Functions

    // Adds a class to all the elements with selected one (used to fix unreadable fonts)
    function addClassToClasses(selectedClass, addedClass) {
        const elements = document.querySelectorAll(selectedClass);
        for (const element of elements.values()) {
            if (!element.classList.contains(addedClass)) {
                element.classList.add(addedClass);
            }
        }
    }

    // Adds a class to all the selected elements (used to fix unreadable fonts)
    function addClassToElements(elements, addedClass) {
        for (const element of elements.values()) {
            if (!element.classList.contains(addedClass)) {
                element.classList.add(addedClass);
            }
        }
    }

    // Special treatment for the 'Deleted by' line. Makes it red
    function colorizeDeletedBy(elements, addedClass) {
        const regexDeletedBy = new RegExp(DELETED_BY_TEMPLATE);

        for (const element of elements.values()) {
            for (const childNode of element.childNodes[1].childNodes) {
                if (regexDeletedBy.test(childNode.innerHTML)) {
                    childNode.classList.add(addedClass);
                    break;
                }
            }
        }
    }

    function getUnreadableElementsMap() {
        const elementsMap = new Map();
        for (const entry of UNREADABLE_MESSAGES_MAP) {
            elementsMap.set(entry[0], document.querySelectorAll(entry[1]));
        }
        return elementsMap;
    }

    function highlightTextMap(elementsMap) {
        for (const elementsPair of elementsMap) {
            addClassToElements(elementsPair[1], HIGHLIGHT_MAP.get('normal')); // "messageNotice--highlighted");
            if (elementsPair[0] == 'deleted') {
                colorizeDeletedBy(elementsPair[1], HIGHLIGHT_MAP.get('deletedby')); // "messageNotice--deletedHighlighted");
            }
        }
    }

    function restyle() {
        const elementsMap = getUnreadableElementsMap();
        highlightTextMap(elementsMap);
    }

    // Observer function. Executes whenever the content we watch was changed (in this case, a deleted message expanded)
    function processChanges(records, observer) {
        for (const record of records) {
            if (record.type === 'childList') {
                for (const addedNode of record.addedNodes) {
                    const newNode = addedNode.querySelector(UNREADABLE_MESSAGES_MAP.get('deleted'));
                    addClassToElements([newNode], HIGHLIGHT_MAP.get('normal')); // "messageNotice--highlighted");
                    colorizeDeletedBy([newNode], HIGHLIGHT_MAP.get('deletedby')); // "messageNotice--deletedHighlighted");
                }
                // If it was the last element to observe, stop the observer
                const container = document.querySelector(DELETED_CONTAINER_STYLE);
                if (container == null) {
                    const observedNode = record.target;
                    console.log(`Observer stopped for <${observedNode.nodeName} class='${observedNode.className}'> at ${observedNode.baseURI}.`);
                    console.log(`No more deleted messages to expand.`);
                    observer.disconnect();
                }
            }
        }
    }

    function main() {
        restyle();
        // See if there are any deleted messages on the page
        const deletedMessage = document.querySelector(DELETED_CONTAINER_STYLE);
        if (deletedMessage !== null) {
            const container = deletedMessage.parentNode;
            const observerOptions = {
                attributes: false,
                childList: true,
                subtree: false,
            };
            // Start an observer that will detect changes to the DOM (a deleted message being expanded).
            const observer = new MutationObserver(processChanges);
            observer.observe(container, observerOptions);

            console.log(`Initiated an observer for <'${container.nodeName}' class='${container.className}'> at '${container.baseURI}'`);
        }
    }

    function ready(func) {
        if (document.readyState !== 'loading') {
            func();
            return;
        }
        document.addEventListener('DOMContentLoaded', func);
    }

    // Use it, if for some reason decided to run at start (see @run-at)
    //ready(main);
    main();
})();
