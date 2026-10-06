// newtil-css JIT — app/ 아래에서 쓰인 유틸리티 클래스(속성:값, 속성:ex)만 골라 globals.css 의 @import "@newtil/css" 자리에 넣는다.
module.exports = {
  plugins: {
    "@newtil/css/jit/postcss-plugin": {
      content: ["./app"],
    },
  },
};
