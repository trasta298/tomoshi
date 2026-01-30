import { Variants } from 'framer-motion'

export const spring = {
    soft: {
        type: 'spring',
        stiffness: 100,
        damping: 20
    },
    bouncy: {
        type: 'spring',
        stiffness: 200,
        damping: 20
    },
    stiff: {
        type: 'spring',
        stiffness: 300,
        damping: 30
    }
} as const

export const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 150,
            damping: 25,
            mass: 1
        }
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
}

export const checkmarkVariants: Variants = {
    unchecked: { pathLength: 0, opacity: 0 },
    checked: {
        pathLength: 1,
        opacity: 1,
        transition: {
            duration: 0.3,
            ease: "easeOut"
        }
    }
}

