'use client';

import React, { forwardRef } from 'react';
import {
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Share2,
} from 'lucide-react';
import { IconBase } from './IconBase';

export const InstagramIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Instagram} {...props} />);
export const FacebookIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Facebook} {...props} />);
export const TwitterIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Twitter} {...props} />);
export const LinkedinIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Linkedin} {...props} />);
export const YoutubeIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Youtube} {...props} />);
export const ShareIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Share2} {...props} />);
