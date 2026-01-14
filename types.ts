
export type DotType = 'dots' | 'rounded' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type CornerDotType = 'dot' | 'square';
export type CornerSquareType = 'dot' | 'square' | 'extra-rounded';

export interface QRConfig {
  data: string;
  width: number;
  height: number;
  margin: number;
  dotsOptions: {
    color: string;
    type: DotType;
    gradient?: {
      type: 'linear' | 'radial';
      rotation: number;
      colorStops: Array<{ offset: number; color: string }>;
    };
  };
  backgroundOptions: {
    color: string;
  };
  imageOptions: {
    hideBackgroundDots: boolean;
    imageSize: number;
    margin: number;
    crossOrigin: string;
    backgroundOptions?: {
      color: string;
    };
    imageBackground?: string; // Critical for transparency
  };
  cornersSquareOptions: {
    color: string;
    type: CornerSquareType;
  };
  cornersDotOptions: {
    color: string;
    type: CornerDotType;
  };
  image?: string;
}

export enum QRDataType {
  URL = 'URL',
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  SMS = 'SMS',
  WIFI = 'WIFI',
}
