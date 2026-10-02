import {SIZES} from './measurements.js';

// Phone dimensions are the body dimensions, not its screen diagonal.
export const EVERYDAY_OBJECTS={
 iphone:{name:'아이폰 16',width:7.16,height:14.76,note:'본체 7.16 × 14.76 cm · Apple 공식 규격',source:'https://support.apple.com/en-euro/121029'},
 toothbrush:{name:'칫솔',width:1.5,height:19,note:'비교용 예시 1.5 × 19 cm · 칫솔마다 크기가 달라요'},
 card:{name:'카드',width:8.56,height:5.398,note:'표준 신용·체크카드 85.60 × 53.98 mm · ISO/IEC 7810 ID-1',source:'https://www.iso.org/standard/31432.html'}
};
export const COMPARISON_SCALE=12;
export function comparisonDimensions(sizeKey,objectKey){
 const sheet=SIZES[sizeKey],object=EVERYDAY_OBJECTS[objectKey];
 if(!sheet||!object)throw new RangeError('Unknown comparison item');
 return {
  sheet:{width:sheet.width*COMPARISON_SCALE,height:sheet.length*COMPARISON_SCALE},
  object:{width:object.width*COMPARISON_SCALE,height:object.height*COMPARISON_SCALE},
  heightPercent:sheet.length/object.height*100
 };
}
