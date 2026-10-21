import React from 'react';
import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				'bg-white relative w-full rounded-3xl',
				'p-1.5 shadow-sm border border-black/5 transition-all hover:shadow-md h-full flex flex-col',
				className,
			)}
			{...props}
		/>
	);
}

function Header({
	className,
	children,
	glassEffect = false, // Changed default to false for a cleaner white/light theme
	...props
}: React.ComponentProps<'div'> & {
	glassEffect?: boolean;
}) {
	return (
		<div
			className={cn(
				'bg-gray-50/50 relative mb-4 rounded-2xl border border-black/5 p-4',
				className,
			)}
			{...props}
		>
			{/* Subtle glass gradient for light theme */}
			{glassEffect && (
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 h-48 rounded-[inherit]"
					style={{
						background:
							'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 40%, rgba(0,0,0,0) 100%)',
					}}
				/>
			)}
			<div className="relative z-10">{children}</div>
		</div>
	);
}

function Plan({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn('mb-6 flex items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

function Description({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p className={cn('text-black/40 text-[10px] uppercase font-bold tracking-widest', className)} {...props} />
	);
}

function PlanName({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			className={cn(
				"text-black/60 flex items-center gap-2 text-sm font-medium [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function Badge({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				'bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
				className,
			)}
			{...props}
		/>
	);
}

function Price({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div className={cn('mb-3 flex items-baseline gap-1', className)} {...props} />
	);
}

function MainPrice({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn('text-2xl font-semibold tracking-tight text-black', className)} // Changed to 2xl for tabular fit
			{...props}
		/>
	);
}

function Period({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn('text-black/40 text-xs font-medium', className)}
			{...props}
		/>
	);
}

function OriginalPrice({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			className={cn(
				'text-black/20 mr-1 ml-auto text-sm line-through decoration-black/10',
				className,
			)}
			{...props}
		/>
	);
}

function Body({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('space-y-4 p-3 flex-1 flex flex-col', className)} {...props} />;
}

function List({ className, ...props }: React.ComponentProps<'ul'>) {
	return <ul className={cn('space-y-2 text-sm', className)} {...props} />;
}

function ListItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			className={cn(
				'text-black/60 flex items-center justify-between gap-3 text-xs border-b border-black/[0.03] pb-2 last:border-0',
				className,
			)}
			{...props}
		/>
	);
}

function Separator({
	children = 'Product Details',
	className,
	...props
}: React.ComponentProps<'div'> & {
	children?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'text-black/40 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest my-4',
				className,
			)}
			{...props}
		>
			<span className="bg-black/[0.05] h-[1px] flex-1" />
			<span className="shrink-0">{children}</span>
			<span className="bg-black/[0.05] h-[1px] flex-1" />
		</div>
	);
}

export {
	Card,
	Header,
	Description,
	Plan,
	PlanName,
	Badge,
	Price,
	MainPrice,
	Period,
	OriginalPrice,
	Body,
	List,
	ListItem,
	Separator,
};
