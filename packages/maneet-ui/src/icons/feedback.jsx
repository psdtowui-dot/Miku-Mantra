'use client';

import React, { forwardRef } from 'react';
import {
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Star,
  Heart,
  Eye,
  EyeOff,
  Loader2,
  Clock,
} from 'lucide-react';
import { IconBase } from './IconBase';

export const CheckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Check} {...props} />);
export const CheckCircleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={CheckCircle2} {...props} />);
export const AlertCircleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={AlertCircle} {...props} />);
export const AlertTriangleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={AlertTriangle} {...props} />);
export const InfoIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Info} {...props} />);
export const HelpCircleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={HelpCircle} {...props} />);
export const XCircleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={XCircle} {...props} />);
export const ShieldCheckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ShieldCheck} {...props} />);
export const ShieldAlertIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ShieldAlert} {...props} />);
export const LockIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Lock} {...props} />);
export const StarIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Star} {...props} />);
export const HeartIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Heart} {...props} />);
export const EyeIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Eye} {...props} />);
export const EyeOffIcon = forwardRef((props, ref) => <IconBase ref={ref} as={EyeOff} {...props} />);
export const LoaderIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Loader2} {...props} />);
export const ClockIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Clock} {...props} />);
