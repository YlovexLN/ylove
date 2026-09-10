import * as React from "react";

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

// ref 用宽松类型：Slot 本身只是把属性和 ref 透传给子元素，
// 各调用方的元素类型不同（button/input/a...），具体类型由外层组件声明
const Slot = React.forwardRef<any, SlotProps>(

  (props, ref) => {
    const { children, ...slotProps } = props;
    const child = React.Children.only(children) as React.ReactElement;

    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...slotProps,
        // @ts-ignore
        ref: ref,
      });
    }
    return null;
  }
);
Slot.displayName = "Slot";

export { Slot };
