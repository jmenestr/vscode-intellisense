import {source} from './cssSource';
import * as css from 'css';

const result = css.parse(source);
const pseduSelectors = [
  /:active/,
  /:hover/,
  /:focus/
];

export interface Classes {
  [className: string]: {
    property: string
    value: string
    color?: string
    mediaParent?: string
  };
}

const formatClassName = (cssClass: string) => removePseduClass(cssClass).slice(1)

const removePseduClass = (selector: string) => {
  let modifiedSelector = selector;
  pseduSelectors.forEach(state => {
    const match = selector.match(state)
    const index = match && match.index;
    if (typeof index === 'number') {
      modifiedSelector = selector.slice(0, index)
    }
  });
  return modifiedSelector;
};

const processCSSRule = (r: css.Rule, mediaParent?: string) => {
  const classes = {} as Classes;
  const { property, value } = r.declarations[0] as css.Declaration;

  r.selectors.forEach(sel => {
    classes[formatClassName(sel)] = {
      property,
      value,
      mediaParent
    };
  });
  return classes;
};

const processMediaRule = (r: css.Media) => {
  const mediaQuery = r.media;
  return r.rules.reduce((acc, rule: css.Rule) => {
    return { ...acc, ...processCSSRule(rule, mediaQuery) }
  }, {} as Classes)
};

const recessStylesClasses = result.stylesheet.rules.filter(rule =>
  rule.type === 'media' ||
  (rule.type === 'rule' && (rule as css.Rule).selectors[0].charAt(0) === '.') && (rule as css.Rule).declarations.length === 1
);

export const classNames = recessStylesClasses
    .reduce((acc, rule: css.Rule | css.Media) => {
      switch (rule.type) {
        case ('rule'): {
          return { ...acc, ...processCSSRule(rule) };
          break;
        }
        case ('media'): {
          return { ...acc, ...processMediaRule(rule) };
          break;
        } 
        default: {
          return acc;
        }
    }
  }, {} as Classes);
  // console.log(Object.keys(classNames).join(''))

