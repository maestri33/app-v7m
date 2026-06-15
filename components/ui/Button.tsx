import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost";

type CommonProps = {
  variant?: Variant;
  size?: "md" | "xl";
  children: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const sizeMap: Record<NonNullable<CommonProps["size"]>, string> = {
  md: "",
  xl: "btn-xl",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", className = "", children, ...rest } = props as ButtonProps & {
    className?: string;
  };
  const cls = [
    "btn",
    sizeMap[size],
    variant === "ghost" ? "btn-ghost" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in props && props.href !== undefined) {
    return (
      <a className={cls} href={props.href}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
