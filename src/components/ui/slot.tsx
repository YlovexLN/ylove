import * as React from "react";

interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

const Slot = React.forwardRef<HTMLElement, SlotProps>(

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
