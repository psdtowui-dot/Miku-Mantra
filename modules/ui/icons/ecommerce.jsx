'use client';

import React, { forwardRef } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Tag,
  Percent,
  Truck,
  CreditCard,
  Wallet,
  Ticket,
  Package,
  PackageCheck,
  Award,
  Gem,
  Gift,
  ReceiptText,
  RotateCcw,
  Building2,
  Scale,
  Sparkles,
  Flame,
  BookmarkCheck,
} from 'lucide-react';
import { IconBase } from './IconBase';

export const ShoppingBagIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ShoppingBag} {...props} />);
export const ShoppingCartIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ShoppingCart} {...props} />);
export const TagIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Tag} {...props} />);
export const PercentIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Percent} {...props} />);
export const TruckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Truck} {...props} />);
export const CreditCardIcon = forwardRef((props, ref) => <IconBase ref={ref} as={CreditCard} {...props} />);
export const WalletIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Wallet} {...props} />);
export const TicketIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Ticket} {...props} />);
export const PackageIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Package} {...props} />);
export const PackageCheckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={PackageCheck} {...props} />);
export const AwardIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Award} {...props} />);
export const GemIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Gem} {...props} />);
export const GiftIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Gift} {...props} />);
export const ReceiptTextIcon = forwardRef((props, ref) => <IconBase ref={ref} as={ReceiptText} {...props} />);
export const ReturnIcon = forwardRef((props, ref) => <IconBase ref={ref} as={RotateCcw} {...props} />);
export const BankIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Building2} {...props} />);
export const ScaleIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Scale} {...props} />);
export const SparklesIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Sparkles} {...props} />);
export const FlameIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Flame} {...props} />);
export const BookmarkCheckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={BookmarkCheck} {...props} />);
