import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	variant?: "primary" | "secondary" | "outline";
}

export function Button({ children, variant = "primary", style, ...props }: ButtonProps) {
	const baseStyle: React.CSSProperties = {
		padding: "0.5rem 1rem",
		borderRadius: "0.375rem",
		fontWeight: 500,
		cursor: "pointer",
		border: "1px solid transparent",
	};

	const variants: Record<string, React.CSSProperties> = {
		primary: {
			backgroundColor: "#3b82f6",
			color: "white",
		},
		secondary: {
			backgroundColor: "#6b7280",
			color: "white",
		},
		outline: {
			backgroundColor: "transparent",
			borderColor: "#3b82f6",
			color: "#3b82f6",
		},
	};

	return (
		<button style={{ ...baseStyle, ...variants[variant], ...style }} {...props}>
			{children}
		</button>
	);
}
