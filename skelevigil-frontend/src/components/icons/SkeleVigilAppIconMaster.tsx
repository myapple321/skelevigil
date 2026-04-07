/**
 * Preview of raster app icon (assets/icon_master.png).
 * Regenerate: npm run generate:icon-master (from icon-reference-source.png)
 * or: npm run generate:icon-master:vector (from skelevigil-icon-master.svg)
 */
import { Image } from 'react-native';

const SOURCE = require('../../../assets/icon_master.png');

type Props = { size?: number };

export function SkeleVigilAppIconMaster({ size = 1024 }: Props) {
  return (
    <Image
      source={SOURCE}
      style={{ width: size, height: size }}
      resizeMode="cover"
      accessibilityLabel="SkeleVigil app icon"
    />
  );
}
