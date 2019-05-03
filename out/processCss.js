"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cssSource_1 = require("./cssSource");
const css = require("css");
const result = css.parse(cssSource_1.source);
const pseduSelectors = [
    /:active/,
    /:hover/,
    /:focus/
];
const formatClassName = (cssClass) => removePseduClass(cssClass).slice(1);
const removePseduClass = (selector) => {
    let modifiedSelector = selector;
    pseduSelectors.forEach(state => {
        const match = selector.match(state);
        const index = match && match.index;
        if (typeof index === 'number') {
            modifiedSelector = selector.slice(0, index);
        }
    });
    return modifiedSelector;
};
const processCSSRule = (r, mediaParent) => {
    const classes = {};
    const { property, value } = r.declarations[0];
    r.selectors.forEach(sel => {
        classes[formatClassName(sel)] = {
            property,
            value,
            mediaParent
        };
    });
    return classes;
};
const processMediaRule = (r) => {
    const mediaQuery = r.media;
    return r.rules.reduce((acc, rule) => {
        return Object.assign({}, acc, processCSSRule(rule, mediaQuery));
    }, {});
};
exports.processCss = (cssSource) => {
    const cssAst = css.parse(cssSource);
    const recessStylesClasses = result.stylesheet.rules.filter(rule => rule.type === 'media' ||
        (rule.type === 'rule' && rule.selectors[0].charAt(0) === '.') && rule.declarations.length === 1);
    return recessStylesClasses
        .reduce((acc, rule) => {
        switch (rule.type) {
            case ('rule'): {
                return Object.assign({}, acc, processCSSRule(rule));
                break;
            }
            case ('media'): {
                return Object.assign({}, acc, processMediaRule(rule));
                break;
            }
            default: {
                return acc;
            }
        }
    }, {});
};
//# sourceMappingURL=processCss.js.map