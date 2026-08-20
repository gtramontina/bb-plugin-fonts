import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet";
  size?: "default" | "small";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "secondary", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={`fonts-button fonts-button--${variant} fonts-button--${size} ${className}`}
      {...props}
    />
  ),
);
Button.displayName = "Button";
