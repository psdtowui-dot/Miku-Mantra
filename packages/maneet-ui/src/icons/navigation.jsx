'use client';

import React, { forwardRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  Compass,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { IconBase } from './IconBase';

export const ArrowLeftIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ArrowLeft} {...props} />);
export const ArrowRightIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ArrowRight} {...props} />);
export const ArrowUpIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ArrowUp} {...props} />);
export const ArrowDownIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ArrowDown} {...props} />);
export const ArrowUpDownIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ArrowUpDown} {...props} />);
export const ChevronDownIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ChevronDown} {...props} />);
export const ChevronUpIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ChevronUp} {...props} />);
export const ChevronLeftIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ChevronLeft} {...props} />);
export const ChevronRightIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ChevronRight} {...props} />);
export const MenuIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Menu} {...props} />);
export const CloseIcon = forwardRef((props, ref) => <IconBase ref={ref} as={X} {...props} />);
export const HomeIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Home} {...props} />);
export const CompassIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Compass} {...props} />);
export const ExternalLinkIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ExternalLink} {...props} />);
export const SearchIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Search} {...props} />);
export const FilterIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Filter} {...props} />);
