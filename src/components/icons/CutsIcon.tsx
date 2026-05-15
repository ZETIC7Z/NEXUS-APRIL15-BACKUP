"use client";

import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Variants, motion, useAnimation } from "framer-motion";
import classNames from "classnames";

const VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "4px",
    originY: "20px",
  },
  animate: {
    rotate: [-10, -10, 0],
    transition: {
      duration: 0.8,
      times: [0, 0.5, 1],
      ease: "easeInOut",
    },
  },
};

const CLAP_VARIANTS: Variants = {
  normal: {
    rotate: 0,
    originX: "3px",
    originY: "11px",
  },
  animate: {
    rotate: [0, -10, 16, 0],
    transition: {
      duration: 0.4,
      times: [0, 0.3, 0.6, 1],
      ease: "easeInOut",
    },
  },
};

export interface CutsIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface CutsIconProps extends React.SVGAttributes<SVGSVGElement> {
  size?: string | number;
}

const CutsIcon = forwardRef<CutsIconHandle, CutsIconProps>(
  ({ size = "1em", className, ...props }, ref) => {
    const controls = useAnimation();
    const isAnimating = useRef(false);

    const startAnimation = useCallback(async () => {
      if (isAnimating.current) return;
      isAnimating.current = true;
      await controls.start("animate");
      isAnimating.current = false;
    }, [controls]);

    const stopAnimation = useCallback(() => {
      controls.stop();
      isAnimating.current = false;
    }, [controls]);

    useImperativeHandle(ref, () => ({
      startAnimation,
      stopAnimation,
    }));

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={classNames("cursor-pointer select-none", className)}
        onMouseEnter={startAnimation}
        {...props}
      >
        <motion.path
          d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z"
          variants={CLAP_VARIANTS}
          animate={controls}
          initial="normal"
        />
        <motion.path
          d="m6.2 5.3 3.1 3.9"
          variants={CLAP_VARIANTS}
          animate={controls}
          initial="normal"
        />
        <motion.path
          d="m12.4 3.4 3.1 4"
          variants={CLAP_VARIANTS}
          animate={controls}
          initial="normal"
        />
        <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
        <path d="m3.3 15.7 1.2-1.2" />
        <path d="m16.1 14.7 1.2-1.2" />
        <path d="M6.8 14.8c.3.4.3.8-.2 1.2l-2.8 2.2" />
        <path d="M11.3 15.5c.3.3.2.7-.3 1.1l-2.2 1.4" />
        <path d="M16 15.5c.3.3.2.7-.3 1.1l-2.2 1.4" />
      </svg>
    );
  }
);

CutsIcon.displayName = "CutsIcon";

export { CutsIcon };
