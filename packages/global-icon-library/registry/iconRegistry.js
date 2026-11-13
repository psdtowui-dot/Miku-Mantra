'use client';

import * as NavIcons from '../icons/navigation/index.jsx';
import * as EcomIcons from '../icons/ecommerce/index.jsx';
import * as PayIcons from '../icons/payment/index.jsx';
import * as AccIcons from '../icons/account/index.jsx';
import * as AdmIcons from '../icons/admin/index.jsx';
import * as SocIcons from '../icons/social/index.jsx';
import * as StatIcons from '../icons/status/index.jsx';
import * as ActIcons from '../icons/actions/index.jsx';
import * as CustIcons from '../icons/custom/index.jsx';

/**
 * Registry metadata dictionary
 */
export const iconRegistry = {
  // Navigation
  'arrow-left': NavIcons.ArrowLeftIcon,
  'arrow-right': NavIcons.ArrowRightIcon,
  'arrow-up': NavIcons.ArrowUpIcon,
  'arrow-down': NavIcons.ArrowDownIcon,
  'arrow-up-down': NavIcons.ArrowUpDownIcon,
  'arrow-up-right': NavIcons.ArrowUpRightIcon,
  'arrow-down-right': NavIcons.ArrowDownRightIcon,
  'chevron-down': NavIcons.ChevronDownIcon,
  'chevron-up': NavIcons.ChevronUpIcon,
  'chevron-left': NavIcons.ChevronLeftIcon,
  'chevron-right': NavIcons.ChevronRightIcon,
  'menu': NavIcons.MenuIcon,
  'x': NavIcons.XIcon,
  'close': NavIcons.XIcon,
  'cross': NavIcons.XIcon,
  'home': NavIcons.HomeIcon,
  'compass': NavIcons.CompassIcon,
  'external-link': NavIcons.ExternalLinkIcon,
  'corner-down-right': NavIcons.CornerDownRightIcon,
  'move': NavIcons.MoveIcon,
  'link': NavIcons.LinkIcon,

  // E-commerce
  'shopping-bag': EcomIcons.ShoppingBagIcon,
  'shopping-cart': EcomIcons.ShoppingCartIcon,
  'cart': EcomIcons.ShoppingCartIcon,
  'tag': EcomIcons.TagIcon,
  'percent': EcomIcons.PercentIcon,
  'truck': EcomIcons.TruckIcon,
  'delivery': EcomIcons.TruckIcon,
  'package': EcomIcons.PackageIcon,
  'package-check': EcomIcons.PackageCheckIcon,
  'award': EcomIcons.AwardIcon,
  'gem': EcomIcons.GemIcon,
  'gift': EcomIcons.GiftIcon,
  'store': EcomIcons.StoreIcon,
  'receipt-text': EcomIcons.ReceiptTextIcon,
  'receipt': EcomIcons.ReceiptTextIcon,
  'scale': EcomIcons.ScaleIcon,
  'scissors': EcomIcons.ScissorsIcon,
  'flame': EcomIcons.FlameIcon,
  'sparkles': EcomIcons.SparklesIcon,
  'ticket': EcomIcons.TicketIcon,
  'coupon': EcomIcons.TicketIcon,
  'git-compare': EcomIcons.GitCompareIcon,
  'compare': EcomIcons.GitCompareIcon,
  'heart-handshake': EcomIcons.HeartHandshakeIcon,
  'loyalty': EcomIcons.HeartHandshakeIcon,
  'trending-up': EcomIcons.TrendingUpIcon,

  // Payment
  'credit-card': PayIcons.CreditCardIcon,
  'wallet': PayIcons.WalletIcon,
  'dollar-sign': PayIcons.DollarSignIcon,
  'landmark': PayIcons.LandmarkIcon,
  'bank': PayIcons.LandmarkIcon,
  'building-2': PayIcons.Building2Icon,
  'hash': PayIcons.HashIcon,

  // Account
  'user': AccIcons.UserIcon,
  'user-check': AccIcons.UserCheckIcon,
  'user-x': AccIcons.UserXIcon,
  'users': AccIcons.UsersIcon,
  'key-round': AccIcons.KeyRoundIcon,
  'key': AccIcons.KeyRoundIcon,
  'lock': AccIcons.LockIcon,
  'shield': AccIcons.ShieldIcon,
  'shield-check': AccIcons.ShieldCheckIcon,
  'shield-alert': AccIcons.ShieldAlertIcon,
  'map-pin': AccIcons.MapPinIcon,
  'phone': AccIcons.PhoneIcon,
  'mail': AccIcons.MailIcon,
  'history': AccIcons.HistoryIcon,
  'calendar': AccIcons.CalendarIcon,

  // Admin
  'layout-dashboard': AdmIcons.LayoutDashboardIcon,
  'dashboard': AdmIcons.LayoutDashboardIcon,
  'bar-chart-3': AdmIcons.BarChart3Icon,
  'bar-chart': AdmIcons.BarChart3Icon,
  'columns': AdmIcons.ColumnsIcon,
  'monitor': AdmIcons.MonitorIcon,
  'tablet': AdmIcons.TabletIcon,
  'smartphone': AdmIcons.SmartphoneIcon,
  'panel-left': AdmIcons.PanelLeftIcon,
  'folder-tree': AdmIcons.FolderTreeIcon,
  'palette': AdmIcons.PaletteIcon,
  'type': AdmIcons.TypeIcon,
  'file-code': AdmIcons.FileCodeIcon,
  'code-2': AdmIcons.Code2Icon,
  'settings': AdmIcons.SettingsIcon,
  'settings-2': AdmIcons.Settings2Icon,
  'sliders': AdmIcons.SlidersIcon,
  'sliders-horizontal': AdmIcons.SlidersHorizontalIcon,
  'layers': AdmIcons.LayersIcon,
  'layout': AdmIcons.LayoutIcon,

  // Social
  'instagram': SocIcons.InstagramIcon,
  'facebook': SocIcons.FacebookIcon,
  'twitter': SocIcons.TwitterIcon,
  'linkedin': SocIcons.LinkedinIcon,
  'youtube': SocIcons.YoutubeIcon,
  'share-2': SocIcons.Share2Icon,
  'share': SocIcons.Share2Icon,
  'globe': SocIcons.GlobeIcon,
  'message-square': SocIcons.MessageSquareIcon,
  'message-circle': SocIcons.MessageCircleIcon,
  'chat': SocIcons.MessageCircleIcon,
  'megaphone': SocIcons.MegaphoneIcon,

  // Status
  'check': StatIcons.CheckIcon,
  'check-circle-2': StatIcons.CheckCircle2Icon,
  'check-circle': StatIcons.CheckCircle2Icon,
  'check-square': StatIcons.CheckSquareIcon,
  'alert-circle': StatIcons.AlertCircleIcon,
  'alert-triangle': StatIcons.AlertTriangleIcon,
  'warning': StatIcons.AlertTriangleIcon,
  'info': StatIcons.InfoIcon,
  'help-circle': StatIcons.HelpCircleIcon,
  'help': StatIcons.HelpCircleIcon,
  'x-circle': StatIcons.XCircleIcon,
  'clock': StatIcons.ClockIcon,
  'ban': StatIcons.BanIcon,
  'badge-check': StatIcons.BadgeCheckIcon,
  'bell-ring': StatIcons.BellRingIcon,
  'bell': StatIcons.BellRingIcon,
  'bookmark-check': StatIcons.BookmarkCheckIcon,
  'crown': StatIcons.CrownIcon,
  'star': StatIcons.StarIcon,
  'heart': StatIcons.HeartIcon,

  // Actions
  'plus': ActIcons.PlusIcon,
  'minus': ActIcons.MinusIcon,
  'trash': ActIcons.TrashIcon,
  'trash-2': ActIcons.Trash2Icon,
  'delete': ActIcons.Trash2Icon,
  'edit-2': ActIcons.Edit2Icon,
  'edit-3': ActIcons.Edit3Icon,
  'edit': ActIcons.Edit3Icon,
  'pencil': ActIcons.PencilIcon,
  'download': ActIcons.DownloadIcon,
  'upload': ActIcons.UploadIcon,
  'upload-cloud': ActIcons.UploadCloudIcon,
  'refresh-cw': ActIcons.RefreshCwIcon,
  'refresh': ActIcons.RefreshCwIcon,
  'rotate-ccw': ActIcons.RotateCcwIcon,
  'printer': ActIcons.PrinterIcon,
  'print': ActIcons.PrinterIcon,
  'copy': ActIcons.CopyIcon,
  'save': ActIcons.SaveIcon,
  'search': ActIcons.SearchIcon,
  'filter': ActIcons.FilterIcon,
  'eye': ActIcons.EyeIcon,
  'eye-off': ActIcons.EyeOffIcon,
  'zoom-in': ActIcons.ZoomInIcon,
  'zoom-out': ActIcons.ZoomOutIcon,
  'maximize-2': ActIcons.Maximize2Icon,
  'grip-vertical': ActIcons.GripVerticalIcon,
  'send': ActIcons.SendIcon,
  'reply': ActIcons.ReplyIcon,
  'power': ActIcons.PowerIcon,
  'log-out': ActIcons.LogOutIcon,
  'logout': ActIcons.LogOutIcon,
  'loader-2': ActIcons.Loader2Icon,
  'spinner': ActIcons.Loader2Icon,
  'loading': ActIcons.Loader2Icon,
  'more-horizontal': ActIcons.MoreHorizontalIcon,
  'more': ActIcons.MoreHorizontalIcon,
  'hammer': ActIcons.HammerIcon,
  'zap': ActIcons.ZapIcon,
  'square': ActIcons.SquareIcon,
  'circle': ActIcons.CircleIcon,
  'radio': ActIcons.RadioIcon,
  'scroll-text': ActIcons.ScrollTextIcon,
  'image': ActIcons.ImageIcon,
  'camera': ActIcons.CameraIcon,
  'crosshair': ActIcons.CrosshairIcon,
  'file-text': ActIcons.FileTextIcon,

  // Custom
  'google': CustIcons.GoogleIcon,
  'verified': CustIcons.VerifiedBadgeIcon,
  'verified-badge': CustIcons.VerifiedBadgeIcon,
  'barcode': CustIcons.BarcodeIcon,
  'rupee': CustIcons.IndianRupeeIcon,
  'indian-rupee': CustIcons.IndianRupeeIcon,
};

// Also index PascalCase variants dynamically
for (const [k, comp] of Object.entries(iconRegistry)) {
  const pascal = k.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  if (!iconRegistry[pascal]) {
    iconRegistry[pascal] = comp;
  }
}

/**
 * Resolve icon component by name (case-insensitive & alias-aware)
 */
export function getIconComponent(name) {
  if (!name) return null;
  const normalized = String(name).trim().toLowerCase();
  
  // Exact match
  if (iconRegistry[normalized]) return iconRegistry[normalized];
  
  // Kebab case conversion
  const kebab = normalized.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  if (iconRegistry[kebab]) return iconRegistry[kebab];

  return null;
}

/**
 * Return array of canonical icon names
 */
export function getAvailableIconNames() {
  return Object.keys(iconRegistry).filter(k => k.includes('-') || !/[A-Z]/.test(k));
}

/**
 * Returns grouped icons by functional category
 */
export function getIconsByCategory() {
  return {
    navigation: Object.entries(NavIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    ecommerce: Object.entries(EcomIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    payment: Object.entries(PayIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    account: Object.entries(AccIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    admin: Object.entries(AdmIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    social: Object.entries(SocIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    status: Object.entries(StatIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    actions: Object.entries(ActIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
    custom: Object.entries(CustIcons).map(([k, c]) => ({ name: k.replace(/Icon$/, ''), component: c })),
  };
}

/**
 * Dynamically register a new custom icon
 */
export function registerIcon(name, component) {
  if (name && component) {
    iconRegistry[name.toLowerCase()] = component;
  }
}
