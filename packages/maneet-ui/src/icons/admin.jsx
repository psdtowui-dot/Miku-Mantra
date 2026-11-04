'use client';

import React, { forwardRef } from 'react';
import {
  LayoutDashboard,
  Users,
  User,
  UserCheck,
  UserX,
  BarChart3,
  Settings,
  Settings2,
  KeyRound,
  FileText,
  Printer,
  UploadCloud,
  RefreshCw,
  Trash2,
  Edit3,
  Edit2,
  Plus,
  Minus,
  Layers,
  SlidersHorizontal,
  Mail,
  Send,
  MoreHorizontal,
  Copy,
  Download,
  Phone,
  MapPin,
} from 'lucide-react';
import { IconBase } from './IconBase';

export const DashboardIcon = forwardRef((props, ref) => <IconBase ref={ref} as={LayoutDashboard} {...props} />);
export const UsersIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Users} {...props} />);
export const UserIcon = forwardRef((props, ref) => <IconBase ref={ref} as={User} {...props} />);
export const UserCheckIcon = forwardRef((props, ref) => <IconBase ref={ref} as={UserCheck} {...props} />);
export const UserXIcon = forwardRef((props, ref) => <IconBase ref={ref} as={UserX} {...props} />);
export const BarChartIcon = forwardRef((props, ref) => <IconBase ref={ref} as={BarChart3} {...props} />);
export const SettingsIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Settings} {...props} />);
export const Settings2Icon = forwardRef((props, ref) => <IconBase ref={ref} as={Settings2} {...props} />);
export const KeyIcon = forwardRef((props, ref) => <IconBase ref={ref} as={KeyRound} {...props} />);
export const FileTextIcon = forwardRef((props, ref) => <IconBase ref={ref} as={FileText} {...props} />);
export const PrinterIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Printer} {...props} />);
export const UploadCloudIcon = forwardRef((props, ref) => <IconBase ref={ref} as={UploadCloud} {...props} />);
export const RefreshIcon = forwardRef((props, ref) => <IconBase ref={ref} as={RefreshCw} {...props} />);
export const TrashIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Trash2} {...props} />);
export const EditIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Edit3} {...props} />);
export const Edit2Icon = forwardRef((props, ref) => <IconBase ref={ref} as={Edit2} {...props} />);
export const PlusIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Plus} {...props} />);
export const MinusIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Minus} {...props} />);
export const LayersIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Layers} {...props} />);
export const SlidersIcon = forwardRef((props, ref) => <IconBase ref={ref} as={SlidersHorizontal} {...props} />);
export const MailIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Mail} {...props} />);
export const SendIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Send} {...props} />);
export const MoreHorizontalIcon = forwardRef((props, ref) => <IconBase ref={ref} as={MoreHorizontal} {...props} />);
export const CopyIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Copy} {...props} />);
export const DownloadIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Download} {...props} />);
export const PhoneIcon = forwardRef((props, ref) => <IconBase ref={ref} as={Phone} {...props} />);
export const MapPinIcon = forwardRef((props, ref) => <IconBase ref={ref} as={MapPin} {...props} />);
