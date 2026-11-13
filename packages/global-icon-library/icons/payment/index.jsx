'use client';
import { forwardRef } from 'react';
import { CreditCard as LucideCreditCard, Wallet as LucideWallet, DollarSign as LucideDollarSign, Landmark as LucideLandmark, Building2 as LucideBuilding2, Hash as LucideHash } from 'lucide-react';
import { IconBase } from '../../components/IconBase.jsx';

export const CreditCardIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideCreditCard} {...props} />);
export const CreditCard = CreditCardIcon;
export const WalletIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideWallet} {...props} />);
export const Wallet = WalletIcon;
export const DollarSignIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideDollarSign} {...props} />);
export const DollarSign = DollarSignIcon;
export const LandmarkIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideLandmark} {...props} />);
export const Landmark = LandmarkIcon;
export const Building2Icon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideBuilding2} {...props} />);
export const Building2 = Building2Icon;
export const HashIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LucideHash} {...props} />);
export const Hash = HashIcon;
