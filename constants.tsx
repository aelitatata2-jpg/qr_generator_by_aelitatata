
import React from 'react';
import { 
  Link, 
  Type, 
  Mail, 
  Phone, 
  MessageSquare, 
  Wifi, 
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin
} from 'lucide-react';
import { DotType, CornerSquareType, CornerDotType } from './types';

export const DATA_TYPES = [
  { id: 'URL', label: 'URL', icon: <Link size={18} /> },
  { id: 'TEXT', label: 'Text', icon: <Type size={18} /> },
  { id: 'EMAIL', label: 'Email', icon: <Mail size={18} /> },
  { id: 'PHONE', label: 'Phone', icon: <Phone size={18} /> },
  { id: 'SMS', label: 'SMS', icon: <MessageSquare size={18} /> },
  { id: 'WIFI', label: 'WiFi', icon: <Wifi size={18} /> },
];

export const DOT_STYLES: { value: DotType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'extra-rounded', label: 'Extra Rounded' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Rounded' },
];

export const CORNER_SQUARE_STYLES: { value: CornerSquareType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
  { value: 'extra-rounded', label: 'Extra Rounded' },
];

export const CORNER_DOT_STYLES: { value: CornerDotType; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
];

export const SOCIAL_LOGOS = [
  { id: 'facebook', label: 'Facebook', icon: <Facebook />, url: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg' },
  { id: 'twitter', label: 'X / Twitter', icon: <Twitter />, url: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram />, url: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
  { id: 'youtube', label: 'YouTube', icon: <Youtube />, url: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin />, url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png' },
];
