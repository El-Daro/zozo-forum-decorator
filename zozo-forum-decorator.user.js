// ==UserScript==
// @name         ZOZO Forum Decorator
// @namespace    https://github.com/El-Daro/zozo-forum-decorator
// @version      1.2.2
// @description  Improves user experience on ZOZO forum: makes some utility fonts readable, highlights links and so on.
// @author       El Daro
// @match        http*://forum.zozo.gg/*
// @grant        GM_addStyle
// @run-at       document-end
// @updateURL    https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// @downloadURL  https://github.com/El-Daro/zozo-forum-decorator/raw/main/zozo-forum-decorator.user.js
// ==/UserScript==

//-------------------------------------------------------------------------------------------------------------
//                                                     CSS                                                    |
//-------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------
//                             COLORS                         |
//-------------------------------------------------------------
//    #010AC6    | Dark blue
//    #115483    | Kinda blue
//    #141414    | Basically black (default for text)
//    #185886    | Kinda blue
//    #2577B1    | Light blue (classic link color)
//    #334734    | Slightly-greenish (ZOZO style color)
//    #5A845A    | More greenish (ZOZO style color)
//    #800000    | Maroon (dark red)
//    #8C8C8C    | Light-grey
//    #EFF3EF    | Almost grey, but with a scent of green
//-------------------------------------------------------------

//-------------------------------------------------------------
//                          VARIABLES                         |
//-------------------------------------------------------------
GM_addStyle (`
    :root {
        --text-color-default: #141414;
        --text-color-grey: #8C8C8C;

        --messageNotice-bkg-color: #EFF3EF;
        --messageNotice-deletedBy-color: maroon;
        --zozo-color-light: #5A845A;

        --link-color-default: #2577B1;
        --link-color-visited: #115483;
        --link-color-hover: #185886;
        --link-color-username: #010AC6;
    }
`);

//-------------------------------------------------------------
//                           CLASSES                          |
//-------------------------------------------------------------

//--------------------------------------
// Approval queue
//--------------------------------------

// Additional info for moderators on the approval queue page and the icon on the left.
// Same as original, except redefines the border-left-color to ZOZO style.
// Note that this class is added to some elements later on through JS
GM_addStyle (`
    .messageNotice.messageNotice--highlighted {
        color: var(--text-color-default);
        background: var(--messageNotice-bkg-color);
        border-left-color: var(--zozo-color-light);
    }

    .messageNotice.messageNotice--highlighted:before {
        color: var(--zozo-color-light) !important;
    }
`);

//--------------------------------------
// Deleted posts (info for moderators)
//--------------------------------------

// Custom classes for 'Deleted by' part of the description for deleted messages and Date (after 'Deleted by')
GM_addStyle (`
    .messageNotice--deletedHighlighted {
        color: var(--messageNotice-deletedBy-color) !important;
    }

    .messageNotice--deleted .u-dt[title] {
        color: var(--text-color-grey) !important;
    }
`);

//--------------------------------------
// Invisible text (miscellaneous)

// Current page number
GM_addStyle (`
    .pageNav-page.pageNav-page--current {
        color: inherit;
    }
`);

// 'Report' label
GM_addStyle (`
    .label.label--accent {
        color: var(--text-color-default) !important;
    }
`);

//--------------------------------------
// NOTIFICATIONS
//--------------------------------------

// Warning notification for when you are trying to delete a message(s) that will cause the whole thread to be deleted as well
GM_addStyle (`
    div.formInfoRow .blockMessage.blockMessage--important {
        color: var(--text-color-default) !important;
    }
`);

//--------------------------------------
// LINKS
//--------------------------------------

// User profile -> Latest activity | Recent content | About (Profile posts are covered by bbWrapper down below)
GM_addStyle (`
    .tabPanes.js-memberTabPanes [data-href$="/latest-activity"] .contentRow-title a:not(a.username),
    .tabPanes.js-memberTabPanes [data-href$="/recent-content"] .contentRow-title a,
    .tabPanes.js-memberTabPanes [data-href$="/about"] a {
        color: var(--link-color-default) !important;
    }
`);

// bbWrapper (covers most of the cases), Approval queue and Usernames mentioned in posts.
// NOTE: The style for usernames DOES NOT have 'visited' and 'hover' counter-part, nor it should
GM_addStyle (`
    .bbWrapper a:not(.bbCodeBlock-sourceJump, .username),
    .approvalQueue .pairs--columns a {
        color: var(--link-color-default) !important;
    }

    .bbWrapper a.username {
        color: var(--link-color-username) !important;
    }
`);

// Visited: Standard (limited to most of the users' posts and messages) and Approval queue
GM_addStyle (`
    .bbWrapper a:not(.bbCodeBlock-sourceJump, .username):visited,
    .approvalQueue .pairs--columns a:visited {
        color: var(--link-color-visited) !important;
    }
`);

// Hover: Standard (limited to most of the users' posts and messages) and Approval queue
GM_addStyle (`
    .bbWrapper a:not(.bbCodeBlock-sourceJump, .username):hover,
    .approvalQueue .pairs--columns a:hover {
        color: var(--link-color-hover) !important;
    }
`);


//-------------------------------------------------------------------------------------------------------------
//                                                  JavaScript                                                |
//-------------------------------------------------------------------------------------------------------------

(function() {

    //-------------------------------------------------------------
    //                         DEFINITIONS                        |
    //-------------------------------------------------------------
    // A bunch of signatures that might be a subject to change in case of the forum engine update
    const UNREADABLE_MESSAGES_MAP = new Map([
        ["warnings", ".messageNotice--warning"],
        ["moderated", ".messageNotice--moderated"],
        ["deleted", ".messageNotice--deleted"]
    ]);
    const HIGHLIGHT_MAP = new Map([
        ["normal", "messageNotice--highlighted"],
        ["deletedby", "messageNotice--deletedHighlighted"]
    ]);
    const SELECTORS_MAP = new Map([
        ["deletedBy", "Deleted by|Удалил"],
        ["deletedPost", ".message--deleted"],
        ["deletedProfilePost", "div.message.message--simple.js-inlineModContainer .messageNotice--deleted"],
        ["deletedReply", `.message-responseRow .messageNotice--deleted:has(a[data-xf-click~="inserter"])`],
        ["observedPosts", "div.block-body.js-replyNewMessageContainer"],
        ["observedReplies", "div.message-responseRow:has(.messageNotice--deleted)"],
        ["viewComments", "div.message-responseRow.u-jsOnly.js-commentLoader"]
    ]);
    const OBSERVERS_MAP = new Map([
        ["posts", null],
        ["replies", new Array()]
    ]);

    // Counters
    let OBSERVED_POSTS_COUNTER = 0;
    let OBSERVED_REPLIES_COUNTER = 0;


    //-------------------------------------------------------------
    //                          FUNCTIONS                         |
    //-------------------------------------------------------------
    // LOGGING
    //--------------------------------------
    function logObservers() {
        console.log(`Now watching...\n\t\tDeleted posts: ${OBSERVED_POSTS_COUNTER}\n\t\tDeleted replies: ${OBSERVED_REPLIES_COUNTER}`);
    }

    function logNewObserver(node) {
        console.log(`Initiated an observer for <'${node.nodeName}' class='${node.className}'> at '${node.baseURI}'`);
    }

    //--------------------------------------
    // RESTYLING
    //--------------------------------------
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

    // Special treatment for the 'Deleted by' line. Paints it red
    function colorizeDeletedBy(elements, addedClass) {
        const regexDeletedBy = new RegExp(SELECTORS_MAP.get('deletedBy'));

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
            addClassToElements(elementsPair[1], HIGHLIGHT_MAP.get('normal'));
            if (elementsPair[0] == 'deleted') {
                colorizeDeletedBy(elementsPair[1], HIGHLIGHT_MAP.get('deletedby'));
            }
        }
    }

    function restyle() {
        const elementsMap = getUnreadableElementsMap();
        highlightTextMap(elementsMap);
    }

    //--------------------------------------
    // OBSERVERS
    //--------------------------------------
    // Observer function. Executes whenever the content we watch was changed (in this case, a deleted post expanded)
    //   Turns out expanding deleted posts (but not replies) happens in two stages: addition and removal.
    //   Both fire separate events. Only the first one is processed
    function processPostChanges(records, observer) {
        for (const record of records) {
            if (record.type === 'childList' && record.addedNodes.length > 0) {
                for (const addedNode of record.addedNodes) {
                    const newNodes = addedNode.querySelectorAll(UNREADABLE_MESSAGES_MAP.get('deleted'));
                    for (const node of newNodes) {
                        addClassToElements([node], HIGHLIGHT_MAP.get('normal'));
                        colorizeDeletedBy([node], HIGHLIGHT_MAP.get('deletedby'));
                    }

                    // See if there are deleted replies added to the DOM now
                    const deletedReply = addedNode.querySelector(SELECTORS_MAP.get('deletedReply'));
                    if (deletedReply !== null) {
                        const observerOptions = {
                            attributes: false,
                            childList: true,
                            subtree: false,
                        };
                        startRepliesObserver(addedNode, observerOptions);
                    }
                }

                // Consider using dynamic re-evaluation when a deletd post has been expanded. See if it is viable
                //const container = observedNode.querySelector(`${SELECTORS_MAP.get('deletedPost')}, ${SELECTORS_MAP.get('deletedProfilePost')}`);
                OBSERVED_POSTS_COUNTER--;
                if (OBSERVED_POSTS_COUNTER == 0) {
                    const observedNode = record.target;
                    console.log(`Observer stopped for <${observedNode.nodeName} class='${observedNode.className}'> at ${observedNode.baseURI}.`);
                    observer.disconnect();
                }
                logObservers();
            }
        }
    }

    // It is similar to the function above, but the behaviour is different. Keep in mind that each reply has its own observer, unlike posts
    function processReplyChanges(records, observer) {
        for (const record of records) {
            if (record.type === 'childList' && record.addedNodes.length > 0) {
                for (const addedNode of record.addedNodes) {
                    if (addedNode.nodeType != 3) {
                        const newNode = addedNode.querySelector(UNREADABLE_MESSAGES_MAP.get('deleted'));
                        if (newNode !== null) {
                            addClassToElements([newNode], HIGHLIGHT_MAP.get('normal'));
                            colorizeDeletedBy([newNode], HIGHLIGHT_MAP.get('deletedby'));
                        }
                    }
                }

                // record.target is the node being observed
                console.log(`An observer stopped for <${record.target.nodeName} class='${record.target.className}'> at ${record.target.baseURI}.`);
                OBSERVED_REPLIES_COUNTER--;
                if (OBSERVED_REPLIES_COUNTER == 0) {
                    // Closes all of the running reply observers
                    // Just a precaution. Better to miscount the observers and close them prematurely than to let them running indefinitely
                    for (observer of OBSERVERS_MAP.get("replies")) {
                        observer.disconnect();
                    }
                }
                logObservers();
                observer.disconnect();
            }
        }
    }

    function startPostsObserver(element, observerOptions) {
        const container = element.querySelector(`${SELECTORS_MAP.get('observedPosts')}:has(${SELECTORS_MAP.get('deletedPost')}, ${SELECTORS_MAP.get('deletedProfilePost')})`);
        const deletedPosts = element.querySelectorAll(`${SELECTORS_MAP.get('deletedPost')}, ${SELECTORS_MAP.get('deletedProfilePost')}`);
        OBSERVED_POSTS_COUNTER = deletedPosts.length;
        // Start an observer that will detect changes to the DOM (a deleted reply being expanded)
        if (container !== null) {
            OBSERVERS_MAP.set("posts", new MutationObserver(processPostChanges));
            OBSERVERS_MAP.get("posts").observe(container, observerOptions);
            logNewObserver(container);
        }
    }

    function startRepliesObserver(element, observerOptions) {
        const containers = element.querySelectorAll(SELECTORS_MAP.get('observedReplies'));
        const expandableComments = element.querySelectorAll(SELECTORS_MAP.get('viewComments'));
        // Start observers that will detect changes to the DOM (a deleted reply being expanded)
        // Unfortunately, each deleted reply to a post needs its own observer:
        //   They are wrapped inside its own element and don't share an immediate parent
        if (containers.length > 0) {
            for (const container of containers) {
                OBSERVED_REPLIES_COUNTER++;
                OBSERVERS_MAP.get("replies").push(new MutationObserver(processReplyChanges));
                OBSERVERS_MAP.get("replies")[OBSERVED_REPLIES_COUNTER-1].observe(container, observerOptions);
                logNewObserver(container);
            }
        }

        // The `View previous comments` button may also reveal new deleted replies if pressed, so we assign an observer to each of it, too
        if (expandableComments.length > 0) {
            console.log(`Expendable comment blocks: ${expandableComments.length}`);
            for (const node of expandableComments) {
                const commentBlock = node.parentNode;
                OBSERVED_REPLIES_COUNTER++;
                OBSERVERS_MAP.get("replies").push(new MutationObserver(processReplyChanges));
                OBSERVERS_MAP.get("replies")[OBSERVED_REPLIES_COUNTER-1].observe(commentBlock, observerOptions);
                logNewObserver(commentBlock);
            }
        }
    }

    //--------------------------------------
    // MAIN
    //--------------------------------------
    function main() {
        restyle();
        const observerOptions = {
            attributes: false,
            childList: true,
            subtree: false,
        };
        startPostsObserver(document, observerOptions);
        startRepliesObserver(document, observerOptions);
        logObservers();
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
