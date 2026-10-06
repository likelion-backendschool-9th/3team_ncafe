// newtil 유틸리티 `속성:ex` 의 값은 같은 요소 style 의 `--속성-ex` 변수로 준다(@newtil/css README).
// React 의 CSSProperties 는 닫힌 타입이라 사용자 지정 속성(--*)을 받도록 여기서 넓힌다.
import "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
